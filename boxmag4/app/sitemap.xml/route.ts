import {
  buildSitemapXml,
  buildStaticSitemapXml,
} from "@/lib/sitemap-build";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 3_600_000;

let cachedXml: string | null = null;
let cachedAt = 0;

function xmlResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}

export async function GET(): Promise<Response> {
  const now = Date.now();
  if (cachedXml && now - cachedAt < CACHE_TTL_MS) {
    return xmlResponse(cachedXml);
  }

  try {
    const xml = await buildSitemapXml();
    cachedXml = xml;
    cachedAt = now;
    return xmlResponse(xml);
  } catch {
    const fallback = buildStaticSitemapXml();
    cachedXml = fallback;
    cachedAt = now;
    return xmlResponse(fallback);
  }
}
