import { AssetBlock } from "@/components/blocks/asset-block";
import type { AssetBlockContent } from "@/lib/blocks/types";

/** LinkedIn banner section (airtuerk-service only). */
export function LinkedinBannerSection({ content }: { content: AssetBlockContent }) {
  return (
    <section id="linkedin-banner" className="anchor-section anchor-section--two-col">
      <h2>LinkedIn</h2>
      <div className="page-blocks">
        <div className="block">
          <AssetBlock content={content} />
        </div>
      </div>
    </section>
  );
}
