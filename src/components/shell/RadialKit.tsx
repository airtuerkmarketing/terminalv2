"use client";

import { useEffect, useRef, useState } from "react";
import {
  Package,
  Palette,
  Plus,
  Presentation,
  PenLine,
  Search,
  Sparkles,
} from "lucide-react";
import "@/styles/dashboard-radial.css";

/* Portal-wide Quick-Actions radial menu. A fixed FAB (bottom-centre, desktop
 * only) fans 6 actions up a semicircle on hover / click / Alt+Q; Esc closes.
 * Mounted once in (public)/layout.tsx (additive). z-index 90: above content +
 * sidebar (60) but below the AI-chat window (990/995), modals (1000+), toasts
 * (1050) and APIX fullscreen overlays (99999). */

type Action = {
  id: string;
  label: string;
  href: string; // "#" where the target is not wired yet (search / KI fragen
  // would later become real routes/actions)
  Icon: typeof Plus;
  side: "l" | "r"; // pill grows outward from the FAB (left half extends left)
  tx: number; // arc offset px (cos θ · 250)
  ty: number; // arc offset px (sin θ · 250, negative = up)
};

// θ from 198° → 342° in 5 steps, R = 250 → a wide upper semicircle. The big
// radius + outward-anchored pills (see CSS) keep the larger items from
// overlapping (min same-side vertical gap ≈ 60px > pill height ≈ 56px).
const ACTIONS: Action[] = [
  { id: "logo",   label: "Logo holen",     href: "#", Icon: Package,      side: "l", tx: -238, ty: -77 },
  { id: "color",  label: "Farbe kopieren", href: "#", Icon: Palette,      side: "l", tx: -171, ty: -182 },
  { id: "deck",   label: "Master Deck",    href: "#", Icon: Presentation, side: "l", tx: -62,  ty: -242 },
  { id: "sig",    label: "Signatur",       href: "#", Icon: PenLine,      side: "r", tx: 62,   ty: -242 },
  { id: "search", label: "Suche",          href: "#", Icon: Search,       side: "r", tx: 171,  ty: -182 },
  { id: "ki",     label: "KI fragen",      href: "#", Icon: Sparkles,     side: "r", tx: 238,  ty: -77 },
];

const GRACE_MS = 220;

export function RadialKit() {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const clearTimer = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const openNow = () => { clearTimer(); setOpen(true); };
  const closeSoon = () => {
    clearTimer();
    closeTimer.current = window.setTimeout(() => setOpen(false), GRACE_MS);
  };

  // Alt+Q toggles, Esc closes. Listener attached once.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.altKey && (e.key === "q" || e.key === "Q")) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => () => clearTimer(), []);

  return (
    <div
      className={`rk${open ? " is-open" : ""}`}
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
    >
      <ul className="rk-menu">
        {ACTIONS.map((a, i) => (
          <li key={a.id} className={`rk-item rk-item--${a.side}`} style={{ "--tx": `${a.tx}px`, "--ty": `${a.ty}px`, transitionDelay: `${i * 35}ms` } as React.CSSProperties}>
            <a className="rk-action" href={a.href} tabIndex={open ? 0 : -1}>
              <span className="rk-coin"><a.Icon aria-hidden /></span>
              <span className="rk-label">{a.label}</span>
            </a>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="rk-fab"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Quick Actions"
        onClick={() => setOpen((o) => !o)}
      >
        <Plus aria-hidden />
      </button>
    </div>
  );
}
