// Relative import (not the @/ alias) so this module is also importable from
// next.config.ts (whose loader doesn't resolve the app's path alias).
import {
  LIBRARY_ROUTE_PREFIXES,
  THEME_STORAGE_KEY,
  SIDEBAR_STORAGE_KEY,
} from "../config/navigation";

// Library-route check generated from the shared prefix list (HC-01 — no drift).
const LIBRARY_PREFIX_CHECK = LIBRARY_ROUTE_PREFIXES.map(
  (p) => `p===${JSON.stringify(p)}||p.indexOf(${JSON.stringify(`${p}/`)})===0`,
).join("||");

/**
 * Pre-paint prefs script: applies the persisted theme + sidebar-collapse state
 * (and pre-collapses the rail on library routes) BEFORE first paint to avoid a
 * flash. Injected inline by the public layout via dangerouslySetInnerHTML.
 *
 * Single source of truth so next.config.ts can SHA-256 the exact same string for
 * the CSP `script-src` allowlist (SEC-03) — keeping the hash build-derived, never
 * hand-coded.
 */
export const PREFS_SCRIPT = `(function(){try{var d=document.documentElement;var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==='ios18-light'||t==='ios18-dark')d.dataset.theme=t;var s=localStorage.getItem(${JSON.stringify(SIDEBAR_STORAGE_KEY)});if(s==='expanded'||s==='collapsed')d.dataset.sidebar=s;var p=location.pathname;if(${LIBRARY_PREFIX_CHECK})d.dataset.sidebar='collapsed';}catch(e){}})();`;
