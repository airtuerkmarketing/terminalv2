import type { RawHtmlContent } from "@/lib/blocks/types";

/**
 * Escape-hatch block. `html` is authored by trusted admins (Phase 5), so
 * rendering it verbatim is intentional.
 */
export function RawHtml({ content }: { content: RawHtmlContent }) {
  return <div className="rich-text" dangerouslySetInnerHTML={{ __html: content.html }} />;
}
