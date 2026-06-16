import type { LogoShowcaseContent } from "@/lib/blocks/types";

export function LogoShowcase({ content }: { content: LogoShowcaseContent }) {
  return (
    <div>
      <div className="logo-display">
        {content.downloadHref ? (
          <a className="download-link" href={content.downloadHref}>
            Download
          </a>
        ) : null}
        {content.assetUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary CMS/Supabase asset URL
          <img src={content.assetUrl} alt={content.mark ?? "Logo"} />
        ) : (
          <div className="mark-lg">{content.mark ?? "Logo"}</div>
        )}
      </div>
      {content.packageLabel ? (
        <div className="logo-pkg">
          <div>
            <div className="label">{content.packageLabel}</div>
            {content.packageSub ? <div className="sub">{content.packageSub}</div> : null}
          </div>
          {content.packageHref ? (
            <a className="dl-pill" href={content.packageHref}>
              Download ZIP
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
