import type { AssetBlockContent } from "@/lib/blocks/types";

export function AssetBlock({ content }: { content: AssetBlockContent }) {
  return (
    <div className="asset-block">
      {content.title ? (
        <div className="block-label">
          <h2>{content.title}</h2>
        </div>
      ) : null}
      <div className="preview">
        {content.assetUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary CMS/Supabase asset URL
          <img src={content.assetUrl} alt={content.title ?? "Asset"} />
        ) : null}
      </div>
      {content.caption ? <p className="rich-text">{content.caption}</p> : null}
      {content.downloads?.length ? (
        <div className="downloads">
          {content.downloads.map((d, i) => (
            <a key={i} className="dl-pill" href={d.href}>
              {d.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
