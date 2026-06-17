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

function ft(d: DocumentItem) {
  return (d.filetype ?? "doc").toUpperCase();
}

function ListRows({ docs }: { docs: DocumentItem[] }) {
  return (
    <div className="doc-rows">
      {docs.map((d, i) => (
        <a key={i} className="doc-row" href={d.href ?? "#"}>
          <span className={`ft ${d.filetype ?? ""}`}>{ft(d)}</span>
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
      {docs.map((d, i) => (
        <div key={i} className="doc-card">
          <div className="preview">
            <span className={`doc-badge ${d.filetype ?? ""}`}>{ft(d)}</span>
            {d.href ? (
              <a className="card-dl" href={d.href} download aria-label={`Download ${d.title}`} title={`Download ${d.title}`}>
                <Download aria-hidden />
              </a>
            ) : null}
          </div>
          <div className="meta">
            <a href={d.href ?? "#"}>
              {d.title}
              {d.lang ? <span className="lang">{d.lang}</span> : null}
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

function ImageCta({ docs }: { docs: DocumentItem[] }) {
  return (
    <div className="doc-image-grid">
      {docs.map((d, i) => (
        <div key={i} className="doc-image-card">
          <div className="shot">
            <span className={`doc-badge ${d.filetype ?? ""}`}>{ft(d)}</span>
          </div>
          <div className="cta">
            <a className="btn-outline" href={d.href ?? "#"}>
              Download {ft(d)}
            </a>
            {d.meta ? <p className="caption">{d.meta}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
