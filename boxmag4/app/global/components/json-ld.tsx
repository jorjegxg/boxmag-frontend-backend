import type { JsonLdObject } from "../../../lib/schema";

/**
 * Renders Schema.org JSON-LD into the initial HTML. Server Component on purpose —
 * crawlers must see the payload without executing client JS.
 */
export function JsonLd({ data }: { data: JsonLdObject | JsonLdObject[] }) {
  const blocks = Array.isArray(data) ? data : [data];

  return (
    <>
      {blocks.map((block, index) => (
        <script
          key={index}
          type="application/ld+json"
          // `<` is escaped so a stray value can never break out of the script tag.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(block).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}
