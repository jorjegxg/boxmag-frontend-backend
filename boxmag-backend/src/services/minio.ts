import { Client as MinioClient } from "minio";
import { env } from "../config/env";
import { Readable } from "stream";

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

function sanitizeOrderAttachmentObjectName(fileName: string): string {
  const trimmed = fileName.trim();
  const dotIndex = trimmed.lastIndexOf(".");
  const extension = dotIndex > 0 ? trimmed.slice(dotIndex).toLowerCase() : "";
  const baseName = (dotIndex > 0 ? trimmed.slice(0, dotIndex) : trimmed)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const safeBaseName = baseName || "order-attachment";
  return `orders/attachments/${Date.now()}-${safeBaseName}${extension || ""}`;
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
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

export async function uploadOrderAttachmentToMinio(args: {
  fileBuffer: Buffer;
  originalFileName: string;
  mimeType?: string;
}): Promise<{ objectName: string; url: string }> {
  await ensurePublicBucket();

  const objectName = sanitizeOrderAttachmentObjectName(args.originalFileName);
  await minioClient.putObject(
    env.minioBucketName,
    objectName,
    args.fileBuffer,
    args.fileBuffer.length,
    args.mimeType
      ? {
          "Content-Type": args.mimeType,
        }
      : undefined,
  );

  const baseUrl = env.minioPublicBaseUrl.replace(/\/+$/, "");
  return {
    objectName,
    url: `${baseUrl}/${env.minioBucketName}/${objectName}`,
  };
}

export async function getObjectBufferFromMinio(
  objectName: string,
): Promise<Buffer> {
  const objectStream = await minioClient.getObject(env.minioBucketName, objectName);
  return streamToBuffer(objectStream);
}
