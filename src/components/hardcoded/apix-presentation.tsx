"use client";

import { useEffect, useRef, useState } from "react";
import "@/styles/apix-presentation.css";

/**
 * APIX Presentation player (Phase 4, Task 10b). Third APIX tool.
 *
 * Ported from the recovered embed, reusing the locked pattern (Workflow
 * dc53a50, Map c5390d1):
 *   • The deck is rendered by the LIVE Office-Online viewer inside an <iframe>
 *     pointing at the exact SharePoint URL — this is the feature (animations
 *     render server-side), the ONE intentional external request, not a
 *     migratable asset. Kept verbatim.
 *   • No new runtime deps: the original's ~20 lines of vanilla fullscreen JS is
 *     ported to React (native Fullscreen API + a fixed-overlay fallback for
 *     browsers without it + Escape + aria-pressed). Icons are inline SVG.
 *   • Fonts app-native: the original's 'General Sans' is dropped; inherits
 *     var(--font). Chrome follows theme tokens; the iframe stage is unchanged.
 *
 * SSR-safe: `document`/Fullscreen API are touched only in event handlers and
 * effects (never at module scope or during render), and the initial state
 * (pressed/fsfix = false) matches the server HTML, so there is no hydration
 * mismatch.
 */

// Live SharePoint/Office-Online embed viewer — INTENTIONAL external embed.
const DECK_SRC =
  "https://aerticket-my.sharepoint.com/personal/bdemir_airtuerk_de/_layouts/15/Doc.aspx?sourcedoc={569fe19c-0ebd-47ce-966a-d1ac028777dc}&action=embedview&wdAr=1.7777777777777777";

export function ApixPresentation({ title, embedded }: { title: string; embedded?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [pressed, setPressed] = useState(false); // aria-pressed (fullscreen active)
  const [fsfix, setFsfix] = useState(false); // fixed-overlay fallback active

  function toggleFullscreen() {
    const root = rootRef.current;
    if (!root) return;
    if (root.requestFullscreen) {
      // Prefer the native Fullscreen API; `fullscreenchange` updates `pressed`.
      if (document.fullscreenElement) document.exitFullscreen();
      else root.requestFullscreen();
    } else {
      // Fallback: fixed-position overlay (iOS Safari etc.).
      const on = !fsfix;
      setFsfix(on);
      setPressed(on);
      document.body.style.overflow = on ? "hidden" : "";
    }
  }

  useEffect(() => {
    const onFs = () => setPressed(!!document.fullscreenElement);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fsfix) {
        setFsfix(false);
        setPressed(false);
        document.body.style.overflow = "";
      }
    };
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("keydown", onKey);
    };
  }, [fsfix]);

  // Safety: clear any leftover body scroll-lock on unmount.
  useEffect(() => () => { document.body.style.overflow = ""; }, []);

  return (
    <section className="apix-pres">
      {!embedded && (
        <header className="apix-pres-head">
          <div className="eyebrow">airtuerk APIX</div>
          <h1>{title}</h1>
        </header>
      )}

      <div className={`ppx-wrap${fsfix ? " ppx-fsfix" : ""}`} id="ppx-root" ref={rootRef}>
        <div className="ppx-bar">
          <div>
            <h3 className="ppx-title">APIX Presentation</h3>
            <p className="ppx-sub">Use the arrows inside the player · press the button for fullscreen</p>
          </div>
          <button className="ppx-btn" id="ppx-fs" type="button" aria-pressed={pressed} title="Fullscreen" onClick={toggleFullscreen}>
            <svg className="ic-on" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
            <svg className="ic-off" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></svg>
            <span className="t-on">Fullscreen</span><span className="t-off">Exit</span>
          </button>
        </div>

        <div className="ppx-stage">
          <iframe
            id="ppx-frame"
            src={DECK_SRC}
            allowFullScreen
            title="APIX Presentation — PowerPoint Viewer"
            loading="lazy"
          >
            {/* iframe fallback is shown only by user agents that can't render
                iframes (effectively none). Kept as a single static string — no
                {" "} whitespace expressions or nested elements, which under
                React 19 hydrate as separate text nodes and mismatch (M4). */}
            This is an embedded Microsoft Office presentation, powered by Office.
          </iframe>
        </div>
      </div>
    </section>
  );
}
