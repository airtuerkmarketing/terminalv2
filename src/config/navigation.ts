/**
 * Navigation / route configuration — single source of truth.
 *
 * Client-safe (no `server-only`): consumed by both the server layout
 * (src/app/(public)/layout.tsx) and the client sidebar
 * (src/components/shell/sidebar.tsx), plus the server query layer (src/lib/pages.ts).
 * Extracted in the Phase D audit to remove the documented "keep in lock-step"
 * double sources of truth (HC-01).
 */

/** Brand slug whose product children render as anchor sub-nav (kept multi-page,
 *  excluded from the single-page brand model). */
export const IBE_SLUG = "ibe-product-suite";

/**
 * IBE products kept in the DB but permanently hidden from the sidebar (D-043).
 * pages.hidden_in_sidebar is the runtime source of truth, but those product
 * pages are still drafts (anon RLS can't read the flag yet), so this guarantees
 * the locked decision.
 */
export const SPEC_HIDDEN_PRODUCT_SLUGS: readonly string[] = ["airlounge"];

/**
 * Routes that render their OWN secondary sidebar (Document Library, Presentation
 * Hub). On these the global rail auto-collapses and hides its duplicate node.
 * Used by BOTH the sidebar's `isLibraryRoute` AND the layout's pre-paint script
 * (which previously inlined a hand-kept copy of this list).
 */
export const LIBRARY_ROUTE_PREFIXES: readonly string[] = ["/documents-library", "/presentation-hub"];

/** localStorage keys read by the pre-paint prefs script and the sidebar. */
export const THEME_STORAGE_KEY = "terminalv2-theme";
export const SIDEBAR_STORAGE_KEY = "terminalv2-sidebar";
