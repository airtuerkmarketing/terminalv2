import { DocumentList } from "@/components/blocks/document-list";
import { BlockEmptyState } from "@/components/blocks/empty-state";
import type { DocumentListContent } from "@/lib/blocks/types";

/**
 * Letterhead section. Empty for holidays + atBeds (no letterhead blocks in the
 * DB) → same empty state as before.
 */
export function LetterheadSection({ content }: { content?: DocumentListContent }) {
  return (
    <section id="letterhead" className="anchor-section anchor-section--two-col">
      <h2>Letterhead</h2>
      {content ? (
        <div className="page-blocks">
          <div className="block">
            <DocumentList content={content} />
          </div>
        </div>
      ) : (
        <BlockEmptyState />
      )}
    </section>
  );
}
