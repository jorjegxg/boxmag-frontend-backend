import { describe, expect, it } from "vitest";
import {
  buildPublicReadPolicy,
  parseOrderAttachmentObjectNameFromUrl,
} from "../services/minio";
import { env } from "../config/env";

describe("minio public-read policy", () => {
  it("allows GetObject only under boxes/ prefix", () => {
    const policy = JSON.parse(buildPublicReadPolicy("boxmag4-images"));
    expect(policy.Statement).toHaveLength(1);
    expect(policy.Statement[0].Action).toEqual(["s3:GetObject"]);
    expect(policy.Statement[0].Resource).toEqual([
      "arn:aws:s3:::boxmag4-images/boxes/*",
    ]);
    expect(JSON.stringify(policy)).not.toContain(
      "arn:aws:s3:::boxmag4-images/*\"",
    );
  });
});

describe("parseOrderAttachmentObjectNameFromUrl", () => {
  it("extracts orders/attachments object key from MinIO public URL", () => {
    const url = `http://localhost:9000/${env.minioBucketName}/orders/attachments/123-specs.pdf`;
    expect(parseOrderAttachmentObjectNameFromUrl(url)).toBe(
      "orders/attachments/123-specs.pdf",
    );
  });

  it("returns null for catalog image URLs", () => {
    const url = `http://localhost:9000/${env.minioBucketName}/boxes/product.png`;
    expect(parseOrderAttachmentObjectNameFromUrl(url)).toBeNull();
  });

  it("returns null for unrelated URLs", () => {
    expect(
      parseOrderAttachmentObjectNameFromUrl("https://example.com/file.pdf"),
    ).toBeNull();
  });
});
