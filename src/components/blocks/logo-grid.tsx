import { Download } from "lucide-react";
import type { LogoGridContent } from "@/lib/blocks/types";

export function LogoGrid({ content }: { content: LogoGridContent }) {
  return (
    <div className={`logo-grid${content.display === "circles" ? " is-circles" : ""}`}>
      {content.items.map((it, i) => {
        // The asset URL is itself the downloadable file (SVG); an explicit
        // per-item href wins if set. No button when neither is present.
        const dl = it.href ?? it.assetUrl;
        return (
          <div key={i} className="logo-tile">
            {dl ? (
              <a className="card-dl" href={dl} download aria-label={`Download ${it.label}`} title={`Download ${it.label}`}>
                <Download aria-hidden />
              </a>
            ) : null}
            {it.assetUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary CMS/Supabase asset URL
              <img src={it.assetUrl} alt={it.label} />
            ) : (
              (it.mark ?? it.label)
            )}
          </div>
        );
      })}
    </div>
  );
}
