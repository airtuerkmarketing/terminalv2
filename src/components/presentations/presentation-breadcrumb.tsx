import Link from "next/link";
import type { PresentationFolderDTO } from "@/lib/presentations";

/** Breadcrumb: "Presentation Hub" → each ancestor → current (last, not linked). */
export function PresentationBreadcrumb({ trail }: { trail: PresentationFolderDTO[] }) {
  return (
    <nav className="ph-breadcrumb" aria-label="Breadcrumb">
      <Link href="/presentation-hub" className="ph-crumb">
        Presentation Hub
      </Link>
      {trail.map((f, i) => {
        const last = i === trail.length - 1;
        return (
          <span key={f.id} className="ph-crumb-wrap">
            <span className="ph-crumb-sep" aria-hidden="true">
              ›
            </span>
            {last ? (
              <span className="ph-crumb current" aria-current="page">
                {f.name}
              </span>
            ) : (
              <Link href={`/presentation-hub/${f.path}`} className="ph-crumb">
                {f.name}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
