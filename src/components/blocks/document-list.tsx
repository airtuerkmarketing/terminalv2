import { Download } from "lucide-react";
import type { DocumentItem, DocumentListContent } from "@/lib/blocks/types";

// document_list supports three presentation styles (D-037); default is
// preview_cards.
export function DocumentList({ content }: { content: DocumentListContent }) {
  const style = content.style ?? "preview_cards";
  return (
    <div>
      {content.groups.map((g, gi) => (
        <div key={gi} className="doc-group">
          {g.title ? <div className="group-title">{g.title}</div> : null}
          {style === "list_rows" ? (
            <ListRows docs={g.documents} />
          ) : style === "image_outline_button" ? (
            <ImageCta docs={g.documents} />
          ) : (
            <PreviewCards docs={g.documents} />
          )}
        </div>
      ))}
    </div>
  );
}

// BUG-2: resolve a concrete file kind so the badge never falls back to "DOC"
// for non-doc files (e.g. ZIP letterheads) and never emits an empty modifier
// class. Prefer the explicit filetype, else derive from the href extension.
type FtKind = "pdf" | "word" | "zip" | "file";
const FT_LABEL: Record<FtKind, string> = { pdf: "PDF", word: "DOC", zip: "ZIP", file: "FILE" };
function ftKind(d: DocumentItem): FtKind {
  if (d.filetype === "pdf") return "pdf";
  if (d.filetype === "word") return "word";
  const href = (d.href ?? "").toLowerCase();
  if (href.endsWith(".zip")) return "zip";
  if (href.endsWith(".pdf")) return "pdf";
  if (href.endsWith(".docx") || href.endsWith(".doc")) return "word";
  return "file";
}

// Convention-based preview cover for master-deck PDFs (no DB schema field yet).
// From a Storage href like .../master-deck/<brand>/<file>.pdf we derive the
// expected static cover at /previews/master-deck/<brand>/<file>.preview.png.
function previewPathFor(d: DocumentItem): string | null {
  if (ftKind(d) !== "pdf" || !d.href) return null;
  try {
    const url = new URL(d.href);
    const parts = url.pathname.split("/").filter(Boolean);
    const fileIdx = parts.findIndex((p) => p.toLowerCase().endsWith(".pdf"));
    if (fileIdx < 1) return null;
    const file = parts[fileIdx];
    const brand = parts[fileIdx - 1];
    if (!file || !brand) return null;
    const baseName = file.replace(/\.pdf$/i, "");
    return `/previews/master-deck/${brand}/${baseName}.preview.png`;
  } catch {
    return null;
  }
}

// Only covers we've actually committed render as tilted cards; everything else
// (EN/TR, document library, …) keeps the fallback style. Temporary allowlist —
// to be replaced by a previewImageUrl schema field in a future step.
const KNOWN_PREVIEWS = new Set<string>([
  "/previews/master-deck/airtuerk-service/airtuerk_Master_DE.preview.png",
  "/previews/master-deck/airtuerk-service/airtuerk_Master_EN.preview.png",
]);

function getPreview(d: DocumentItem): string | null {
  const path = previewPathFor(d);
  return path && KNOWN_PREVIEWS.has(path) ? path : null;
}

function ListRows({ docs }: { docs: DocumentItem[] }) {
  return (
    <div className="doc-rows">
      {docs.map((d, i) => (
        <a key={i} className="doc-row" href={d.href ?? "#"}>
          <span className={`ft ${ftKind(d)}`}>{FT_LABEL[ftKind(d)]}</span>
          <span className="info">
            <span className="name">{d.title}</span>
            {d.meta ? <span className="sub">{d.meta}</span> : null}
          </span>
        </a>
      ))}
    </div>
  );
}

function PreviewCards({ docs }: { docs: DocumentItem[] }) {
  return (
    <div className="doc-cards">
      {docs.map((d, i) => {
        const previewSrc = getPreview(d);
        // Tilted variant: meta left, rotated cover image overflowing right.
        if (previewSrc) {
          return (
            <a
              key={i}
              href={d.href ?? "#"}
              download={d.href ? "" : undefined}
              aria-label={`Download ${d.title}`}
              className="doc-card doc-card--tilted"
            >
              <div className="doc-card__meta">
                <div className="doc-card__icon">
                  {/* eslint-disable-next-line @next/next/no-img-element -- static pdf icon */}
                  <img src="/icons/pdf-icon.svg" alt="" aria-hidden="true" />
                </div>
                <div className="doc-card__text">
                  <div className="doc-card__title">{d.title}</div>
                  <div className="doc-card__sub">Click to download latest</div>
                </div>
              </div>
              <div className="doc-card__shot">
                {/* eslint-disable-next-line @next/next/no-img-element -- static convention-based cover */}
                <img src={previewSrc} alt={d.title} />
              </div>
            </a>
          );
        }
        // Fallback: existing preview-card style (EN/TR, document library, …).
        return (
          <div key={i} className="doc-card">
            <div className="preview">
              <span className={`doc-badge ${ftKind(d)}`}>{FT_LABEL[ftKind(d)]}</span>
              {d.href ? (
                <a className="card-dl" href={d.href} download aria-label={`Download ${d.title}`} title={`Download ${d.title}`}>
                  <Download aria-hidden />
                </a>
              ) : null}
            </div>
            <div className="meta">
              <a href={d.href ?? "#"}>
                {d.title}
                {/* BUG-1: skip the lang badge when the title already ends in a
                    language suffix like "(DE)" / "(EN)" / "(TR)" to avoid "(DE)DE". */}
                {d.lang && !/\((DE|EN|TR)\)\s*$/i.test(d.title) ? (
                  <span className="lang">{d.lang}</span>
                ) : null}
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ImageCta({ docs }: { docs: DocumentItem[] }) {
  return (
    <div className="doc-image-grid">
      {docs.map((d, i) => (
        <div key={i} className="doc-image-card">
          <div className="shot">
            <span className={`doc-badge ${ftKind(d)}`}>{FT_LABEL[ftKind(d)]}</span>
          </div>
          <div className="cta">
            <a className="btn-outline" href={d.href ?? "#"}>
              Download {FT_LABEL[ftKind(d)]}
            </a>
            {d.meta ? <p className="caption">{d.meta}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
