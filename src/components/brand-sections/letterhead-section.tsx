import { Download } from "lucide-react";
import { BlockEmptyState } from "@/components/blocks/empty-state";
import type { DocumentItem, DocumentListContent } from "@/lib/blocks/types";

/**
 * Letterhead section — a designed, frontend-only tile layout (no longer the
 * DocumentList list_rows block, which stays in use for the master-deck section /
 * DB path). Each letterhead is a download card: a tilted paper preview on top,
 * title + download affordance below. The tilt language (ease/duration/reduced-
 * motion) matches the master-deck tilted card so the portal has one tilt style.
 *
 * Empty for holidays + atBeds (no letterhead in the DB) → unchanged empty state.
 */

// Preview images don't exist yet. Mirror the master-deck previewPathFor pattern —
// derive /previews/letterhead/<file>.preview.png from the ZIP href — but gate it
// behind a whitelist so nothing points at a missing file (no broken image, no
// guessed path). TODO: once the real previews are uploaded, add their paths here
// (or replace this with a previewImageUrl schema field) to activate them.
const KNOWN_LH_PREVIEWS = new Set<string>([]);
function previewFor(doc: DocumentItem): string | null {
  if (!doc.href) return null;
  try {
    const parts = new URL(doc.href).pathname.split("/").filter(Boolean);
    const file = parts[parts.length - 1];
    if (!file) return null;
    const path = `/previews/letterhead/${file.replace(/\.[^.]+$/, "")}.preview.png`;
    return KNOWN_LH_PREVIEWS.has(path) ? path : null;
  } catch {
    return null;
  }
}

export function LetterheadSection({ content }: { content?: DocumentListContent }) {
  const docs = content ? content.groups.flatMap((g) => g.documents) : [];

  return (
    <section id="letterhead" className="anchor-section anchor-section--two-col">
      <h2>Letterhead</h2>
      {docs.length ? (
        <div className="letterhead-tiles">
          {docs.map((doc) => {
            const preview = previewFor(doc);
            return (
              <a className="lh-card" href={doc.href} download key={doc.href ?? doc.title}>
                <div className="lh-preview">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element -- static letterhead preview
                    <img className="lh-preview-img" src={preview} alt="" />
                  ) : (
                    <span className="lh-paper" aria-hidden="true" />
                  )}
                </div>
                <div className="lh-card-body">
                  <div>
                    <div className="lh-title">{doc.title}</div>
                    <div className="lh-fmt">ZIP · Word &amp; PDF</div>
                  </div>
                  <span className="lh-dl" aria-hidden="true">
                    <Download />
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <BlockEmptyState />
      )}
    </section>
  );
}
