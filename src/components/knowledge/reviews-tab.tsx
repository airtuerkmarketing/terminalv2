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
  approved: "Übernommen",
  edited_approved: "Bearbeitet übernommen",
  rejected: "Abgelehnt",
  pending: "Offen",
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
      toast({ variant: "error", title: "Fehler", description: res.error });
      return;
    }
    toast({
      variant: res.embedded === false ? "warning" : "success",
      title: "Korrektur übernommen",
      description:
        res.embedded === false
          ? "Re-Embedding fehlgeschlagen — wird beim nächsten Lauf nachgeholt."
          : "Neuer Chunk eingebettet — die KI nutzt ihn ab dem nächsten Query.",
    });
    setEditing(false);
    onChanged();
    router.refresh();
  }

  async function doReject() {
    if (!reason.trim()) {
      toast({ variant: "error", title: "Grund erforderlich" });
      return;
    }
    setBusy("reject");
    const res = await rejectCorrection(c.id, reason.trim());
    setBusy(null);
    if (!res.ok) {
      toast({ variant: "error", title: "Fehler", description: res.error });
      return;
    }
    toast({ variant: "info", title: "Korrektur abgelehnt", description: "Der Einreicher wird benachrichtigt." });
    setRejecting(false);
    onChanged();
    router.refresh();
  }

  return (
    <article className={`kb-corr ${isPending ? "kb-corr--pending" : ""}`}>
      <div className="kb-corr-head">
        <span className="kb-corr-type">{CORRECTION_TYPE_LABEL[c.correctionType]}</span>
        <span className="kb-corr-meta">
          {isPending ? "Eingereicht" : STATUS_LABEL[c.status]} von {c.submittedByName ?? "Unbekannt"} · {when(c.submittedAt)}
          {c.reviewedByName ? ` · geprüft: ${c.reviewedByName}` : ""}
        </span>
      </div>

      <div className="kb-corr-reason">
        <b>Frage:</b> {c.originalQuestion}
      </div>

      <div className="kb-diff">
        <div className="kb-diff-col">
          <span className="kb-diff-label">KI-Antwort (alt)</span>
          <div className="kb-diff-box kb-diff-box--old">{c.originalAnswer}</div>
        </div>
        <div className="kb-diff-col">
          <span className="kb-diff-label">Vorgeschlagene Korrektur</span>
          <div className="kb-diff-box kb-diff-box--new">{c.finalContent ?? c.proposedCorrection}</div>
        </div>
      </div>

      {c.userReference && (
        <div className="kb-corr-reason">
          <b>Referenz:</b> {c.userReference}
        </div>
      )}
      {!isPending && c.reviewerNotes && (
        <div className="kb-corr-reason">
          <b>Notiz:</b> {c.reviewerNotes}
        </div>
      )}

      {isPending && editing && (
        <textarea
          className="kb-edit-area"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          aria-label="Korrektur bearbeiten"
        />
      )}
      {isPending && rejecting && (
        <textarea
          className="kb-edit-area"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Grund für die Ablehnung (Pflicht)…"
          aria-label="Ablehnungsgrund"
        />
      )}

      {isPending && (
        <div className="kb-corr-actions">
          {!editing && !rejecting && (
            <>
              <button className="kb-btn kb-btn--approve" disabled={!!busy} onClick={() => doApprove()}>
                {busy === "approve" ? <Loader2 size={15} className="kb-spin" /> : <Check size={15} />}
                Übernehmen
              </button>
              <button className="kb-btn kb-btn--ghost" disabled={!!busy} onClick={() => setEditing(true)}>
                <Edit3 size={15} /> Bearbeiten &amp; übernehmen
              </button>
              <button className="kb-btn kb-btn--danger" disabled={!!busy} onClick={() => setRejecting(true)}>
                <X size={15} /> Ablehnen
              </button>
            </>
          )}
          {editing && (
            <>
              <button className="kb-btn kb-btn--approve" disabled={!!busy || !editText.trim()} onClick={() => doApprove(editText.trim())}>
                {busy === "approve" ? <Loader2 size={15} className="kb-spin" /> : <Check size={15} />}
                Bearbeitet übernehmen
              </button>
              <button className="kb-btn kb-btn--ghost" disabled={!!busy} onClick={() => { setEditing(false); setEditText(c.proposedCorrection); }}>
                Abbrechen
              </button>
            </>
          )}
          {rejecting && (
            <>
              <button className="kb-btn kb-btn--danger" disabled={!!busy || !reason.trim()} onClick={doReject}>
                {busy === "reject" ? <Loader2 size={15} className="kb-spin" /> : <X size={15} />}
                Ablehnung bestätigen
              </button>
              <button className="kb-btn kb-btn--ghost" disabled={!!busy} onClick={() => { setRejecting(false); setReason(""); }}>
                Abbrechen
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
        <Inbox size={16} /> Offen
        {pending.length > 0 && <span className="kb-tab-count kb-tab-count--warn">{pending.length}</span>}
      </div>

      {pending.length === 0 ? (
        <div className="kb-empty">Keine offenen Reviews. Korrekturen aus dem KI-Chat erscheinen hier.</div>
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
        Verlauf ({history.length})
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
