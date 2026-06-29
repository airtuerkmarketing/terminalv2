"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, Search, SearchX } from "lucide-react";
import { loadMyChats } from "@/app/(public)/actions";
import "./chat-history-modal.css";

/* Command-palette over the caller's own AI chats (BAU §5, Etappe B). Opens from
 * the chat-header clock icon: every own chat grouped by recency, a search box
 * matching BOTH title and message content, ↑/↓/Enter keyboard nav, match
 * highlight. Portaled to <body>, focus-trapped, Esc/backdrop close (same shell
 * convention as ConfirmDialog, kept separate). onSelect opens a chat — the parent
 * decides whether to close (a confirm step may keep the modal open). */

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

/** Accent-highlight the first occurrence of `q` (already lowercased) in `text`.
 *  Real JSX splitting — no dangerouslySetInnerHTML. */
function highlightMatch(text: string, q: string): ReactNode {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="chm-mark">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export function ChatHistoryModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  /** Open a chat. The parent decides whether to close the modal (a confirm step
   *  may keep it open), so this no longer closes the modal itself. */
  onSelect?: (session: ChatSession) => void;
}) {
  const [chats, setChats] = useState<ChatSession[] | null>(null); // null = loading
  const [query, setQuery] = useState("");
  // Reference "now" captured at load time (in the async callback, not during
  // render) so recency grouping + relative times stay pure/idempotent.
  const [now, setNow] = useState(0);
  // Keyboard-nav cursor over the FLAT (cross-group) order.
  const [activeIdx, setActiveIdx] = useState(0);
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

  // Esc to close + focus trap (same shape as ConfirmDialog). Arrow/Enter nav is
  // handled on the input (where focus lives) so it doesn't fight this.
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

  const q = query.trim().toLowerCase();

  // Filter (title OR message content) + group by recency.
  const groups = useMemo(() => {
    if (!chats) return [];
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
  }, [chats, q, now]);

  // Flat, cross-group order — arrow nav runs over THIS so ↓ crosses group edges.
  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const clampedIdx = Math.min(activeIdx, Math.max(0, flatItems.length - 1));

  // Keep the active row in view as the cursor moves (block:nearest = calm scroll).
  useEffect(() => {
    dialogRef.current?.querySelector(".chm-item--active")?.scrollIntoView({ block: "nearest" });
  }, [clampedIdx]);

  if (!open || typeof document === "undefined") return null;

  const hasAny = !!chats && chats.length > 0;
  const noMatch = hasAny && groups.length === 0;

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const sel = flatItems[clampedIdx];
      if (sel) onSelect?.(sel);
    }
  }

  // Running index across groups so the visual marker matches the flat nav index.
  let runningIdx = -1;

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
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
            onKeyDown={onInputKeyDown}
            placeholder="Chats durchsuchen…"
            aria-label="Search chats"
          />
        </div>

        <div className="chm-list">
          {chats === null ? (
            <div className="chm-loading">Chats werden geladen…</div>
          ) : !hasAny ? (
            <div className="chm-empty">
              Noch keine Chats
              <span className="chm-empty-sub">Deine Unterhaltungen erscheinen hier.</span>
            </div>
          ) : noMatch ? (
            <div className="chm-empty">
              <SearchX className="chm-empty-icon" aria-hidden="true" />
              Kein Treffer für „{query.trim()}“
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.key} className="chm-group">
                <div className="chm-group-label">{g.label}</div>
                {g.items.map((s) => {
                  runningIdx++;
                  const i = runningIdx;
                  const isActive = i === clampedIdx;
                  const title = sessionTitle(s);
                  const contentOnly = q !== "" && !title.toLowerCase().includes(q);
                  return (
                    <button
                      key={s.sessionId}
                      type="button"
                      className={`chm-item${isActive ? " chm-item--active" : ""}`}
                      onClick={() => onSelect?.(s)}
                      onMouseEnter={() => setActiveIdx(i)}
                    >
                      <MessageCircle className="chm-item-icon" aria-hidden="true" />
                      <span className="chm-item-main">
                        <span className="chm-item-title">{highlightMatch(title, q)}</span>
                        {contentOnly && <span className="chm-item-hint">Treffer im Verlauf</span>}
                      </span>
                      <span className="chm-item-time">{relativeTime(s.createdAt, now)}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
