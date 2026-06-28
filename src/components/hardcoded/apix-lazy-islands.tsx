"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Lazy islands for the four heavy APIX tools (Phase 2 perf refactor).
 *
 * The tools (d3 world map, Leaflet org map, drag-diagram, SharePoint iframe) are
 * all `"use client"` and were previously STATIC-imported into the server renderer
 * page-view.tsx, so d3 + topojson + the 108KB atlas + leaflet css + all four
 * engines shipped in the route's initial JS and hydrated eagerly — even though
 * three of the four sit below the fold on /airtuerk-apix (audit PIPE-01/02,
 * NET-02, GRP-01, PRES-04).
 *
 * Each tool is now:
 *   • next/dynamic({ ssr:false }) — its own chunk, fetched only when mounted.
 *   • viewport-gated by <InView> — the chunk is requested only when the section
 *     scrolls near the viewport (rootMargin pre-load), so the initial page does
 *     not pay for any tool the visitor never scrolls to.
 *
 * What ssr:false trades (be precise — this is NOT a pure no-op):
 *   • The imperative engines (d3 map, Leaflet map, SVG connector lines) genuinely
 *     render nothing on the server — they build their DOM in useEffect — so for
 *     them nothing is lost.
 *   • BUT each tool also renders DECLARATIVE JSX: the standalone <header><h1>
 *     {title}</h1> + eyebrow, the toolbar headings/labels, and — most concretely —
 *     apix-presentation's <iframe src={DECK_SRC}> (the SharePoint deck). Under
 *     ssr:false this static shell is ALSO client-only: the server HTML for each
 *     section is just the <div aria-hidden> placeholder, and the shell + deck
 *     iframe appear only after JS loads, the section scrolls within rootMargin,
 *     and the chunk parses.
 *   • So the FINAL hydrated DOM is byte-identical to the old static mount, but the
 *     SERVER-RENDERED / initial-paint / no-JS / crawler HTML is intentionally
 *     different. Accepted because /airtuerk-apix is login-gated and JS-required
 *     and these tools sit below the fold (the deck even kept loading="lazy").
 *     If SSR-visible titles or an eagerly-loading deck ever matter, render the
 *     static <header>/title from page-view (server) and gate only the engine.
 *
 * DOM contract: <InView> renders a min-height placeholder until shown, then swaps
 * in the children. Once shown it returns the tool's own root <section> DIRECTLY
 * (no persistent wrapper element), so the hydrated hierarchy is byte-identical to
 * the previous static mount — the audit's "do not change structure" constraint.
 */

type ToolProps = { title: string; embedded?: boolean };

/**
 * Mounts `children` only once the placeholder scrolls within `rootMargin` of the
 * viewport; before that it reserves `minHeight` to limit layout shift. SSR/first
 * client render is always the placeholder (shown=false), so hydration matches and
 * the ssr:false tool never participates in hydration.
 */
function InView({ minHeight, children }: { minHeight: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (shown) return;
    const el = ref.current;
    if (!el) return;
    // No IO (old browsers / SSR-less env): mount immediately rather than never.
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  if (shown) return <>{children}</>;
  return <div ref={ref} aria-hidden style={{ minHeight }} />;
}

// Per-tool dynamic chunks. The `loading` placeholder covers the brief gap between
// "scrolled into view" and "chunk parsed"; it mirrors InView's reserved height.
const reserve = (minHeight: number) =>
  function Reserve() {
    return <div aria-hidden style={{ minHeight }} />;
  };

const ApixWorkflowInner = dynamic(
  () => import("@/components/hardcoded/apix-workflow").then((m) => m.ApixWorkflow),
  { ssr: false, loading: reserve(640) },
);
const ApixNetworkInner = dynamic(
  () => import("@/components/hardcoded/apix-network").then((m) => m.ApixNetwork),
  { ssr: false, loading: reserve(720) },
);
const ApixPresentationInner = dynamic(
  () => import("@/components/hardcoded/apix-presentation").then((m) => m.ApixPresentation),
  { ssr: false, loading: reserve(560) },
);
const ApixGroupInner = dynamic(
  () => import("@/components/hardcoded/apix-group").then((m) => m.ApixGroup),
  { ssr: false, loading: reserve(640) },
);

export function LazyApixWorkflow(props: ToolProps) {
  return (
    <InView minHeight={640}>
      <ApixWorkflowInner {...props} />
    </InView>
  );
}
export function LazyApixNetwork(props: ToolProps) {
  return (
    <InView minHeight={720}>
      <ApixNetworkInner {...props} />
    </InView>
  );
}
export function LazyApixPresentation(props: ToolProps) {
  return (
    <InView minHeight={560}>
      <ApixPresentationInner {...props} />
    </InView>
  );
}
export function LazyApixGroup(props: ToolProps) {
  return (
    <InView minHeight={640}>
      <ApixGroupInner {...props} />
    </InView>
  );
}
