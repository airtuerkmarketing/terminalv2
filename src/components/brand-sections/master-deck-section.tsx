import { DocumentList } from "@/components/blocks/document-list";
import { BlockEmptyState } from "@/components/blocks/empty-state";
import type { DocumentListContent } from "@/lib/blocks/types";

/**
 * Presentation master-deck section. When a brand has no deck (holidays, atBeds)
 * the section renders the same empty state the DB-block path produced —
 * BlockEmptyState as the direct grid child, no `.page-blocks` wrapper.
 */
export function MasterDeckSection({
  heading,
  content,
}: {
  heading: string;
  content?: DocumentListContent;
}) {
  return (
    <section id="master-deck" className="anchor-section anchor-section--two-col">
      <h2>{heading}</h2>
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
