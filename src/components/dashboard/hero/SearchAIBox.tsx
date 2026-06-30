"use client";

import "@/styles/dashboard-hero.css";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Plus } from "lucide-react";
import { TerminalLogo } from "@/components/shell/TerminalLogo";
import { ModeChips } from "@/components/dashboard/hero/ModeChips";
import { SearchDropdown, ASK_AI_ID } from "@/components/dashboard/hero/SearchDropdown";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_MODEL_ID,
  LS_HISTORY,
  LS_MODEL,
  MODE_CHIPS,
  type ChatMode,
} from "@/components/dashboard/hero-data";
import type {
  AiSource,
  AiTurn,
  SearchHit,
  SearchResults,
} from "@/lib/search/types";
import {
  ragQueryStream,
  fetchMessageSources,
  ragToAiSource,
  inferKonfidenz,
  isOutOfScope,
  renameChatSession,
  messagesToTurns,
} from "@/lib/rag/client";
// Type-only — erased, so the server-only users.ts module isn't bundled here.
import type { ChatSessionItem } from "@/lib/users";

// Chat + correction surfaces are below-the-fold interaction islands: load them as
// separate client chunks (ssr:false) so react-markdown + remark-gfm and the modal
// code stay out of the dashboard's initial JS bundle (CM-01 / PERF-04). AIChatWindow
// stays mounted (open-controlled, preserves its close animation); CorrectionModal
// mounts on demand. loading:()=>null — no placeholder, no layout shift.
const AIChatWindow = dynamic(
  () => import("@/components/dashboard/hero/AIChatWindow").then((m) => m.AIChatWindow),
  { ssr: false, loading: () => null }
);
const CorrectionModal = dynamic(
  () => import("@/components/dashboard/hero/CorrectionModal").then((m) => m.CorrectionModal),
  { ssr: false, loading: () => null }
);

/* Such+KI-Box (BAU-Auftrag §5) — orchestrates search mode (live dropdown over
 * /api/search) and KI-Modus (UI-only placeholder answers). Stage 1: no real RAG
 * — the AI answer is faked after 1.5s in the DATA_CONTRACT shape; history +
 * model live in localStorage (no login, no Supabase persistence). */

type Mode = "search" | "ai";

const EMPTY_RESULTS: SearchResults = {
  pages: [],
  documents: [],
  assets: [],
  brands: [],
};

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `t_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

// Rounded-rect outline as an SVG path, STARTING at the top-centre and running once
// clockwise back to it — so the glow stroke grows from near the chips. Inset 1px so
// the 2px stroke sits on the box edge. r is the corner radius (box radius − 1).
function topCenterRoundedRect(w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2 - 1, h / 2 - 1));
  const cx = w / 2;
  return [
    `M ${cx} 1`,
    `H ${w - 1 - rr}`,
    `A ${rr} ${rr} 0 0 1 ${w - 1} ${1 + rr}`,
    `V ${h - 1 - rr}`,
    `A ${rr} ${rr} 0 0 1 ${w - 1 - rr} ${h - 1}`,
    `H ${1 + rr}`,
    `A ${rr} ${rr} 0 0 1 1 ${h - 1 - rr}`,
    `V ${1 + rr}`,
    `A ${rr} ${rr} 0 0 1 ${1 + rr} 1`,
    `H ${cx}`,
  ].join(" ");
}

// #3 explicit-sticky web-search: idle timeout after which the sticky mode self-clears.
const WEB_SEARCH_STICKY_TIMEOUT_MS = 300000;

export function SearchAIBox({ firstName = null }: { firstName?: string | null }) {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [searchLoading, setSearchLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [turns, setTurns] = useState<AiTurn[]>([]);
  const [model, setModel] = useState(DEFAULT_MODEL_ID);
  const [chatOpen, setChatOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  // User-set chat title (optimistic). Overrides the derived first-question title
  // for the lifetime of the session; the rename is persisted to the DB in the
  // background. Re-hydrating the DB title for old chats is a later stage.
  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const [correctTurn, setCorrectTurn] = useState<AiTurn | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode>("default");
  // #3 explicit-sticky web-search: once the web-search button fires, follow-ups stay in
  // web-search mode until the user exits the composer pill or 5 min idle elapses. The state
  // drives the pill; the ref is read inside submitAi (no stale closure / no extra dep).
  const [webSearchSticky, setWebSearchSticky] = useState(false);
  const stickyRef = useRef<{ active: boolean; lastInteractionAt: number }>({
    active: false,
    lastInteractionAt: 0,
  });

  // One browser client for the component's lifetime — used to subscribe to auth
  // state changes (clears the chat on login/logout, see effect below).
  const supabase = useMemo(() => createClient(), []);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const innerBoxRef = useRef<HTMLDivElement>(null);
  const skipPersist = useRef(true);
  // Box pixel size, tracked so the animated glow stroke can trace the exact rounded
  // rect (width is fluid, height grows with the textarea). Visual only.
  const [boxSize, setBoxSize] = useState({ w: 0, h: 0 });
  // Latest turns without re-creating submitAi on every streamed token; used
  // read-only to build conversation_history. All mutations use functional setTurns.
  const turnsRef = useRef(turns);

  const dropdownOpen =
    mode === "search" && focused && query.trim().length >= 2;

  // The armed mode-chip (if any) — drives the placeholder hint + box glow color.
  const activeChip = MODE_CHIPS.find((c) => c.id === chatMode);

  // Track the box size for the animated glow stroke (ResizeObserver, not a render-
  // time read — keeps the rect in sync as the box reflows). setState lives in the
  // observer callback (an event), not the effect body.
  useEffect(() => {
    const el = innerBoxRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      setBoxSize({ w: el.offsetWidth, h: el.offsetHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const flatHits = useMemo<SearchHit[]>(
    () => [
      ...results.pages,
      ...results.documents,
      ...results.assets,
      ...results.brands,
    ],
    [results]
  );

  // ── Load persisted history + model (once) ──
  useEffect(() => {
    try {
      const h = localStorage.getItem(LS_HISTORY);
      if (h) setTurns(JSON.parse(h) as AiTurn[]);
      const m = localStorage.getItem(LS_MODEL);
      if (m) setModel(m);
    } catch {
      /* ignore corrupt/unavailable storage */
    }
  }, []);

  // ── Clear chat on auth state change (security: no PII leak across sessions
  //    on a shared device) ──
  // Wipe terminal_chat_history + reset turns/sessionId on logout, and on a
  // login by a *different* identity. terminal_ki_model is a harmless UI
  // preference and is kept. The lastUserId guard ignores the spurious SIGNED_IN
  // refires (token refresh, tab refocus, initial session restore) so a returning
  // user's own restored history isn't wiped on every page load.
  useEffect(() => {
    const clearChat = () => {
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(LS_HISTORY);
        } catch {
          /* ignore unavailable storage */
        }
      }
      skipPersist.current = true; // don't immediately re-persist the cleared state
      setTurns([]);
      setSessionId(null);
      setTitleOverride(null);
    };

    let lastUserId: string | null | undefined;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const uid = session?.user?.id ?? null;
      if (event === "INITIAL_SESSION") {
        lastUserId = uid; // seed; never clears the restored history
      } else if (event === "SIGNED_OUT") {
        clearChat();
        lastUserId = null;
      } else if (event === "SIGNED_IN") {
        if (lastUserId !== undefined && uid !== lastUserId) clearChat();
        lastUserId = uid;
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // ── Keep turnsRef current (read by submitAi to build conversation history) ──
  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  // ── Persist history (skip first run; skip mid-stream to avoid token-rate writes) ──
  useEffect(() => {
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    if (turns.some((t) => t.isStreaming)) return;
    try {
      localStorage.setItem(LS_HISTORY, JSON.stringify(turns));
    } catch {
      /* ignore */
    }
  }, [turns]);

  // ── Debounced live search (200ms) ──
  useEffect(() => {
    if (mode !== "search") return;
    const qq = query.trim();
    if (qq.length < 2) {
      setResults(EMPTY_RESULTS);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(qq)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`search ${res.status}`);
        const data = (await res.json()) as { results?: SearchResults };
        setResults(data.results ?? EMPTY_RESULTS);
        setActiveId(null);
      } catch {
        if (!ctrl.signal.aborted) setResults(EMPTY_RESULTS);
      } finally {
        if (!ctrl.signal.aborted) setSearchLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, mode]);

  // ── Close dropdown on outside click ──
  useEffect(() => {
    if (!focused) return;
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setFocused(false);
        setActiveId(null);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [focused]);

  // ── Auto-grow the textarea with its content: height tracks scrollHeight up to
  //    the CSS max-height (220px), beyond which overflow-y:auto scrolls. Mirrors
  //    the chat-window composer; resets back to min-height when the query clears
  //    (e.g. after send). Hand-rolled — no dependency (minimumReleaseAge policy). ──
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [query]);

  const submitAi = useCallback(
    async (text: string, opts?: { webSearch?: boolean }) => {
      const qq = text.trim();
      if (!qq) return;

      setMode("ai");
      setFocused(false);
      setActiveId(null);
      setChatOpen(true);
      setQuery("");

      // Web search is button-triggered (the rule-7 out-of-scope fallback), not a chip.
      // #3 explicit-sticky: once armed, a plain (no-chip) follow-up stays in web-search
      // mode until the user exits the pill or WEB_SEARCH_STICKY_TIMEOUT_MS idle elapses.
      const explicitWeb = opts?.webSearch === true;
      const now = Date.now();
      const sNow = stickyRef.current;
      const stickyAlive =
        sNow.active && now - sNow.lastInteractionAt < WEB_SEARCH_STICKY_TIMEOUT_MS;
      const webSearch = explicitWeb || (chatMode === "default" && stickyAlive);
      // Consume the armed mode for THIS send, then disarm so the chip de-highlights
      // and the next dashboard query (+ chat-window follow-ups) default to normal RAG.
      const activeMode = webSearch ? "default" : chatMode;
      if (!webSearch && chatMode !== "default") setChatMode("default");
      const requestMode = webSearch ? "web-search" : activeMode;
      // Sticky bookkeeping: enter/refresh on explicit web; an armed chip breaks sticky;
      // a sticky follow-up refreshes the idle timer; an expired sticky clears itself.
      if (explicitWeb) {
        stickyRef.current = { active: true, lastInteractionAt: now };
        setWebSearchSticky(true);
      } else if (chatMode !== "default") {
        if (sNow.active) {
          stickyRef.current = { active: false, lastInteractionAt: 0 };
          setWebSearchSticky(false);
        }
      } else if (stickyAlive) {
        stickyRef.current = { active: true, lastInteractionAt: now };
      } else if (sNow.active) {
        stickyRef.current = { active: false, lastInteractionAt: 0 };
        setWebSearchSticky(false);
      }

      // History from completed prior turns (rag-query keeps the last 10).
      const conversationHistory = turnsRef.current
        .filter((t) => t.answer?.text)
        .flatMap((t) => [
          { role: "user" as const, content: t.question },
          { role: "assistant" as const, content: t.answer!.text },
        ]);

      const turnId = newId();
      setTurns((prev) => [
        ...prev,
        {
          id: turnId,
          question: qq,
          model,
          answer: { text: "", quellen: [], konfidenz: "mittel", weiss_nicht: false },
          isStreaming: true,
          chatMode: activeMode !== "default" ? activeMode : undefined,
          isWebSearch: webSearch || undefined,
        },
      ]);
      const patchTurn = (u: Partial<AiTurn>) =>
        setTurns((prev) => prev.map((t) => (t.id === turnId ? { ...t, ...u } : t)));

      try {
        const result = await ragQueryStream({
          question: qq,
          sessionId: sessionId ?? undefined,
          conversationHistory,
          mode: requestMode,
          onEvent: (e) => {
            if (e.type === "session" && e.sessionId) {
              setSessionId(e.sessionId);
            } else if (e.type === "message" && e.messageId !== undefined) {
              patchTurn({ messageId: e.messageId });
            } else if (e.type === "text" && e.text) {
              // functional setState → no closure-stale accumulation
              setTurns((prev) =>
                prev.map((t) =>
                  t.id === turnId
                    ? { ...t, answer: { ...t.answer!, text: (t.answer?.text ?? "") + e.text } }
                    : t
                )
              );
            } else if (e.type === "done") {
              // Defer isStreaming:false until sources load (atomic finalize below).
              patchTurn({ weissNicht: e.weissNicht ?? false });
            } else if (e.type === "paused") {
              // web-search hit Anthropic's pause_turn (server-tool iteration cap) —
              // mark the turn so AIAnswerBlock renders the explicit paused notice.
              patchTurn({ paused: { reason: e.reason ?? "unknown" } });
            } else if (e.type === "error" && e.error) {
              patchTurn({ isStreaming: false, error: e.error });
            }
          },
        });

        // Sources live on the message row — load before the atomic finalize so
        // text + sources + confidence appear together (no flash-of-empty).
        let quellen: AiSource[] = [];
        if (result.messageId) {
          try {
            quellen = (await fetchMessageSources(result.messageId)).map(ragToAiSource);
          } catch {
            /* lazy-load failure is non-fatal — the answer still renders */
          }
        }
        setTurns((prev) =>
          prev.map((t) => {
            if (t.id !== turnId) return t;
            const txt = t.answer?.text ?? "";
            const weiss = t.weissNicht ?? false;
            const outOfScope = isOutOfScope(txt);
            return {
              ...t,
              isStreaming: false,
              weissNicht: weiss || outOfScope,
              answer: {
                ...t.answer!,
                weiss_nicht: weiss || outOfScope,
                konfidenz: inferKonfidenz(txt, weiss),
                // Hide the always-injected priority-1 sources on out-of-scope refusals.
                quellen: outOfScope ? [] : quellen,
              },
            };
          })
        );
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          patchTurn({ isStreaming: false, error: String(err) });
        }
      }
    },
    [model, sessionId, chatMode]
  );

  const handleFeedbackChange = useCallback(
    (turnId: string, feedback: "helpful" | "not_helpful") => {
      setTurns((prev) => prev.map((t) => (t.id === turnId ? { ...t, feedback } : t)));
    },
    []
  );

  const handleCorrect = useCallback((turn: AiTurn) => {
    if (!turn.messageId) {
      console.warn("Cannot correct turn without messageId");
      return;
    }
    setCorrectTurn(turn);
  }, []);

  // Accept the rule-7 "search the web" offer: mark the refusal turn as handled
  // (hides the button) and fire a fresh web-search turn for the same question.
  const handleWebSearch = useCallback(
    (turn: AiTurn) => {
      setTurns((prev) =>
        prev.map((t) => (t.id === turn.id ? { ...t, webSearchTriggered: true } : t))
      );
      void submitAi(turn.question, { webSearch: true });
    },
    [submitAi]
  );

  // #3: exit the sticky web-search mode (composer pill [exit] click) → back to default.
  const exitWebSearchSticky = useCallback(() => {
    stickyRef.current = { active: false, lastInteractionAt: 0 };
    setWebSearchSticky(false);
  }, []);

  const closeChat = useCallback(() => setChatOpen(false), []);
  // New chat: reset the thread + close the window. Closing fades the panel out
  // (260ms) back to the real homepage SearchAIBox — the same greeting + mode-chips
  // + searchbar (one component, no rebuild/drift), instead of a lookalike empty
  // state inside the panel. sessionId MUST clear too, or the next question would
  // continue the old session. The left chat stays in the DB (history modal).
  const newChat = useCallback(() => {
    setTurns([]);
    setTitleOverride(null);
    setSessionId(null);
    setChatOpen(false);
  }, []);

  // Open a persisted chat: map its DB messages → turns and replace the active
  // thread + session. The data is already loaded in the modal, so it's handed up
  // whole (no second fetch). The persist effect writes the restored turns to
  // localStorage on the next tick, so a reload keeps the opened chat.
  const handleOpenChat = useCallback((session: ChatSessionItem) => {
    setTurns(messagesToTurns(session.messages));
    setSessionId(session.sessionId);
    setTitleOverride(session.title ?? null);
  }, []);

  // Optimistic rename: show the new title immediately, persist in the background,
  // roll back on failure. RLS gates the write (sessions_own_update).
  const handleRename = useCallback(
    async (sid: string, title: string) => {
      const prev = titleOverride;
      setTitleOverride(title);
      try {
        await renameChatSession(sid, title);
      } catch {
        setTitleOverride(prev); // rollback
      }
    },
    [titleOverride],
  );

  const selectHit = useCallback(
    (hit: SearchHit) => {
      setFocused(false);
      setActiveId(null);
      if (/^https?:\/\//.test(hit.href)) {
        window.location.href = hit.href;
      } else {
        router.push(hit.href);
      }
    },
    [router]
  );

  function moveActive(dir: 1 | -1) {
    const ids = [...flatHits.map((h) => h.id), ASK_AI_ID];
    if (ids.length === 0) return;
    const idx = activeId ? ids.indexOf(activeId) : -1;
    const next = (idx + dir + ids.length) % ids.length;
    setActiveId(ids[next]);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (mode === "ai") {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitAi(query);
      }
      return;
    }
    // search mode
    if (!dropdownOpen) {
      if (e.key === "Enter" && !e.shiftKey && query.trim()) {
        e.preventDefault();
        submitAi(query);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveActive(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveActive(-1);
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (activeId && activeId !== ASK_AI_ID) {
        const hit = flatHits.find((h) => h.id === activeId);
        if (hit) selectHit(hit);
        else submitAi(query);
      } else {
        submitAi(query);
      }
    } else if (e.key === "Escape") {
      setFocused(false);
      setActiveId(null);
    }
  }

  function onToggleMode(next: ChatMode) {
    // Toggling a chip arms/disarms a focused KI mode. Arming implies KI mode —
    // the utility prompts always go through rag-query, never the live search.
    setChatMode(next);
    if (next !== "default") {
      setMode("ai");
      setFocused(false);
      setActiveId(null);
    }
    textareaRef.current?.focus();
  }

  // Tidy paste: some source apps (Outlook / webmail / Confluence) emit a blank
  // line after EVERY line on copy ("doubled" newlines). Detect that shape — no
  // single \n between text — and halve it to restore the original spacing;
  // otherwise just trim runs of 3+ newlines to one blank line. Cosmetic only
  // (Mail polieren reformats anyway). No-op when the text is already clean.
  function onPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const raw = e.clipboardData.getData("text");
    if (!raw) return;
    const lf = raw.replace(/\r\n?/g, "\n");
    const doubled = !/[^\n]\n[^\n]/.test(lf) && /\n\n/.test(lf);
    const cleaned = doubled
      ? lf.replace(/\n+/g, (m) => "\n".repeat(Math.max(1, Math.floor(m.length / 2))))
      : lf.replace(/\n{3,}/g, "\n\n");
    if (cleaned === raw) return; // already clean → let the native paste happen
    e.preventDefault();
    const el = e.currentTarget;
    const start = el.selectionStart ?? query.length;
    const end = el.selectionEnd ?? query.length;
    setQuery(query.slice(0, start) + cleaned + query.slice(end));
    const caret = start + cleaned.length;
    requestAnimationFrame(() => {
      try {
        el.setSelectionRange(caret, caret);
      } catch {
        /* element may have unmounted */
      }
    });
  }

  return (
    <div className="ai-stack">
      <ModeChips active={chatMode} onToggle={onToggleMode} />
      <div className="ai-search-wrap" ref={boxRef}>
        <div
          className={`ai-search-box${focused ? " is-focused" : ""}`}
          data-glow={activeChip?.glow}
          ref={innerBoxRef}
        >
          {/* Animated glow outline — grows once around from the top when a mode
              chip is armed. key={glow} re-runs the draw on arm / chip change; it
              unmounts (disappears) when disarmed. Decorative (pointer-events:none). */}
          {activeChip?.glow && boxSize.w > 0 && (
            <svg key={activeChip.glow} className="ai-search-glow-svg" aria-hidden="true">
              <path
                className="ai-search-glow-stroke"
                pathLength={100}
                d={topCenterRoundedRect(boxSize.w, boxSize.h, 24)}
              />
            </svg>
          )}
          <textarea
            ref={textareaRef}
            className="ai-search-textarea"
            rows={2}
            value={query}
            placeholder={
              activeChip?.placeholder ??
              (mode === "ai" ? "Ask the AI…" : "Ask me anything…")
            }
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
          />

          <div className="ai-search-toolbar">
            <div className="ai-search-toolbar-left">
              <button
                type="button"
                className="ai-search-attach"
                disabled
                title="Attachments coming in stage 2"
                aria-label="Attach"
              >
                <Plus className="ai-search-attach-icon" aria-hidden="true" />
              </button>
            </div>

            <div className="ai-search-toolbar-right">
              {/* One Ask-AI button: idle (empty) → dimmed, active (typed) → accent.
                  The DB-results dropdown still appears while typing; this just sends
                  the query to the KI (submitAi). Mark spins once on hover. */}
              <button
                type="button"
                className={`ai-search-askai-btn${query.trim() ? " is-active" : ""}`}
                disabled={!query.trim()}
                onClick={() => submitAi(query)}
                aria-label="Ask AI"
              >
                <TerminalLogo variant="mark" title="" className="ai-search-askai-btn-mark ai-ask-mark" />
                <span>Ask AI</span>
              </button>
            </div>
          </div>
        </div>

        {dropdownOpen && (
          <SearchDropdown
            results={results}
            loading={searchLoading}
            query={query.trim()}
            activeId={activeId}
            onSelect={selectHit}
            onAskAi={() => submitAi(query)}
            onHover={setActiveId}
          />
        )}
      </div>

      <AIChatWindow
        open={chatOpen}
        turns={turns}
        sessionId={sessionId}
        titleOverride={titleOverride}
        onClose={closeChat}
        onSubmit={submitAi}
        onNewChat={newChat}
        onRename={handleRename}
        onOpenChat={handleOpenChat}
        onCorrect={handleCorrect}
        onFeedbackChange={handleFeedbackChange}
        onWebSearch={handleWebSearch}
        webSearchSticky={webSearchSticky}
        onExitWebSearch={exitWebSearchSticky}
        firstName={firstName}
      />

      {correctTurn && correctTurn.messageId && sessionId && (
        <CorrectionModal
          isOpen={true}
          sessionId={sessionId}
          messageId={correctTurn.messageId}
          originalQuestion={correctTurn.question}
          originalAnswer={correctTurn.answer?.text ?? ""}
          onClose={() => setCorrectTurn(null)}
          onSubmitted={() => {
            setCorrectTurn(null);
          }}
        />
      )}
    </div>
  );
}
