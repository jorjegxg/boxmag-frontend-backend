/** Max decoded attachment size for B2B orders and checkout (bytes). */
export const MAX_ORDER_ATTACHMENT_BYTES = 18 * 1024 * 1024;

/** JSON body limit — base64 adds ~33% overhead plus other order fields. */
export const JSON_BODY_LIMIT = "25mb";

export const MAX_ORDER_ATTACHMENT_MB = 18;

/**
 * Order attachment allowlist (extension → served Content-Type).
 * The type is always derived from the extension — never from the client-supplied
 * MIME type — and anything scriptable in a browser (html, svg, xml, js…) is
 * rejected on upload and never served inline.
 */
const ORDER_ATTACHMENT_TYPES = new Map<
  string,
  { mime: string; inline: boolean }
>(Object.entries({
  pdf: { mime: "application/pdf", inline: true },
  png: { mime: "image/png", inline: true },
  jpg: { mime: "image/jpeg", inline: true },
  jpeg: { mime: "image/jpeg", inline: true },
  gif: { mime: "image/gif", inline: true },
  webp: { mime: "image/webp", inline: true },
  tif: { mime: "image/tiff", inline: false },
  tiff: { mime: "image/tiff", inline: false },
  ai: { mime: "application/postscript", inline: false },
  eps: { mime: "application/postscript", inline: false },
  psd: { mime: "image/vnd.adobe.photoshop", inline: false },
  cdr: { mime: "application/octet-stream", inline: false },
  dxf: { mime: "application/octet-stream", inline: false },
  dwg: { mime: "application/octet-stream", inline: false },
  zip: { mime: "application/zip", inline: false },
  doc: { mime: "application/msword", inline: false },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    inline: false,
  },
  xls: { mime: "application/vnd.ms-excel", inline: false },
  xlsx: {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    inline: false,
  },
  txt: { mime: "text/plain; charset=utf-8", inline: false },
  csv: { mime: "text/csv; charset=utf-8", inline: false },
}));

export const ALLOWED_ORDER_ATTACHMENT_EXTENSIONS = [
  ...ORDER_ATTACHMENT_TYPES.keys(),
];

function attachmentExtension(fileName: string): string {
  const trimmed = fileName.trim();
  const dotIndex = trimmed.lastIndexOf(".");
  return dotIndex > 0 ? trimmed.slice(dotIndex + 1).toLowerCase() : "";
}

export function isAllowedOrderAttachmentName(fileName: string): boolean {
  return ORDER_ATTACHMENT_TYPES.has(attachmentExtension(fileName));
}

/**
 * How an order attachment must be served. Unknown / legacy types (including
 * files stored before the allowlist existed) are forced to a binary download.
 */
export function resolveOrderAttachmentServing(fileName: string): {
  contentType: string;
  allowInline: boolean;
} {
  const known = ORDER_ATTACHMENT_TYPES.get(attachmentExtension(fileName));
  if (!known) {
    return { contentType: "application/octet-stream", allowInline: false };
  }
  return { contentType: known.mime, allowInline: known.inline };
}
