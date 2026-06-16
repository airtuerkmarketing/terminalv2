import type { LogoGridContent } from "@/lib/blocks/types";

export function LogoGrid({ content }: { content: LogoGridContent }) {
  return (
    <div className={`logo-grid${content.display === "circles" ? " is-circles" : ""}`}>
      {content.items.map((it, i) => (
        <div key={i} className="logo-tile">
          {it.assetUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary CMS/Supabase asset URL
            <img src={it.assetUrl} alt={it.label} />
          ) : (
            (it.mark ?? it.label)
          )}
        </div>
      ))}
    </div>
  );
}
