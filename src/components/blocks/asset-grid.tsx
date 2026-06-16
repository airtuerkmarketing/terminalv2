import type { AssetGridContent } from "@/lib/blocks/types";

export function AssetGrid({ content }: { content: AssetGridContent }) {
  return (
    <div className="asset-grid">
      {content.items.map((it, i) => (
        <a key={i} className="asset-card" href={it.href ?? "#"}>
          <div className="thumb">
            {it.assetUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary CMS/Supabase asset URL
              <img src={it.assetUrl} alt={it.title} />
            ) : null}
          </div>
          <div className="meta">
            <div className="name">{it.title}</div>
            {it.meta ? <div className="sub">{it.meta}</div> : null}
          </div>
        </a>
      ))}
    </div>
  );
}
