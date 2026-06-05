const FRONTEND_STATIC_PREFIXES = ["/ecommerce/", "/b2b/", "/placeholders/"];

export function normalizeImageUrl(
  backendBaseUrl: string,
  imagePath: string,
  fallback = "/placeholders/box4.png",
): string {
  const trimmed = imagePath.trim();
  if (!trimmed) return fallback;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  if (FRONTEND_STATIC_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))) {
    return normalizedPath;
  }

  const base = backendBaseUrl.replace(/\/+$/, "");
  return `${base}${normalizedPath}`;
}
