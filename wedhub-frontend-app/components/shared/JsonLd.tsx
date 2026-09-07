// Renders one schema.org JSON-LD payload as an inline <script> tag. The
// "</" -> "<\/" replace prevents a literal "</script>" substring inside any
// user-provided string field (e.g. a blog title, vendor description) from
// prematurely closing this script tag — standard defense for embedding
// JSON inside HTML, same class of escape Next.js itself uses internally.
export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
