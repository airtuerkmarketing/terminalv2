"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  History,
  MoreHorizontal,
  Package,
  Presentation,
  PenLine,
  Search,
  Sparkles,
} from "lucide-react";
import "@/styles/dashboard-radial.css";

/* Portal-wide Quick-Actions radial menu. A draggable FAB (default bottom-centre,
 * desktop only) fans 6 icon-only actions in a FULL circle on hover / click /
 * Alt+Q; Esc closes. The FAB can be dragged anywhere and its position persists
 * in localStorage. z-index 90: above content + sidebar (60) but below the
 * AI-chat window (990/995), modals (1000+), toasts (1050) and APIX fullscreen
 * overlays (99999). */

type Action = {
  id: string;
  label: string; // aria-label + title (icon-only, no visible text)
  href: string; // "#" until wired (search / KI fragen become real routes later)
  Icon: typeof Package;
  tx: number; // i*60° from -90°(top), R=104 → cos·104
  ty: number; // sin·104
};

const ACTIONS: Action[] = [
  { id: "logo",   label: "Get logo",       href: "#", Icon: Package,      tx: 0,   ty: -104 },
  { id: "recent", label: "Recent chats",   href: "#", Icon: History,      tx: 90,  ty: -52 },
  { id: "deck",   label: "Master Deck",    href: "#", Icon: Presentation, tx: 90,  ty: 52 },
  { id: "sig",    label: "Signature",      href: "#", Icon: PenLine,      tx: 0,   ty: 104 },
  { id: "search", label: "Search",         href: "#", Icon: Search,       tx: -90, ty: 52 },
  { id: "ki",     label: "Ask AI",         href: "#", Icon: Sparkles,     tx: -90, ty: -52 },
];

const GRACE_MS = 220;
const DRAG_THRESHOLD = 5; // px before a press counts as a drag (vs a click)
const FAB = 60; // FAB size, for viewport clamping
const STORAGE_KEY = "terminal_radialkit_pos";

type Pos = { x: number; y: number };

function clampToViewport(x: number, y: number): Pos {
  const maxX = (typeof window !== "undefined" ? window.innerWidth : 0) - FAB - 8;
  const maxY = (typeof window !== "undefined" ? window.innerHeight : 0) - FAB - 8;
  return { x: Math.max(8, Math.min(x, maxX)), y: Math.max(8, Math.min(y, maxY)) };
}

export function RadialKit() {
  const [open, setOpen] = useState(false);
  // null → CSS default (bottom-centre); set → fixed left/top. Read from
  // localStorage only in the effect below so SSR + first client render match.
  const [pos, setPos] = useState<Pos | null>(null);
  const [dragging, setDragging] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const hoverLocked = useRef(false); // suppress hover-open right after a drag
  const drag = useRef<{ px: number; py: number; ox: number; oy: number; moved: boolean } | null>(null);

  // Restore persisted position after hydration. Deferred to a rAF callback so
  // SSR + first client render both render the default (null) position — no
  // hydration mismatch — and the state update lands after the first paint.
  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const p = JSON.parse(raw) as Pos;
        if (typeof p?.x === "number" && typeof p?.y === "number") {
          setPos(clampToViewport(p.x, p.y));
        }
      } catch {
        /* localStorage blocked/full or bad JSON → stay on default */
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  const clearTimer = () => {
    if (closeTimer.current !== null) { window.clearTimeout(closeTimer.current); closeTimer.current = null; }
  };
  const openNow = () => {
    if (dragging || drag.current || hoverLocked.current) return;
    clearTimer();
    setOpen(true);
  };
  const closeSoon = () => {
    hoverLocked.current = false; // leaving re-arms hover-open
    clearTimer();
    closeTimer.current = window.setTimeout(() => setOpen(false), GRACE_MS);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.altKey && (e.key === "q" || e.key === "Q")) { e.preventDefault(); setOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => () => clearTimer(), []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const rect = rootRef.current?.getBoundingClientRect();
    drag.current = {
      px: e.clientX,
      py: e.clientY,
      ox: pos?.x ?? rect?.left ?? 0,
      oy: pos?.y ?? rect?.top ?? 0,
      moved: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (!d.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      d.moved = true;
      setDragging(true);
      setOpen(false); // a drag must not leave the menu fanned open
    }
    if (d.moved) setPos(clampToViewport(d.ox + dx, d.oy + dy));
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (d.moved) {
      hoverLocked.current = true; // don't immediately re-open via hover
      setDragging(false);
      setPos((p) => {
        if (p) { try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* ignore */ } }
        return p;
      });
    } else {
      setOpen((o) => !o); // press without movement = click → toggle
    }
    drag.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  }, []);

  const style = pos ? { left: `${pos.x}px`, top: `${pos.y}px`, bottom: "auto", transform: "none" } : undefined;

  return (
    <div
      ref={rootRef}
      className={`rk${open ? " is-open" : ""}${dragging ? " is-dragging" : ""}`}
      style={style}
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
    >
      <div className="rk-ring" aria-hidden="true" />
      <ul className="rk-menu">
        {ACTIONS.map((a, i) => (
          <li key={a.id} className="rk-item" style={{ "--tx": `${a.tx}px`, "--ty": `${a.ty}px`, transitionDelay: `${i * 40}ms` } as React.CSSProperties}>
            <a className="rk-action" href={a.href} aria-label={a.label} title={a.label} tabIndex={open ? 0 : -1}>
              <a.Icon aria-hidden />
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
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <MoreHorizontal aria-hidden />
      </button>
    </div>
  );
}
