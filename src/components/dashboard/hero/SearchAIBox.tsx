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
import { ArrowUp, Paperclip, Sparkles } from "lucide-react";
import { ModelSelector } from "@/components/dashboard/hero/ModelSelector";
import { QuickChips } from "@/components/dashboard/hero/QuickChips";
import { SearchDropdown, ASK_AI_ID } from "@/components/dashboard/hero/SearchDropdown";
import { AIAnswerBlock } from "@/components/dashboard/hero/AIAnswerBlock";
import {
  DEFAULT_MODEL_ID,
  LS_HISTORY,
  LS_MODEL,
} from "@/components/dashboard/hero-data";
import type {
  AiAnswer,
  AiTurn,
  SearchHit,
  SearchResults,
} from "@/lib/search/types";

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

// Placeholder answer — real RAG/Quellen come in stage 2 (DATA_CONTRACT §5.4).
const FAKE_ANSWER: AiAnswer = {
  text: "Das ist eine Beispiel-Antwort. Die echte KI-Anbindung kommt in Stufe 2.",
  quellen: [
    {
      dokument_titel: "Beispiel-Quelle",
      domain: "wiki",
      quelle: "confluence",
      link: "#",
      seite: 1,
      stand: "2026-06-19",
    },
  ],
  konfidenz: "mittel",
  weiss_nicht: false,
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipPersist = useRef(true);

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

  // ── Persist history (skip the first run so the load above isn't overwritten) ──
  useEffect(() => {
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
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

  useEffect(() => {
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, []);

  const submitAi = useCallback(
    (text: string) => {
      const qq = text.trim();
      if (!qq) return;
      setMode("ai");
      setFocused(false);
      setActiveId(null);
      const id = newId();
      setTurns((prev) => [...prev, { id, question: qq, model, answer: null }]);
      setQuery("");
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      aiTimerRef.current = setTimeout(() => {
        setTurns((prev) =>
          prev.map((t) => (t.id === id ? { ...t, answer: FAKE_ANSWER } : t))
        );
      }, 1500);
    },
    [model]
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
    <div className="dh-stack">
      <div className="dh-box-wrap" ref={boxRef}>
        <div className={`dh-box${focused ? " is-focused" : ""}`}>
          <textarea
            ref={textareaRef}
            className="dh-textarea"
            rows={3}
            value={query}
            placeholder={mode === "ai" ? "Frag die KI…" : "Frag mich alles…"}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={onKeyDown}
          />

          <div className="dh-divider" />

          <div className="dh-toolbar">
            <div className="dh-toolbar-left">
              <button
                type="button"
                className="dh-pill"
                disabled
                title="Anhänge kommen in Stufe 2"
              >
                <Paperclip className="dh-pill-icon" aria-hidden="true" />
                <span>Anhang</span>
              </button>
              <button
                type="button"
                className={`dh-pill dh-ki${mode === "ai" ? " is-active" : ""}`}
                onClick={toggleKi}
                aria-pressed={mode === "ai"}
              >
                <Sparkles className="dh-pill-icon" aria-hidden="true" />
                <span>KI fragen</span>
              </button>
            </div>

            <div className="dh-toolbar-right">
              {mode === "ai" && (
                <ModelSelector value={model} onChange={onModelChange} />
              )}
              <button
                type="button"
                className="dh-send"
                disabled={!query.trim()}
                onClick={() => submitAi(query)}
                aria-label="Senden"
              >
                <ArrowUp className="dh-send-icon" aria-hidden="true" />
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

      {turns.length > 0 && (
        <div className="dh-answers">
          {turns.map((t) => (
            <AIAnswerBlock key={t.id} turn={t} />
          ))}
        </div>
      )}

      <QuickChips onPick={onPickChip} />
    </div>
  );
}
