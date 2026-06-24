import type { PageHeroContent } from "@/lib/blocks/types";

export function PageHero({ content }: { content: PageHeroContent }) {
  return (
    <header className="page-hero-block">
      {/* The index number (content.number) is intentionally not rendered — the
          data is kept, only the eyebrow display was removed. */}
      <h1>{content.title}</h1>
      {content.subtitle ? <p className="lead">{content.subtitle}</p> : null}
    </header>
  );
}
