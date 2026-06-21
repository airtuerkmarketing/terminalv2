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

const IBE_PATH = "/ibe-product-suite";

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
  if (page.rendering_mode === "hardcoded") {
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

  const blocks = await getBlocks(page.id);

  // IBE Product Suite keeps its product-brand-driven single page (unchanged path,
  // preserves the spec'd product order). Sections come from the product brands.
  if (fullPath === IBE_PATH) {
    const products = await getIbeProducts();
    return (
      <article>
        <PageHeader page={page} />
        {blocks.length > 0 ? <BlockRenderer blocks={blocks} /> : null}
        {products.map((p) => (
          <section key={p.slug} id={p.slug} className="anchor-section">
            <h2>{p.name}</h2>
            <BlockEmptyState />
          </section>
        ))}
      </article>
    );
  }

  // Single-page brand parent: parent's own blocks (hero) first, then each child
  // page as an in-page anchor <section>. Block children get a BlockRenderer;
  // hardcoded children (APIX tools, email-signature, …) get their component
  // with embedded=true so the component suppresses its own standalone header.
  if (segments.length === 1 && singlePageSlugs.has(segments[0])) {
    const sections = await getBrandSectionsAll(page.id);
    return (
      <article>
        <PageHeader page={page} />
        {blocks.length > 0 ? <BlockRenderer blocks={blocks} /> : null}
        {sections.map((s) => (
          <section key={s.slug} id={s.slug} className="anchor-section">
            {s.rendering_mode === "hardcoded" ? (
              renderHardcodedEmbedded(s.component_key, s.title)
            ) : (
              <>
                <h2>{s.title}</h2>
                {s.blocks.length > 0 ? <BlockRenderer blocks={s.blocks} /> : <BlockEmptyState />}
              </>
            )}
          </section>
        ))}
      </article>
    );
  }

  // Block-driven page. If blocks exist, render them (they carry their own hero);
  // otherwise show a title header + a clean empty state.
  return (
    <article>
      {blocks.length > 0 ? (
        <BlockRenderer blocks={blocks} />
      ) : (
        <>
          <PageHeader page={page} />
          <BlockEmptyState />
        </>
      )}
    </article>
  );
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
      <div className="eyebrow">
        {page.number != null ? (
          <span className="num">{String(page.number).padStart(2, "0")}</span>
        ) : (
          "Page"
        )}
      </div>
      <h1>{page.title}</h1>
    </header>
  );
}
