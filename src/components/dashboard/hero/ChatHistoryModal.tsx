"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, Search } from "lucide-react";
import { loadMyChats } from "@/app/(public)/actions";
import "./chat-history-modal.css";

/* Command-palette-style search over the caller's own AI chats (BAU §5, Etappe
 * B.1). Opens from the chat-header clock icon. Lists every own chat grouped by
 * recency, with a search box that matches BOTH the title and the message
 * content. Portaled to <body>, focus-trapped, Esc/backdrop close — the same
 * shell convention as ConfirmDialog (kept separate, not imported).
 *
 * SCOPE: B.1 is display + search + close only. Clicking an item just closes the
 * modal (onSelect is a placeholder); actually restoring an old chat into the
 * active thread is B.2 (ChatMessageItem[] → AiTurn[] state replace). */

// The action's return shape, derived so this client file never imports the
// server-only users.ts module.
type ChatSession = Awaited<ReturnType<typeof loadMyChats>>[number];

const HOUR = 3600e3;
const DAY = 24 * HOUR;
const BUCKETS: { key: string; label: string; max: number }[] = [
  { key: "hour", label: "Letzte Stunde", max: HOUR },
  { key: "today", label: "Heute", max: DAY },
  { key: "week", label: "Letzte Woche", max: 7 * DAY },
  { key: "month", label: "Letzter Monat", max: 30 * DAY },
  { key: "older", label: "Älter", max: Infinity },
];

/** Relative time without a date library (German, matches the header meta).
 *  `now` is passed in (captured at load) so it isn't an impure render call. */
function relativeTime(iso: string, now: number): string {
  const diff = now - new Date(iso).getTime();
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 60) return "gerade eben";
  const m = Math.floor(s / 60);
  if (m < 60) return `vor ${m} Min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} Std`;
  const d = Math.floor(h / 24);
  if (d === 1) return "gestern";
  if (d < 7) return `vor ${d} Tagen`;
  const w = Math.floor(d / 7);
  if (d < 30) return w === 1 ? "letzte Woche" : `vor ${w} Wochen`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return mo === 1 ? "letzter Monat" : `vor ${mo} Monaten`;
  const y = Math.floor(d / 365);
  return y === 1 ? "letztes Jahr" : `vor ${y} Jahren`;
}

/** Display + match title: explicit title → first user message → fallback. */
function sessionTitle(s: ChatSession): string {
  const t = s.title?.trim();
  if (t) return t;
  const firstUser = s.messages.find((m) => m.role === "user");
  return firstUser?.content.trim() || "Unbenannter Chat";
}

export function ChatHistoryModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  /** B.2 placeholder — unused in B.1 (item click only closes the modal). */
  onSelect?: (sessionId: string) => void;
}) {
  const [chats, setChats] = useState<ChatSession[] | null>(null); // null = loading
  const [query, setQuery] = useState("");
  // Reference "now" captured at load time (in the async callback, not during
  // render) so recency grouping + relative times stay pure/idempotent.
  const [now, setNow] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load once per open. The modal is mounted fresh each open (parent gates with
  // `historyOpen &&`), so initial state is already null/empty — no synchronous
  // reset needed. setState happens only in the async resolution.
  useEffect(() => {
    if (!open) return;
    let active = true;
    loadMyChats()
      .then((res) => { if (active) { setChats(res); setNow(Date.now()); } })
      .catch(() => { if (active) { setChats([]); setNow(Date.now()); } });
    return () => { active = false; };
  }, [open]);

  // Autofocus the search box on open.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Esc to close + focus trap (same shape as ConfirmDialog).
  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  // Filter (title OR message content) + group by recency.
  const groups = useMemo(() => {
    if (!chats) return [];
    const q = query.trim().toLowerCase();
    const matched = q === ""
      ? chats
      : chats.filter(
          (s) =>
            sessionTitle(s).toLowerCase().includes(q) ||
            s.messages.some((m) => m.content.toLowerCase().includes(q))
        );
    const out = BUCKETS.map((b) => ({ key: b.key, label: b.label, items: [] as ChatSession[] }));
    for (const s of matched) {
      const age = now - new Date(s.createdAt).getTime();
      let bi = BUCKETS.findIndex((b) => age < b.max);
      if (bi === -1) bi = BUCKETS.length - 1;
      out[bi].items.push(s);
    }
    return out.filter((b) => b.items.length > 0);
  }, [chats, query, now]);

  if (!open || typeof document === "undefined") return null;

  const hasAny = !!chats && chats.length > 0;
  const noMatch = hasAny && groups.length === 0;

  return createPortal(
    <div className="chm-backdrop" onClick={onClose}>
      <div
        className="chm-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Chat history"
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="chm-search">
          <Search className="chm-search-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            className="chm-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chats durchsuchen…"
            aria-label="Search chats"
          />
        </div>

        <div className="chm-list">
          {chats === null ? (
            <div className="chm-loading">Chats werden geladen…</div>
          ) : !hasAny ? (
            <div className="chm-empty">Noch keine Chats</div>
          ) : noMatch ? (
            <div className="chm-empty">Kein Treffer für „{query.trim()}“</div>
          ) : (
            groups.map((g) => (
              <div key={g.key} className="chm-group">
                <div className="chm-group-label">{g.label}</div>
                {g.items.map((s) => (
                  <button
                    key={s.sessionId}
                    type="button"
                    className="chm-item"
                    onClick={() => {
                      onSelect?.(s.sessionId); // B.2 will load the chat; B.1 no-op
                      onClose();
                    }}
                  >
                    <MessageCircle className="chm-item-icon" aria-hidden="true" />
                    <span className="chm-item-title">{sessionTitle(s)}</span>
                    <span className="chm-item-time">{relativeTime(s.createdAt, now)}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
