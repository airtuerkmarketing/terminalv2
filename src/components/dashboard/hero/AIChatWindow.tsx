"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp, Plus, X } from "lucide-react";
import { AIAnswerBlock } from "@/components/dashboard/hero/AIAnswerBlock";
import type { AiTurn } from "@/lib/search/types";

/* Full-page chat surface (BAU-Auftrag §5). Opens as its own page — an opaque
 * full-viewport view that cross-fades + rises in (no side-drawer slide); the
 * conversation sits in a centered readable column with its own scroll. Always
 * mounted so the fade plays; `open` toggles `.is-open` (closed state is faded +
 * inert). Closes via ✕ or Esc (Esc only when focus is inside the panel). The
 * composer is a centered floating input — bottom-anchored during a chat,
 * centered for a fresh/empty thread — and reuses the parent's submitAi;
 * "Neuer Chat" resets the persisted thread behind a two-step inline confirm. */

interface Props {
  open: boolean;
  turns: AiTurn[];
  onClose: () => void;
  onSubmit: (text: string) => void;
  onNewChat: () => void;
  onCorrect?: (turn: AiTurn) => void;
  onFeedbackChange?: (turnId: string, feedback: "helpful" | "not_helpful") => void;
}

export function AIChatWindow({
  open,
  turns,
  onClose,
  onSubmit,
  onNewChat,
  onCorrect,
  onFeedbackChange,
}: Props) {
  const [draft, setDraft] = useState("");
  const [confirming, setConfirming] = useState(false); // "Neuer Chat" two-step arm
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Esc closes — ONLY when focus is inside the panel (so Esc in the hero search
  // box stays with the box's own close-dropdown handler; no double-dismiss).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (!panelRef.current?.contains(document.activeElement)) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Focus the follow-up input when the panel opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Lock background scroll while the full-page chat is open — it's a takeover,
  // not a side panel, so the dashboard behind shouldn't scroll-chain. Removing
  // the viewport scrollbar also keeps the centered composer/surface from being
  // offset by the scrollbar gutter (the window is 100vw). Restores the prior
  // value on close/unmount.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
    };
  }, [open]);

  // Auto-grow the follow-up input as the draft changes (reset to 1 row after
  // send, when draft → ""). Height tracks content; CSS max-height caps it at
  // ~8 rows and overflow-y:auto scrolls beyond. Hand-rolled (no dependency) —
  // react-textarea-autosize would pull a transitive dep blocked by the repo's
  // minimumReleaseAge supply-chain policy.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  // Reset the "Neuer Chat" arm whenever the panel closes.
  useEffect(() => {
    if (!open) setConfirming(false);
  }, [open]);

  useEffect(
    () => () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    },
    []
  );

  // Jump to the newest turn when turns change or the panel opens.
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, open]);

  // Follow typewriter growth — but don't yank the user back if they scrolled up.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
        el.scrollTop = el.scrollHeight;
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  function clickNewChat() {
    // Two-step: first click arms ("Wirklich löschen?"), second click confirms.
    if (!confirming) {
      setConfirming(true);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirming(false), 3000);
      return;
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setConfirming(false);
    onNewChat();
  }

  function send() {
    const t = draft.trim();
    if (!t) return;
    onSubmit(t);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <aside
      ref={panelRef}
      className={`ai-chat-window${open ? " is-open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-chat-title"
      // `inert` while closed removes the faded-out view from the tab order and
      // a11y tree (it still cross-fades) — prevents tabbing into hidden controls.
      inert={!open}
    >
      <header className="ai-chat-header">
        <h2 id="ai-chat-title" className="ai-chat-title">airtuerk Intelligence</h2>
        <div className="ai-chat-header-actions">
          <button
            type="button"
            className={`ai-chat-new${confirming ? " is-confirming" : ""}`}
            onClick={clickNewChat}
            disabled={turns.length === 0}
            title="New chat (clear history)"
          >
            <Plus className="ai-chat-new-icon" aria-hidden="true" />
            <span>{confirming ? "Delete history?" : "New chat"}</span>
          </button>
          <button
            type="button"
            className="ai-chat-close"
            onClick={onClose}
            aria-label="Close chat"
          >
            <X className="ai-chat-close-icon" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="ai-chat-body" ref={bodyRef}>
        <div className="ai-chat-thread">
          {turns.map((t, i) => (
            <AIAnswerBlock
              key={t.id}
              turn={t}
              typewriter={i === turns.length - 1}
              onCorrect={onCorrect}
              onFeedbackChange={onFeedbackChange}
            />
          ))}
        </div>
      </div>

      {/* Centered floating composer. `is-centered` lifts it to the vertical
          middle (with a greeting) when the thread is empty; otherwise it sits
          bottom-centered. */}
      <div className={`ai-chat-input${turns.length === 0 ? " is-centered" : ""}`}>
        {turns.length === 0 && (
          <div className="ai-chat-greeting">
            <h3 className="ai-chat-greeting-title">How can I help?</h3>
            <p className="ai-chat-greeting-sub">Ask me anything about your knowledge.</p>
          </div>
        )}
        <div className="ai-chat-composer">
          <textarea
            ref={inputRef}
            className="ai-chat-textarea"
            rows={1}
            value={draft}
            placeholder="Ask a follow-up…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button
            type="button"
            className="ai-chat-send"
            disabled={!draft.trim()}
            onClick={send}
            aria-label="Send"
          >
            <ArrowUp className="ai-chat-send-icon" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}
