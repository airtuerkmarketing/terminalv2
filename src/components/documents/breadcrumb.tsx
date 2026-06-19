import Link from "next/link";
import type { FolderDTO } from "@/lib/documents";

/** Breadcrumb: "Documents Library" → each ancestor → current (last, not linked). */
export function Breadcrumb({ trail }: { trail: FolderDTO[] }) {
  return (
    <nav className="dl-breadcrumb" aria-label="Breadcrumb">
      <Link href="/documents-library" className="dl-crumb">
        Documents Library
      </Link>
      {trail.map((f, i) => {
        const last = i === trail.length - 1;
        return (
          <span key={f.id} className="dl-crumb-wrap">
            <span className="dl-crumb-sep" aria-hidden="true">
              ›
            </span>
            {last ? (
              <span className="dl-crumb current" aria-current="page">
                {f.name}
              </span>
            ) : (
              <Link href={`/documents-library/${f.path}`} className="dl-crumb">
                {f.name}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
