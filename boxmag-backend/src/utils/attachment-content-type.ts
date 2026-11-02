/**
 * Order attachments are uploaded by anonymous users and served from the API
 * origin, which also receives the admin session cookie. Never trust the
 * client-supplied MIME type: anything that a browser could execute (HTML, SVG,
 * XML, JS…) must not be rendered inline on that origin.
 */

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  zip: "application/zip",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
  csv: "text/csv",
};

/** Types a browser renders without running scripts — safe to show inline. */
const INLINE_SAFE_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

const KNOWN_TYPES = new Set(Object.values(MIME_BY_EXTENSION));

const FALLBACK_TYPE = "application/octet-stream";

function baseMimeType(value: string | null | undefined): string | null {
  const base = value?.split(";")[0]?.trim().toLowerCase();
  return base ? base : null;
}

export function guessAttachmentMimeType(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[extension] ?? FALLBACK_TYPE;
}

/**
 * MIME type to store for an uploaded attachment: the declared type only when it
 * is one we know, otherwise the type implied by the extension (or octet-stream).
 */
export function normalizeAttachmentMimeType(
  declaredMimeType: string | null | undefined,
  fileName: string,
): string {
  const declared = baseMimeType(declaredMimeType);
  if (declared && KNOWN_TYPES.has(declared)) return declared;
  return guessAttachmentMimeType(fileName);
}

/**
 * Content-Type and disposition for serving an attachment. Only inert types
 * (PDF, raster images) may be shown inline; everything else is a download, and
 * unknown types are downgraded to octet-stream.
 */
export function resolveAttachmentServing(args: {
  fileName: string;
  storedContentType: string | null | undefined;
  forceDownload: boolean;
}): { contentType: string; inline: boolean } {
  const stored = baseMimeType(args.storedContentType);
  const candidate =
    stored && stored !== FALLBACK_TYPE
      ? stored
      : guessAttachmentMimeType(args.fileName);
  const contentType = KNOWN_TYPES.has(candidate) ? candidate : FALLBACK_TYPE;
  const inline = !args.forceDownload && INLINE_SAFE_TYPES.has(contentType);
  return { contentType, inline };
}
