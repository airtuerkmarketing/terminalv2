import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getBlocks,
  getDocumentLibrary,
  getIbeProducts,
  getImageAssets,
  getPageByPath,
  type PageRow,
} from "@/lib/pages";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import { BlockEmptyState } from "@/components/blocks/empty-state";
import { HardcodedStub } from "@/components/blocks/hardcoded-stub";
import { AssetLibrary } from "@/components/hardcoded/asset-library";
import { EmailSignature } from "@/components/hardcoded/email-signature";
import { DocumentLibrary } from "@/components/hardcoded/document-library";

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
    return <HardcodedStub title={page.title} componentKey={page.component_key} />;
  }

  const blocks = await getBlocks(page.id);

  // IBE Product Suite: render the 6 product anchor sections so the sidebar
  // anchor links scroll correctly. Content per product is the empty state for
  // now (Phase 5 authors it); the anchor ids must exist today.
  if (fullPath === IBE_PATH) {
    const products = await getIbeProducts();
    return (
      <article>
        <PageHeader page={page} />
        {blocks.length > 0 ? <BlockRenderer blocks={blocks} /> : null}
        {products.map((p) => (
          <section key={p.slug} id={p.slug} className="ibe-product-section">
            <h2>{p.name}</h2>
            <BlockEmptyState />
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
