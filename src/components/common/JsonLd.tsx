interface JsonLdProps {
  data: Record<string, unknown>;
}

/** Рендерит script-блок Schema.org (работает и при SSR-prerender — важно для SEO). */
export const JsonLd = ({ data }: JsonLdProps) => (
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
);
