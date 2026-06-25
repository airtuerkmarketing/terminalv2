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
  tx: number; // arc offset px (cos θ · 96)
  ty: number; // arc offset px (sin θ · 96, negative = up)
};

// θ from 198° → 342° in 5 steps, R = 96 → a clean upper semicircle.
const ACTIONS: Action[] = [
  { id: "logo",   label: "Logo holen",     href: "#", Icon: Package,      tx: -91, ty: -30 },
  { id: "color",  label: "Farbe kopieren", href: "#", Icon: Palette,      tx: -66, ty: -70 },
  { id: "deck",   label: "Master Deck",    href: "#", Icon: Presentation, tx: -24, ty: -93 },
  { id: "sig",    label: "Signatur",       href: "#", Icon: PenLine,      tx: 24,  ty: -93 },
  { id: "search", label: "Suche",          href: "#", Icon: Search,       tx: 66,  ty: -70 },
  { id: "ki",     label: "KI fragen",      href: "#", Icon: Sparkles,     tx: 91,  ty: -30 },
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
          <li key={a.id} className="rk-item" style={{ "--tx": `${a.tx}px`, "--ty": `${a.ty}px`, transitionDelay: `${i * 35}ms` } as React.CSSProperties}>
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
