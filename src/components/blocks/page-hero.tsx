import type { PageHeroContent } from "@/lib/blocks/types";

export function PageHero({ content }: { content: PageHeroContent }) {
  return (
    <header className="page-hero">
      {content.number ? (
        <div className="eyebrow">
          <span className="num">{content.number}</span>
        </div>
      ) : null}
      <h1>{content.title}</h1>
      {content.subtitle ? <p className="lead">{content.subtitle}</p> : null}
    </header>
  );
}
