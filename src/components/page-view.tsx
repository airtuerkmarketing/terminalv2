import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  getBlocks,
  getBrandSections,
  getDocumentLibrary,
  getIbeProducts,
  getImageAssets,
  getPageByPath,
  getSinglePageBrandSlugs,
  type PageRow,
} from "@/lib/pages";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import { BlockEmptyState } from "@/components/blocks/empty-state";
import { HardcodedStub } from "@/components/blocks/hardcoded-stub";
import { AssetLibrary } from "@/components/hardcoded/asset-library";
import { EmailSignature } from "@/components/hardcoded/email-signature";
import { DocumentLibrary } from "@/components/hardcoded/document-library";
import { ApixWorkflow } from "@/components/hardcoded/apix-workflow";
import { ApixNetwork } from "@/components/hardcoded/apix-network";
import { ApixPresentation } from "@/components/hardcoded/apix-presentation";

const IBE_PATH = "/ibe-product-suite";

/** Build <head> metadata from the page row. */
export async function pageMetadata(fullPath: string): Promise<Metadata> {
  const page = await getPageByPath(fullPath);
  if (!page) return { title: "terminalv2" };
  return {
    title: `${page.meta_title ?? page.title} · terminalv2`,
    description: page.meta_description ?? undefined,
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

  // Hardcoded routes → the real component by component_key; others still stub
  // (built in later Task 5 sub-tasks).
  if (page.rendering_mode === "hardcoded") {
    if (page.component_key === "asset-library") {
      const assets = await getImageAssets();
      return <AssetLibrary title={page.title} assets={assets} />;
    }
    if (page.component_key === "email-signature") {
      return <EmailSignature title={page.title} />;
    }
    if (page.component_key === "document-library") {
      const docData = await getDocumentLibrary();
      return <DocumentLibrary title={page.title} data={docData} />;
    }
    if (page.component_key === "apix-workflow") {
      return <ApixWorkflow title={page.title} />;
    }
    if (page.component_key === "apix-network") {
      return <ApixNetwork title={page.title} />;
    }
    if (page.component_key === "apix-presentation") {
      return <ApixPresentation title={page.title} />;
    }
    return <HardcodedStub title={page.title} componentKey={page.component_key} />;
  }

  // Single-page brands (Task 6): a block-mode child of a single-page brand is not
  // its own route — redirect it to the parent's in-page anchor. Hardcoded children
  // (email-signature, …) returned above; IBE + APIX are excluded from the set.
  const singlePageSlugs = await getSinglePageBrandSlugs();
  const segments = fullPath.split("/").filter(Boolean);
  if (
    segments.length === 2 &&
    page.parent_id &&
    page.rendering_mode === "blocks" &&
    singlePageSlugs.has(segments[0])
  ) {
    redirect(`/${segments[0]}#${page.slug}`);
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

  // Single-page brand parent (Task 6): parent's own blocks (hero) first, then each
  // block-mode child page as an in-page anchor <section>. Empty-state where a
  // section has no blocks yet (expected — no content authored).
  if (segments.length === 1 && singlePageSlugs.has(segments[0])) {
    const sections = await getBrandSections(page.id);
    return (
      <article>
        <PageHeader page={page} />
        {blocks.length > 0 ? <BlockRenderer blocks={blocks} /> : null}
        {sections.map((s) => (
          <section key={s.slug} id={s.slug} className="anchor-section">
            <h2>{s.title}</h2>
            {s.blocks.length > 0 ? <BlockRenderer blocks={s.blocks} /> : <BlockEmptyState />}
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
