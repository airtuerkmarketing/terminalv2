"use client";

import "@/styles/dashboard-hero.css";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Paperclip } from "lucide-react";
import { TerminalLogo } from "@/components/shell/TerminalLogo";
import { ModelSelector } from "@/components/dashboard/hero/ModelSelector";
import { QuickChips } from "@/components/dashboard/hero/QuickChips";
import { SearchDropdown, ASK_AI_ID } from "@/components/dashboard/hero/SearchDropdown";
import { AIChatWindow } from "@/components/dashboard/hero/AIChatWindow";
import { CorrectionModal } from "@/components/dashboard/hero/CorrectionModal";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_MODEL_ID,
  LS_HISTORY,
  LS_MODEL,
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
} from "@/lib/rag/client";

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

export function SearchAIBox() {
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
  const [correctTurn, setCorrectTurn] = useState<AiTurn | null>(null);

  // One browser client for the component's lifetime — used to subscribe to auth
  // state changes (clears the chat on login/logout, see effect below).
  const supabase = useMemo(() => createClient(), []);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const skipPersist = useRef(true);
  // Latest turns without re-creating submitAi on every streamed token; used
  // read-only to build conversation_history. All mutations use functional setTurns.
  const turnsRef = useRef(turns);

  const dropdownOpen =
    mode === "search" && focused && query.trim().length >= 2;

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

  const submitAi = useCallback(
    async (text: string) => {
      const qq = text.trim();
      if (!qq) return;

      setMode("ai");
      setFocused(false);
      setActiveId(null);
      setChatOpen(true);
      setQuery("");

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
        },
      ]);
      const patchTurn = (u: Partial<AiTurn>) =>
        setTurns((prev) => prev.map((t) => (t.id === turnId ? { ...t, ...u } : t)));

      try {
        const result = await ragQueryStream({
          question: qq,
          sessionId: sessionId ?? undefined,
          conversationHistory,
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
    [model, sessionId]
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

  const closeChat = useCallback(() => setChatOpen(false), []);
  // Reset the thread: clearing turns lets the persist effect write [] back to
  // terminal_chat_history (the "Neuer Chat" button guards this behind a confirm).
  const newChat = useCallback(() => setTurns([]), []);

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

  function toggleKi() {
    setMode((m) => (m === "ai" ? "search" : "ai"));
    setActiveId(null);
    textareaRef.current?.focus();
  }

  function onModelChange(id: string) {
    setModel(id);
    try {
      localStorage.setItem(LS_MODEL, id);
    } catch {
      /* ignore */
    }
  }

  function onPickChip(text: string) {
    setQuery(text);
    setFocused(true);
    textareaRef.current?.focus();
  }

  return (
    <div className="ai-stack">
      <div className="ai-search-wrap" ref={boxRef}>
        <div className={`ai-search-box${focused ? " is-focused" : ""}`}>
          <textarea
            ref={textareaRef}
            className="ai-search-textarea"
            rows={3}
            value={query}
            placeholder={mode === "ai" ? "Frag die KI…" : "Frag mich alles…"}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={onKeyDown}
          />

          <div className="ai-search-divider" />

          <div className="ai-search-toolbar">
            <div className="ai-search-toolbar-left">
              <button
                type="button"
                className="ai-search-pill"
                disabled
                title="Anhänge kommen in Stufe 2"
              >
                <Paperclip className="ai-search-pill-icon" aria-hidden="true" />
                <span>Anhang</span>
              </button>
              <button
                type="button"
                className={`ai-search-pill ai-search-ki${mode === "ai" ? " is-active" : ""}`}
                onClick={toggleKi}
                aria-pressed={mode === "ai"}
              >
                <TerminalLogo variant="mark" title="" className="ai-search-pill-icon ai-ask-mark" />
                <span>KI fragen</span>
              </button>
            </div>

            <div className="ai-search-toolbar-right">
              {mode === "ai" && (
                <ModelSelector value={model} onChange={onModelChange} />
              )}
              <button
                type="button"
                className="ai-search-send"
                disabled={!query.trim()}
                onClick={() => submitAi(query)}
                aria-label="Senden"
              >
                <ArrowUp className="ai-search-send-icon" aria-hidden="true" />
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

      <QuickChips onPick={onPickChip} />

      <AIChatWindow
        open={chatOpen}
        turns={turns}
        onClose={closeChat}
        onSubmit={submitAi}
        onNewChat={newChat}
        onCorrect={handleCorrect}
        onFeedbackChange={handleFeedbackChange}
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
