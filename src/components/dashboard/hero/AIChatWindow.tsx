"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp, Plus, X } from "lucide-react";
import { AIAnswerBlock } from "@/components/dashboard/hero/AIAnswerBlock";
import type { AiTurn } from "@/lib/search/types";

/* Right-side sliding chat window (BAU-Auftrag §5). Non-modal side panel
 * (Linear/Notion pattern): position:fixed, own scroll container, the main page
 * scrolls independently behind it — no backdrop, no body scroll-lock. Always
 * mounted so the slide-out transition plays; `open` toggles `.is-open`.
 * Closes via ✕ or Esc (Esc only when focus is inside the panel). The footer
 * input reuses the parent's submitAi; "Neuer Chat" resets the persisted thread
 * behind a two-step inline confirm. */

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
    <>
      <div
        className={`ai-chat-overlay${open ? " is-visible" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={panelRef}
        className={`ai-chat-window${open ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-chat-title"
        // `inert` while closed removes the off-screen panel from the tab order and
        // a11y tree (it still animates) — prevents tabbing into hidden controls.
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
            title="Neuer Chat (Verlauf löschen)"
          >
            <Plus className="ai-chat-new-icon" aria-hidden="true" />
            <span>{confirming ? "Wirklich löschen?" : "Neuer Chat"}</span>
          </button>
          <button
            type="button"
            className="ai-chat-close"
            onClick={onClose}
            aria-label="Chat schließen"
          >
            <X className="ai-chat-close-icon" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="ai-chat-body" ref={bodyRef}>
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

      <div className="ai-chat-input">
        <textarea
          ref={inputRef}
          className="ai-chat-textarea"
          rows={1}
          value={draft}
          placeholder="Nachfrage stellen…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className="ai-chat-send"
          disabled={!draft.trim()}
          onClick={send}
          aria-label="Senden"
        >
          <ArrowUp className="ai-chat-send-icon" aria-hidden="true" />
        </button>
      </div>
      </aside>
    </>
  );
}
