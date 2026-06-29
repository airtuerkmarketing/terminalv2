"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp, ChevronDown, Edit3, History, Plus, X } from "lucide-react";
import { AIAnswerBlock } from "@/components/dashboard/hero/AIAnswerBlock";
import { ChatHistoryModal } from "@/components/dashboard/hero/ChatHistoryModal";
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
  sessionId?: string | null;
  titleOverride?: string | null;
  onClose: () => void;
  onSubmit: (text: string) => void;
  onNewChat: () => void;
  onRename?: (sessionId: string, title: string) => void;
  onCorrect?: (turn: AiTurn) => void;
  onFeedbackChange?: (turnId: string, feedback: "helpful" | "not_helpful") => void;
}

export function AIChatWindow({
  open,
  turns,
  sessionId,
  titleOverride,
  onClose,
  onSubmit,
  onNewChat,
  onRename,
  onCorrect,
  onFeedbackChange,
}: Props) {
  const [draft, setDraft] = useState("");
  const [confirming, setConfirming] = useState(false); // "Neuer Chat" two-step arm
  const [historyOpen, setHistoryOpen] = useState(false); // chat-history search modal
  const [showScrollDown, setShowScrollDown] = useState(false); // jump-to-latest button
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

  // Show the scroll-to-bottom button only when the user is away from the end.
  // Initial check is deferred via rAF (no synchronous setState in the effect body).
  useEffect(() => {
    const el = bodyRef.current;
    if (!el || !open) return;
    const onScroll = () => setShowScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 80);
    const raf = requestAnimationFrame(onScroll);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
    };
  }, [open, turns]);

  function scrollToBottom() {
    const el = bodyRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }

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

  // Header context (local turns-state only — no fetch, no timestamp this stage).
  // Title priority: a user-set override > the first question > product-name
  // fallback. Ellipsis is CSS, not JS-slice, so it stays responsive.
  const derivedTitle = turns[0]?.question?.trim() || "";
  const displayTitle = titleOverride ?? (derivedTitle || "airtuerk Intelligence");
  const messageCount = turns.length;
  // Inline rename: only once the session exists (a fresh thread has no id to
  // write to). The pencil reveals on hover; Enter/blur commit, Esc cancels.
  const canEdit = !!sessionId && turns.length > 0;
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  function startEdit() {
    setEditValue(displayTitle);
    setEditing(true);
  }
  function commitEdit() {
    const v = editValue.trim();
    setEditing(false);
    if (v && v !== displayTitle && sessionId) onRename?.(sessionId, v);
  }

  return (
    <aside
      ref={panelRef}
      className={`ai-chat-window${open ? " is-open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="airtuerk Intelligence"
      // `inert` while closed removes the faded-out view from the tab order and
      // a11y tree (it still cross-fades) — prevents tabbing into hidden controls.
      inert={!open}
    >
      {/* Header: left = History icon + chat title/meta, right = New chat + Close. */}
      <header className="ai-chat-header">
        <div className="ai-chat-header-actions">
          {/* Placeholder — history panel later (localStorage questions → DB). */}
          <button
            type="button"
            className="ai-chat-history"
            title="History"
            aria-label="History"
            onClick={() => setHistoryOpen(true)}
          >
            <History className="ai-chat-history-icon" aria-hidden="true" />
          </button>
          <div className="ai-chat-header-title">
            {editing ? (
              <input
                className="ai-chat-header-title-input"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
                onFocus={(e) => e.currentTarget.select()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitEdit();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setEditing(false);
                  }
                }}
                onBlur={commitEdit}
                aria-label="Chat title"
              />
            ) : (
              <div className="ai-chat-header-title-row">
                <span className="ai-chat-header-title-text">{displayTitle}</span>
                {canEdit && (
                  <button
                    type="button"
                    className="ai-chat-header-edit"
                    onClick={startEdit}
                    aria-label="Titel umbenennen"
                    title="Rename"
                  >
                    <Edit3 aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
            {messageCount > 0 && (
              <span className="ai-chat-header-meta">
                {messageCount} {messageCount === 1 ? "Nachricht" : "Nachrichten"}
              </span>
            )}
          </div>
        </div>
        <div className="ai-chat-header-right">
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
          {/* Foot row: Plus (left, square ghost) + Send (right, blue). */}
          <div className="ai-chat-composer-foot">
            <button
              type="button"
              className="ai-chat-attach"
              disabled
              title="Attachments coming in stage 2"
              aria-label="Attach"
            >
              <Plus className="ai-chat-attach-icon" aria-hidden="true" />
            </button>
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
      </div>

      {showScrollDown && turns.length > 0 && (
        <button
          type="button"
          className="ai-chat-scroll-down"
          onClick={scrollToBottom}
          aria-label="Scroll to latest"
        >
          <ChevronDown className="ai-chat-scroll-down-icon" aria-hidden="true" />
        </button>
      )}

      {/* Chat-history search (B.1: display + search + close; chat-loading is B.2).
          Mounted only while open so each open starts from a fresh load. */}
      {historyOpen && (
        <ChatHistoryModal open onClose={() => setHistoryOpen(false)} />
      )}
    </aside>
  );
}
