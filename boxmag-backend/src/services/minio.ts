import { Client as MinioClient } from "minio";
import { env } from "../config/env";

const minioClient = new MinioClient({
  endPoint: env.minioEndpoint,
  port: env.minioPort,
  useSSL: env.minioUseSSL,
  accessKey: env.minioAccessKey,
  secretKey: env.minioSecretKey,
});

let ensureBucketPromise: Promise<void> | null = null;

function buildPublicReadPolicy(bucketName: string): string {
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

async function ensurePublicBucket(): Promise<void> {
  if (!ensureBucketPromise) {
    ensureBucketPromise = (async () => {
      const bucketName = env.minioBucketName;
      const exists = await minioClient.bucketExists(bucketName);
      if (!exists) {
        await minioClient.makeBucket(bucketName);
      }
      await minioClient.setBucketPolicy(
        bucketName,
        buildPublicReadPolicy(bucketName),
      );
    })().catch((error) => {
      ensureBucketPromise = null;
      throw error;
    });
  }
  await ensureBucketPromise;
}

function sanitizeObjectName(fileName: string): string {
  const trimmed = fileName.trim();
  const dotIndex = trimmed.lastIndexOf(".");
  const extension = dotIndex > 0 ? trimmed.slice(dotIndex).toLowerCase() : "";
  const baseName = (dotIndex > 0 ? trimmed.slice(0, dotIndex) : trimmed)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const safeBaseName = baseName || "box-image";
  return `boxes/${safeBaseName}-${Date.now()}${extension || ".png"}`;
}

export async function uploadBoxImageToMinio(args: {
  fileBuffer: Buffer;
  originalFileName: string;
  mimeType: string;
}): Promise<string> {
  await ensurePublicBucket();

  const objectName = sanitizeObjectName(args.originalFileName);
  await minioClient.putObject(
    env.minioBucketName,
    objectName,
    args.fileBuffer,
    args.fileBuffer.length,
    {
      "Content-Type": args.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  );

  const baseUrl = env.minioPublicBaseUrl.replace(/\/+$/, "");
  return `${baseUrl}/${env.minioBucketName}/${objectName}`;
}
