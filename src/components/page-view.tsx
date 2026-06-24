import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  getBlocks,
  getBrandSectionsAll,
  getIbeProducts,
  getImageAssets,
  getPageByPath,
  getSinglePageBrandSlugs,
  getTeamMembers,
  type PageRow,
} from "@/lib/pages";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import { BlockEmptyState } from "@/components/blocks/empty-state";
import { HardcodedStub } from "@/components/blocks/hardcoded-stub";
import { AssetLibrary } from "@/components/hardcoded/asset-library";
import { EmailSignature } from "@/components/hardcoded/email-signature";
import { ApixWorkflow } from "@/components/hardcoded/apix-workflow";
import { ApixNetwork } from "@/components/hardcoded/apix-network";
import { ApixPresentation } from "@/components/hardcoded/apix-presentation";
import { ApixGroup } from "@/components/hardcoded/apix-group";
import { TeamDirectory } from "@/components/hardcoded/team";
import { ReviewQuiz } from "@/components/hardcoded/review-quiz";
import { GoldSetIndex } from "@/components/hardcoded/gold-set";
import { AI_TEST_1, AI_TEST_2, AI_TEST_3 } from "@/components/hardcoded/ai-test-data";
import { BrandPage } from "@/components/brand-sections";
import { isBrandTsxSlug } from "@/lib/brand-types";

const IBE_PATH = "/ibe-product-suite";

/** Brand routes that use the Webflow two-column section layout (section title
 *  left ~25%, content right ~75%). IBE gets the same treatment via its own
 *  render path below. Other brands stay single-column. */
const TWO_COL_BRAND_SLUGS = new Set([
  "airtuerk-service",
  "airtuerk-holidays",
  "atbeds",
  "service-center-antalya",
]);

/**
 * Internal validation pages — interne Daten (Notfallnummern, Konditionen),
 * nicht in Suchmaschinen. noindex on these three routes only.
 */
const NOINDEX_PATHS = new Set([
  "/gold-set",
  "/gold-set/ai-test-1",
  "/gold-set/ai-test-2",
  "/gold-set/ai-test-3",
]);

/** Build <head> metadata from the page row. */
export async function pageMetadata(fullPath: string): Promise<Metadata> {
  const page = await getPageByPath(fullPath);
  if (!page) return { title: "terminalv2" };
  return {
    title: `${page.meta_title ?? page.title} · terminalv2`,
    description: page.meta_description ?? undefined,
    robots: NOINDEX_PATHS.has(fullPath) ? { index: false, follow: false } : undefined,
  };
}

/**
 * Resolve and render a page by its full_path. Shared by the home route ("/")
 * and the catch-all ("/[...slug]"). Returns rendered JSX (not a component) so
 * callers can `await` it without async-component typing friction.
 */
export async function renderPage(fullPath: string) {
  const page = await getPageByPath(fullPath);
  if (!page) notFound();

  // Single-page brand child (any rendering mode): redirect to parent anchor.
  // This check runs BEFORE the hardcoded dispatcher so that sub-routes of a
  // single-page brand (e.g. /airtuerk-apix/workflow, /airtuerk-service/email-signature)
  // redirect to /<brand>#<slug> instead of rendering a full standalone page.
  // Top-level hardcoded routes (asset-library, document-library, …) have
  // segments.length === 1 and are never caught here.
  const singlePageSlugs = await getSinglePageBrandSlugs();
  const segments = fullPath.split("/").filter(Boolean);
  if (
    segments.length === 2 &&
    page.parent_id &&
    singlePageSlugs.has(segments[0])
  ) {
    redirect(`/${segments[0]}#${page.slug}`);
  }

  // Hardcoded routes → the real component by component_key; others still stub.
  // Each renders inside .main-inner so it keeps the 1400px readable-measure cap
  // now that .main spans the full content column (see shell.css / .main-inner).
  if (page.rendering_mode === "hardcoded") {
    return <div className="main-inner">{await renderHardcoded(page)}</div>;
  }

  const blocks = await getBlocks(page.id);

  // IBE Product Suite keeps its product-brand-driven single page (unchanged path,
  // preserves the spec'd product order). Sections come from the product brands.
  if (fullPath === IBE_PATH) {
    const products = await getIbeProducts();
    return (
      <>
        <PageHeader page={page} />
        <div className="main-inner">
          <article>
            {blocks.length > 0 ? <BlockRenderer blocks={blocks} /> : null}
            {products.map((p) => (
              <section key={p.slug} id={p.slug} className="anchor-section anchor-section--two-col">
                <h2>{p.name}</h2>
                <BlockEmptyState />
              </section>
            ))}
          </article>
        </div>
      </>
    );
  }

  // Single-page brand parent: parent's own blocks (hero) first, then each child
  // page as an in-page anchor <section>. Block children get a BlockRenderer;
  // hardcoded children (APIX tools, email-signature, …) get their component
  // with embedded=true so the component suppresses its own standalone header.
  if (segments.length === 1 && singlePageSlugs.has(segments[0])) {
    const brandSlug = segments[0];
    // Brands ported to typed TSX sections (D-059): render hardcoded section
    // components instead of the DB-block aggregator — no getBrandSectionsAll /
    // per-section getBlocks reads. PageHeader + the parent page's own hero blocks
    // stay identical, so the surrounding DOM and the anchor ids are unchanged.
    if (isBrandTsxSlug(brandSlug)) {
      return (
        <>
          <PageHeader page={page} />
          <div className="main-inner">
            <article>
              {blocks.length > 0 ? <BlockRenderer blocks={blocks} /> : null}
              <BrandPage brand={brandSlug} />
            </article>
          </div>
        </>
      );
    }
    // Fallback: DB-block-driven single-page brands (airtuerk-apix — its children
    // are hardcoded APIX tools embedded as anchor sections). Kept intact.
    const sections = await getBrandSectionsAll(page.id);
    const twoCol = TWO_COL_BRAND_SLUGS.has(segments[0]);
    return (
      <>
        <PageHeader page={page} />
        <div className="main-inner">
          <article>
            {blocks.length > 0 ? <BlockRenderer blocks={blocks} /> : null}
            {sections.map((s) => {
              // Two-column applies only to block-mode sections; hardcoded tool
              // sections (e.g. email-signature) render no <h2> and stay full-width.
              const sectionClass =
                twoCol && s.rendering_mode === "blocks"
                  ? "anchor-section anchor-section--two-col"
                  : "anchor-section";
              return (
                <section key={s.slug} id={s.slug} className={sectionClass}>
                  {s.rendering_mode === "hardcoded" ? (
                    renderHardcodedEmbedded(s.component_key, s.title)
                  ) : (
                    <>
                      <h2>{s.title}</h2>
                      {s.blocks.length > 0 ? <BlockRenderer blocks={s.blocks} /> : <BlockEmptyState />}
                    </>
                  )}
                </section>
              );
            })}
          </article>
        </div>
      </>
    );
  }

  // Block-driven page. If blocks exist, render them inside .main-inner (they
  // carry their own inline hero, the flat .page-hero-block). Otherwise show the
  // full-bleed PageHeader (outside .main-inner) + a clean empty state.
  if (blocks.length > 0) {
    return (
      <div className="main-inner">
        <article>
          <BlockRenderer blocks={blocks} />
        </article>
      </div>
    );
  }
  return (
    <>
      <PageHeader page={page} />
      <div className="main-inner">
        <article>
          <BlockEmptyState />
        </article>
      </div>
    </>
  );
}

/** Dispatch a top-level hardcoded route to its component by component_key.
 *  Async because a few components need server data (assets, team members). The
 *  caller wraps the result in .main-inner so every hardcoded page keeps the
 *  1400px content cap. */
async function renderHardcoded(page: PageRow) {
  if (page.component_key === "asset-library") {
    const assets = await getImageAssets();
    return <AssetLibrary title={page.title} assets={assets} />;
  }
  if (page.component_key === "email-signature") {
    return <EmailSignature title={page.title} />;
  }
  // document-library: superseded by the File System v2 route
  // /documents-library/[[...folder]] (D-053), which shadows this catch-all for
  // that subtree. The legacy getDocumentLibrary()/<DocumentLibrary> path is
  // deprecated and no longer reached.
  if (page.component_key === "apix-workflow") {
    return <ApixWorkflow title={page.title} />;
  }
  if (page.component_key === "apix-network") {
    return <ApixNetwork title={page.title} />;
  }
  if (page.component_key === "apix-presentation") {
    return <ApixPresentation title={page.title} />;
  }
  if (page.component_key === "apix-group") {
    return <ApixGroup title={page.title} />;
  }
  if (page.component_key === "team-directory") {
    const members = await getTeamMembers();
    return <TeamDirectory title={page.title} members={members} />;
  }
  if (page.component_key === "ai-test-1") {
    return <ReviewQuiz title={page.title} questions={AI_TEST_1} testSet="ai_test_1" />;
  }
  if (page.component_key === "ai-test-2") {
    return <ReviewQuiz title={page.title} questions={AI_TEST_2} testSet="ai_test_2" />;
  }
  if (page.component_key === "ai-test-3") {
    return <ReviewQuiz title={page.title} questions={AI_TEST_3} testSet="ai_test_3" />;
  }
  // /gold-set parent index: links to the three relocated AI TEST pages
  // (/gold-set/ai-test-{1,2,3}). hidden_in_sidebar=true; noindex via NOINDEX_PATHS.
  if (page.component_key === "gold-set") {
    return <GoldSetIndex title={page.title} />;
  }
  return <HardcodedStub title={page.title} componentKey={page.component_key} />;
}

function renderHardcodedEmbedded(componentKey: string, title: string) {
  if (componentKey === "apix-workflow") return <ApixWorkflow title={title} embedded />;
  if (componentKey === "apix-network") return <ApixNetwork title={title} embedded />;
  if (componentKey === "apix-presentation") return <ApixPresentation title={title} embedded />;
  if (componentKey === "apix-group") return <ApixGroup title={title} embedded />;
  if (componentKey === "email-signature") return <EmailSignature title={title} embedded />;
  return <HardcodedStub title={title} componentKey={componentKey} />;
}

function PageHeader({ page }: { page: PageRow }) {
  return (
    <header className="page-hero">
      {/* Index number (page.number) intentionally not shown — data kept, display
          removed. Title only. .page-hero-inner re-centers the title to the same
          1400px measure as .main-inner so the band is full-bleed but the text
          stays aligned with the page body below. */}
      <div className="page-hero-inner">
        <h1>{page.title}</h1>
      </div>
    </header>
  );
}
