#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const { Client: MinioClient } = require("minio");
const dotenv = require("dotenv");

const repoRoot = path.resolve(__dirname, "../..");
dotenv.config({ path: path.join(repoRoot, ".env") });

const shouldPurgeBucket = process.argv.includes("--purge");

/** Docker service names (mysql, minio) only resolve inside the compose network. */
function resolveHostForHostMachine(host) {
  const normalized = (host || "localhost").trim();
  if (normalized === "minio" || normalized === "mysql") {
    return "127.0.0.1";
  }
  return normalized;
}

function resolveDbPort(rawHost, rawPort) {
  const host = (rawHost || "localhost").trim();
  if (host === "mysql" && process.env.MYSQL_PORT) {
    return Number(process.env.MYSQL_PORT);
  }
  return Number(rawPort || 3306);
}

const rawDbHost = process.env.DB_HOST || "localhost";
const rawMinioHost = process.env.MINIO_ENDPOINT || "localhost";

const config = {
  dbHost: resolveHostForHostMachine(rawDbHost),
  dbPort: resolveDbPort(rawDbHost, process.env.DB_PORT),
  dbName: process.env.DB_NAME || "boxmag4",
  dbUser: process.env.DB_USER || "boxmag4",
  dbPassword: process.env.DB_PASSWORD || "change-me-user",
  minioEndpoint: resolveHostForHostMachine(rawMinioHost),
  minioPort: Number(process.env.MINIO_PORT_API || 9000),
  minioUseSSL: process.env.MINIO_USE_SSL === "true",
  minioAccessKey: process.env.MINIO_ROOT_USER || "boxmagadmin",
  minioSecretKey:
    process.env.MINIO_ROOT_PASSWORD || "change-me-minio-password",
  minioBucketName: process.env.MINIO_BUCKET_NAME || "boxmag4-images",
  minioPublicBaseUrl:
    process.env.MINIO_PUBLIC_BASE_URL ||
    `http://localhost:${Number(process.env.MINIO_PORT_API || 9000)}`,
};

const IMAGE_SEARCH_DIRS = [
  path.join(repoRoot, "boxmag4", "public", "b2b", "boxes"),
  path.join(repoRoot, "boxmag4", "public", "ecommerce"),
  path.join(repoRoot, "boxmag-backend", "uploads", "boxes"),
];

function buildPublicReadPolicy(bucketName) {
  return JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { AWS: ["*"] },
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${bucketName}/*`],
      },
    ],
  });
}

async function ensureBucket(minioClient, bucketName) {
  const exists = await minioClient.bucketExists(bucketName);
  if (!exists) {
    await minioClient.makeBucket(bucketName);
  }
  await minioClient.setBucketPolicy(bucketName, buildPublicReadPolicy(bucketName));
}

async function listAllObjectNames(minioClient, bucketName) {
  return new Promise((resolve, reject) => {
    const names = [];
    const stream = minioClient.listObjectsV2(bucketName, "", true);

    stream.on("data", (obj) => names.push(obj.name));
    stream.on("error", reject);
    stream.on("end", () => resolve(names));
  });
}

async function purgeBucket(minioClient, bucketName) {
  const names = await listAllObjectNames(minioClient, bucketName);
  if (names.length === 0) {
    console.log(`Bucket "${bucketName}" is already empty.`);
    return;
  }

  const batchSize = 1000;
  for (let i = 0; i < names.length; i += batchSize) {
    await minioClient.removeObjects(bucketName, names.slice(i, i + batchSize));
  }

  console.log(`Removed ${names.length} object(s) from bucket "${bucketName}".`);
}

function resolveLocalImagePath(fileName) {
  for (const dirPath of IMAGE_SEARCH_DIRS) {
    const candidate = path.join(dirPath, fileName);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function toObjectName(fileName) {
  return `boxes/${fileName}`;
}

function toPublicUrl(objectName) {
  const base = config.minioPublicBaseUrl.replace(/\/+$/, "");
  return `${base}/${config.minioBucketName}/${objectName}`;
}

async function main() {
  const minioClient = new MinioClient({
    endPoint: config.minioEndpoint,
    port: config.minioPort,
    useSSL: config.minioUseSSL,
    accessKey: config.minioAccessKey,
    secretKey: config.minioSecretKey,
  });

  await ensureBucket(minioClient, config.minioBucketName);

  if (shouldPurgeBucket) {
    await purgeBucket(minioClient, config.minioBucketName);
  }

  const connection = await mysql.createConnection({
    host: config.dbHost,
    port: config.dbPort,
    database: config.dbName,
    user: config.dbUser,
    password: config.dbPassword,
  });

  try {
    const [rows] = await connection.query(
      "SELECT id, url FROM box_type_images ORDER BY box_type_id ASC, sort_order ASC, id ASC",
    );

    let uploadedCount = 0;
    let updatedCount = 0;
    let missingCount = 0;

    for (const row of rows) {
      const currentPath = String(row.url || "").trim();
      const id = Number(row.id);
      const fileName = currentPath.split("/").pop();

      if (!fileName) continue;

      // After a full reset the bucket was purged; re-upload even existing MinIO URLs.
      if (
        !shouldPurgeBucket &&
        currentPath.startsWith(`${config.minioPublicBaseUrl.replace(/\/+$/, "")}/`)
      ) {
        continue;
      }

      const localFilePath = resolveLocalImagePath(fileName);
      if (!localFilePath) {
        missingCount += 1;
        console.warn(`Missing local image for box_type id=${id}: ${fileName}`);
        continue;
      }

      const objectName = toObjectName(fileName);
      const extension = path.extname(fileName).toLowerCase();
      const contentType =
        extension === ".jpg" || extension === ".jpeg"
          ? "image/jpeg"
          : extension === ".webp"
            ? "image/webp"
            : "image/png";

      await minioClient.fPutObject(config.minioBucketName, objectName, localFilePath, {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      });
      uploadedCount += 1;

      const publicUrl = toPublicUrl(objectName);
      await connection.execute("UPDATE box_type_images SET url = ? WHERE id = ?", [
        publicUrl,
        id,
      ]);
      updatedCount += 1;
    }

    console.log(
      `Seed MinIO complete: uploaded=${uploadedCount}, updated=${updatedCount}, missing=${missingCount}`,
    );
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Failed to seed MinIO images", error);
  process.exit(1);
});
