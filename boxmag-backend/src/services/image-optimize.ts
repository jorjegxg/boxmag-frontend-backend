import sharp from "sharp";

const MAX_UPLOAD_DIMENSION = 1600;

export type OptimizedImage = {
  buffer: Buffer;
  mimeType: string;
  extension: string;
};

function extensionForFormat(format: string | undefined): string {
  switch (format) {
    case "jpeg":
      return ".jpg";
    case "png":
      return ".png";
    case "webp":
      return ".webp";
    default:
      return ".jpg";
  }
}

function mimeTypeForFormat(format: string | undefined): string {
  switch (format) {
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}

export async function optimizeUploadedBoxImage(
  fileBuffer: Buffer,
  mimeType: string,
): Promise<OptimizedImage> {
  const input = sharp(fileBuffer, { failOn: "none" });
  const metadata = await input.metadata();
  const outputFormat =
    metadata.format === "png" || mimeType === "image/png" ? "png" : "jpeg";

  let pipeline = sharp(fileBuffer, { failOn: "none" }).resize({
    width: MAX_UPLOAD_DIMENSION,
    height: MAX_UPLOAD_DIMENSION,
    fit: "inside",
    withoutEnlargement: true,
  });

  const buffer =
    outputFormat === "png"
      ? await pipeline.png({ compressionLevel: 9, effort: 10 }).toBuffer()
      : await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();

  return {
    buffer,
    mimeType: mimeTypeForFormat(outputFormat),
    extension: extensionForFormat(outputFormat),
  };
}
