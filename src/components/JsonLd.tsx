// The only file in src/ that sets raw HTML. Dealer text reaches it, so every "<" is written as < and can never close the script tag (T-02-14).
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
