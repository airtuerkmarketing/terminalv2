"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Edit3, X, Loader2, ChevronDown, Inbox } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { approveCorrection, rejectCorrection } from "@/lib/knowledge/actions";
import { CORRECTION_TYPE_LABEL, type CorrectionRow } from "@/lib/knowledge/types";

function when(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const STATUS_LABEL: Record<string, string> = {
  approved: "Applied",
  edited_approved: "Edited and applied",
  rejected: "Rejected",
  pending: "Open",
};

function CorrectionCard({ c, onChanged }: { c: CorrectionRow; onChanged: () => void }) {
  const { toast } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState<null | "approve" | "reject">(null);
  const [editing, setEditing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [editText, setEditText] = useState(c.proposedCorrection);
  const [reason, setReason] = useState("");

  const isPending = c.status === "pending";

  async function doApprove(edited?: string) {
    setBusy("approve");
    const res = await approveCorrection(c.id, edited !== undefined ? { editedContent: edited } : {});
    setBusy(null);
    if (!res.ok) {
      toast({ variant: "error", title: "Error", description: res.error });
      return;
    }
    toast({
      variant: res.embedded === false ? "warning" : "success",
      title: "Correction applied",
      description:
        res.embedded === false
          ? "Re-embedding failed — it will be retried on the next run."
          : "New chunk embedded — the AI will use it from the next query.",
    });
    setEditing(false);
    onChanged();
    router.refresh();
  }

  async function doReject() {
    if (!reason.trim()) {
      toast({ variant: "error", title: "Reason required" });
      return;
    }
    setBusy("reject");
    const res = await rejectCorrection(c.id, reason.trim());
    setBusy(null);
    if (!res.ok) {
      toast({ variant: "error", title: "Error", description: res.error });
      return;
    }
    toast({ variant: "info", title: "Correction rejected", description: "The submitter will be notified." });
    setRejecting(false);
    onChanged();
    router.refresh();
  }

  return (
    <article className={`kb-corr ${isPending ? "kb-corr--pending" : ""}`}>
      <div className="kb-corr-head">
        <span className="kb-corr-type">{CORRECTION_TYPE_LABEL[c.correctionType]}</span>
        <span className="kb-corr-meta">
          {isPending ? "Submitted" : STATUS_LABEL[c.status]} by {c.submittedByName ?? "Unknown"} · {when(c.submittedAt)}
          {c.reviewedByName ? ` · reviewed: ${c.reviewedByName}` : ""}
        </span>
      </div>

      <div className="kb-corr-reason">
        <b>Question:</b> {c.originalQuestion}
      </div>

      <div className="kb-diff">
        <div className="kb-diff-col">
          <span className="kb-diff-label">AI answer (old)</span>
          <div className="kb-diff-box kb-diff-box--old">{c.originalAnswer}</div>
        </div>
        <div className="kb-diff-col">
          <span className="kb-diff-label">Proposed correction</span>
          <div className="kb-diff-box kb-diff-box--new">{c.finalContent ?? c.proposedCorrection}</div>
        </div>
      </div>

      {c.userReference && (
        <div className="kb-corr-reason">
          <b>Reference:</b> {c.userReference}
        </div>
      )}
      {!isPending && c.reviewerNotes && (
        <div className="kb-corr-reason">
          <b>Note:</b> {c.reviewerNotes}
        </div>
      )}

      {isPending && editing && (
        <textarea
          className="kb-edit-area"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          aria-label="Edit correction"
        />
      )}
      {isPending && rejecting && (
        <textarea
          className="kb-edit-area"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for rejection (required)…"
          aria-label="Rejection reason"
        />
      )}

      {isPending && (
        <div className="kb-corr-actions">
          {!editing && !rejecting && (
            <>
              <button className="kb-btn kb-btn--approve" disabled={!!busy} onClick={() => doApprove()}>
                {busy === "approve" ? <Loader2 size={15} className="kb-spin" /> : <Check size={15} />}
                Apply
              </button>
              <button className="kb-btn kb-btn--ghost" disabled={!!busy} onClick={() => setEditing(true)}>
                <Edit3 size={15} /> Edit &amp; apply
              </button>
              <button className="kb-btn kb-btn--danger" disabled={!!busy} onClick={() => setRejecting(true)}>
                <X size={15} /> Reject
              </button>
            </>
          )}
          {editing && (
            <>
              <button className="kb-btn kb-btn--approve" disabled={!!busy || !editText.trim()} onClick={() => doApprove(editText.trim())}>
                {busy === "approve" ? <Loader2 size={15} className="kb-spin" /> : <Check size={15} />}
                Apply edited
              </button>
              <button className="kb-btn kb-btn--ghost" disabled={!!busy} onClick={() => { setEditing(false); setEditText(c.proposedCorrection); }}>
                Cancel
              </button>
            </>
          )}
          {rejecting && (
            <>
              <button className="kb-btn kb-btn--danger" disabled={!!busy || !reason.trim()} onClick={doReject}>
                {busy === "reject" ? <Loader2 size={15} className="kb-spin" /> : <X size={15} />}
                Confirm rejection
              </button>
              <button className="kb-btn kb-btn--ghost" disabled={!!busy} onClick={() => { setRejecting(false); setReason(""); }}>
                Cancel
              </button>
            </>
          )}
        </div>
      )}
    </article>
  );
}

export function ReviewsTab({ pending, history }: { pending: CorrectionRow[]; history: CorrectionRow[] }) {
  const [showHistory, setShowHistory] = useState(false);
  const router = useRouter();
  const onChanged = () => router.refresh();

  return (
    <div>
      <div className="kb-rev-section-title">
        <Inbox size={16} /> Open
        {pending.length > 0 && <span className="kb-tab-count kb-tab-count--warn">{pending.length}</span>}
      </div>

      {pending.length === 0 ? (
        <div className="kb-empty">No open reviews. Corrections from the AI chat appear here.</div>
      ) : (
        <div className="kb-cards">
          {pending.map((c) => (
            <CorrectionCard key={c.id} c={c} onChanged={onChanged} />
          ))}
        </div>
      )}

      <button
        className="kb-tab"
        style={{ marginTop: "var(--space-4)", padding: "var(--space-2) 0" }}
        aria-expanded={showHistory}
        onClick={() => setShowHistory((v) => !v)}
      >
        <ChevronDown size={15} style={{ transform: showHistory ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
        History ({history.length})
      </button>

      {showHistory && history.length > 0 && (
        <div className="kb-cards" style={{ marginTop: "var(--space-2)" }}>
          {history.map((c) => (
            <CorrectionCard key={c.id} c={c} onChanged={onChanged} />
          ))}
        </div>
      )}
    </div>
  );
}
