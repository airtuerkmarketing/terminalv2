import type { DescriptionContent } from "@/lib/blocks/types";

/**
 * Rich-text block. `html` is authored by trusted admins in the Phase 5 CMS;
 * sanitization is enforced at author time, so rendering it here is intentional.
 */
export function Description({ content }: { content: DescriptionContent }) {
  return <div className="rich-text" dangerouslySetInnerHTML={{ __html: content.html }} />;
}
