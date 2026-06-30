"use client";

import { useCallback, useRef, useState } from "react";
import TerminalMark from "./terminal-mark";

// State B copy (decorative — the accessible brand name is the visible "terminal"
// text in State A, so the overlay is aria-hidden).
const TAGLINE = "Internal brand portal and knowledge hub for airtuerk";

/**
 * Login brand panel with an Aceternity-Compare-style hover effect (hand-rolled,
 * zero deps):
 *   • State A (default): the existing logo lockup + faint watermark, unchanged.
 *   • State B (hover): an opaque overlay carrying the tagline is wiped in from the
 *     top by a 1px slider line that tracks the pointer's Y position, progressively
 *     covering ("wiping away") the logo to reveal the tagline.
 *
 * The wipe is driven by a single CSS custom property `--clip-y` (0–100%) set from
 * the pointer; all visuals live in login.css. Tracking eases at 120ms; the
 * hover-leave snap-back (clip-y → 0) eases at 400ms. The whole interaction is
 * gated to `(hover: hover) and (pointer: fine)` in CSS, so touch/coarse pointers
 * only ever see State A; `prefers-reduced-motion` swaps the wipe for a 200ms
 * opacity crossfade with no slider.
 */
export default function AuthBrand() {
  const ref = useRef<HTMLElement>(null);
  const [clipY, setClipY] = useState(0);
  const [hovering, setHovering] = useState(false);

  const track = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.height === 0) return;
    const pct = ((e.clientY - rect.top) / rect.height) * 100;
    setClipY(Math.max(0, Math.min(100, pct)));
  }, []);

  return (
    <aside
      ref={ref}
      className={`auth-brand${hovering ? " is-hovering" : ""}`}
      style={{ "--clip-y": `${clipY}%` } as React.CSSProperties}
      onMouseEnter={(e) => {
        setHovering(true);
        track(e);
      }}
      onMouseMove={track}
      onMouseLeave={() => {
        setHovering(false);
        setClipY(0);
      }}
    >
      {/* State A — unchanged from the previous inline markup */}
      <TerminalMark className="auth-brand-watermark" />
      <div className="auth-brand-lockup">
        <TerminalMark animated className="auth-brand-icon" />
        <span className="auth-logo-text">terminal</span>
      </div>

      {/* State B — tagline reveal (decorative) */}
      <div className="auth-brand-reveal" aria-hidden="true">
        <span className="auth-brand-tagline">{TAGLINE}</span>
      </div>

      {/* Slider line + grabber dot */}
      <div className="auth-brand-slider" aria-hidden="true">
        <span className="auth-brand-grabber" />
      </div>
    </aside>
  );
}
