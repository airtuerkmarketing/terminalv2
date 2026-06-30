"use client";

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { ArrowUp, ChevronDown, Edit3, FileText, History, Plus, X } from "lucide-react";
import { AIAnswerBlock } from "@/components/dashboard/hero/AIAnswerBlock";
import { ChatHistoryModal } from "@/components/dashboard/hero/ChatHistoryModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { AiTurn } from "@/lib/search/types";
import type { ChatMode } from "@/components/dashboard/hero-data";
import {
  readAttachment,
  attachmentChipMeta,
  ATTACH_ACCEPT,
  ATTACH_QUICK_ACTIONS,
  type AttachedFile,
} from "@/lib/attachment";
// Type-only — erased, so the server-only users.ts module isn't bundled here.
import type { ChatSessionItem } from "@/lib/users";

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
  /** Selected model (Fork-6 gating: attachments are Claude-only). */
  model?: string;
  /** Armed mode-chip — quick-action pills only show on 'default' so they don't double-prime. */
  chatMode?: ChatMode;
  onClose: () => void;
  onSubmit: (text: string, opts?: { attachedFile?: AttachedFile | null }) => void;
  onNewChat: () => void;
  onRename?: (sessionId: string, title: string) => void;
  /** Open a persisted chat (restore its turns into the active thread). */
  onOpenChat?: (session: ChatSessionItem) => void;
  onCorrect?: (turn: AiTurn) => void;
  onFeedbackChange?: (turnId: string, feedback: "helpful" | "not_helpful") => void;
  /** Accept the rule-7 web-search offer for an out-of-scope turn. */
  onWebSearch?: (turn: AiTurn) => void;
  /** #3 explicit-sticky web-search: true while follow-ups stay in web-search mode. */
  webSearchSticky?: boolean;
  /** Exit the sticky web-search mode (composer pill [exit]). */
  onExitWebSearch?: () => void;
  /** Signed-in user's first name — for the chip personalization preamble. */
  firstName?: string | null;
}

export function AIChatWindow({
  open,
  turns,
  sessionId,
  titleOverride,
  model,
  chatMode,
  onClose,
  onSubmit,
  onNewChat,
  onRename,
  onOpenChat,
  onCorrect,
  onFeedbackChange,
  onWebSearch,
  webSearchSticky = false,
  onExitWebSearch,
  firstName = null,
}: Props) {
  const [draft, setDraft] = useState("");
  // D-110: own attachment state (the follow-up composer is independent of the dashboard box).
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false); // chat-history search modal
  const [pendingSession, setPendingSession] = useState<ChatSessionItem | null>(null); // switch-confirm
  const [showScrollDown, setShowScrollDown] = useState(false); // jump-to-latest button
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const composerRef = useRef<HTMLDivElement>(null); // .ai-chat-input — measured for Bug C padding
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachBtnRef = useRef<HTMLButtonElement>(null);

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

  // Bug C: keep the body's bottom padding equal to the composer's live height
  // (+24px breathing) so the last answer never slides under the floating composer.
  // Emirkan's meta-row composer outgrew the old hardcoded 180px. Writes the measured
  // height to --composer-pad (read by .ai-chat-body padding-bottom in dashboard-hero.css).
  useEffect(() => {
    const composer = composerRef.current;
    const body = bodyRef.current;
    if (!composer || !body) return;
    const updatePad = () => {
      body.style.setProperty("--composer-pad", `${composer.offsetHeight + 24}px`);
    };
    updatePad();
    const ro = new ResizeObserver(updatePad);
    ro.observe(composer);
    return () => ro.disconnect();
  }, [open]);

  function scrollToBottom() {
    const el = bodyRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }

  function send() {
    const t = draft.trim();
    // Allow an attachment-only send for the Layer-3 pills (which supply a non-empty
    // instruction); a plain empty send is still blocked.
    if (!t && !attachedFile) return;
    onSubmit(t, { attachedFile });
    setDraft("");
    setAttachedFile(null);
    setAttachError(null);
  }

  // ── D-110: attach-file picker (shared logic in @/lib/attachment) ──
  function onPickFile() {
    setAttachError(null);
    fileInputRef.current?.click();
  }
  async function onFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = ""; // reset so re-picking the same filename re-fires onChange
    if (!f) return;
    const r = await readAttachment(f);
    if (r.ok) {
      setAttachedFile(r.file);
      setAttachError(null);
    } else {
      setAttachedFile(null);
      setAttachError(r.error);
    }
  }
  function removeAttachment() {
    setAttachedFile(null);
    setAttachError(null);
    attachBtnRef.current?.focus(); // a11y: keep focus on the attach button after removal
  }
  // Post-attach pill: submit a mapped instruction with the attached file on mode 'default'.
  function runQuickAction(prompt: string) {
    if (!attachedFile) return;
    onSubmit(prompt, { attachedFile });
    setDraft("");
    setAttachedFile(null);
    setAttachError(null);
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

  // Open a chat from the history modal. Restore is destructive (replaces the
  // thread), so confirm ONLY when there's unsent work: a draft in the composer
  // or a turn still streaming. Otherwise switch immediately.
  function proceedOpen(session: ChatSessionItem) {
    setDraft(""); // the old draft is intentionally discarded
    setPendingSession(null);
    setHistoryOpen(false);
    onOpenChat?.(session);
  }
  function guardSelect(session: ChatSessionItem) {
    const dirty = draft.trim().length > 0 || turns.some((t) => t.isStreaming);
    if (dirty) setPendingSession(session); // history modal stays open under the confirm
    else proceedOpen(session);
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
            className="ai-chat-new"
            onClick={onNewChat}
            disabled={turns.length === 0}
            title="New chat"
          >
            <Plus className="ai-chat-new-icon" aria-hidden="true" />
            <span>New chat</span>
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
              firstName={firstName}
              onCorrect={onCorrect}
              onFeedbackChange={onFeedbackChange}
              onWebSearch={onWebSearch}
            />
          ))}
        </div>
      </div>

      {/* Centered floating composer. `is-centered` lifts it to the vertical
          middle (with a greeting) when the thread is empty; otherwise it sits
          bottom-centered. */}
      <div ref={composerRef} className={`ai-chat-input${turns.length === 0 ? " is-centered" : ""}`}>
        {turns.length === 0 && (
          <div className="ai-chat-greeting">
            <h3 className="ai-chat-greeting-title">How can I help?</h3>
            <p className="ai-chat-greeting-sub">Ask me anything about your knowledge.</p>
          </div>
        )}
        <div className="ai-chat-composer">
          {webSearchSticky && (
            <div className="ai-chat-websearch-pill">
              <span>Web-Suche aktiv</span>
              <button
                type="button"
                className="ai-chat-websearch-exit"
                onClick={onExitWebSearch}
                aria-label="Web-Suche beenden"
              >
                exit
              </button>
            </div>
          )}
          {attachedFile && (
            <div className="ai-attach-chip">
              <FileText className="ai-attach-chip-icon" aria-hidden="true" />
              <span className="ai-attach-chip-name">{attachedFile.filename}</span>
              <span className="ai-attach-chip-size">
                {attachmentChipMeta(attachedFile).size}
              </span>
              <button
                type="button"
                className="ai-attach-chip-x"
                onClick={removeAttachment}
                aria-label="Remove attachment"
              >
                <X aria-hidden="true" />
              </button>
            </div>
          )}
          {attachedFile && chatMode === "default" && (
            <div className="ai-attach-pills">
              {ATTACH_QUICK_ACTIONS.map((qa) => (
                <button
                  key={qa.label}
                  type="button"
                  className="ai-attach-pill"
                  onClick={() => runQuickAction(qa.prompt)}
                >
                  {qa.label}
                </button>
              ))}
            </div>
          )}
          {attachError && (
            <div className="ai-attach-error" role="alert">
              {attachError}
            </div>
          )}
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
            {/* Fork-6 (D-110): attachments are Claude-only (inert until a model-picker
                ships; model is threaded from the parent so this isn't always-disabled). */}
            <button
              ref={attachBtnRef}
              type="button"
              className="ai-chat-attach"
              onClick={onPickFile}
              disabled={model !== "claude"}
              title={model !== "claude" ? "Attachments require Claude" : "Attach a PDF or DOCX"}
              aria-label="Attach a file"
            >
              <Plus className="ai-chat-attach-icon" aria-hidden="true" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ATTACH_ACCEPT}
              hidden
              onChange={onFileChosen}
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
        <ChatHistoryModal open onClose={() => setHistoryOpen(false)} onSelect={guardSelect} />
      )}

      {/* Switch confirm — only shown when opening a chat would lose unsent work. */}
      <ConfirmDialog
        open={!!pendingSession}
        onClose={() => setPendingSession(null)}
        onConfirm={() => { if (pendingSession) proceedOpen(pendingSession); }}
        title="Aktuellen Chat verlassen?"
        description="Dein nicht gesendeter Text geht verloren."
        confirmLabel="Chat öffnen"
        cancelLabel="Abbrechen"
      />
    </aside>
  );
}
