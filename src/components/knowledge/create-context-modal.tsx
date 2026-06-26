"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, Loader2, Plus } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { createCompanyContextChunk } from "@/lib/knowledge/actions";

/**
 * Create a new company_context entry (identity / policy / team fact) — the one
 * durable, directly-creatable layer. Operational facts go through the correction
 * loop; Confluence/Brand/KB are sourced from their pipelines.
 */
export function CreateContextModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [saving, onClose]);

  const valid = topic.trim() && category.trim() && content.trim() && reason.trim();

  async function save() {
    if (!valid) return;
    setSaving(true);
    const res = await createCompanyContextChunk({ topic, category, content }, reason);
    setSaving(false);
    if (!res.ok) {
      toast({ variant: "error", title: "Fehler", description: res.error });
      return;
    }
    toast({
      variant: res.embedded === false ? "warning" : "success",
      title: "Eintrag angelegt",
      description:
        res.embedded === false
          ? "Re-Embedding folgt beim nächsten Lauf."
          : "Eingebettet — die KI nutzt ihn ab dem nächsten Query.",
    });
    onClose();
    router.refresh();
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="kb-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Neuer Identitäts-Eintrag"
    >
      <div className="kb-modal">
        <header className="kb-modal-head">
          <h2>Neuer Identitäts-Eintrag</h2>
          <button className="kb-modal-close" onClick={onClose} disabled={saving} aria-label="Schließen">
            <X size={18} />
          </button>
        </header>
        <div className="kb-modal-body">
          <div className="kb-diff-label">Titel</div>
          <input className="kb-search" style={{ width: "100%" }} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="z.B. Eskalationspfad Buchhaltung" />
          <div className="kb-diff-label" style={{ marginTop: "var(--space-3)" }}>Kategorie</div>
          <input className="kb-search" style={{ width: "100%" }} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="z.B. process, team_structure, mission" />
          <div className="kb-diff-label" style={{ marginTop: "var(--space-3)" }}>Inhalt</div>
          <textarea className="kb-edit-area" style={{ minHeight: 140 }} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Der Wissens-/Identitäts-Fakt, den die KI kennen soll…" />
          <div className="kb-diff-label" style={{ marginTop: "var(--space-3)" }}>Grund (Pflicht)</div>
          <input className="kb-search" style={{ width: "100%" }} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="z.B. Neue Eskalationsregel ab 07/2026" />
          <p className="kb-resultcount" style={{ marginTop: "var(--space-3)" }}>
            Hinweis: Operative Fakten besser über den KI-Chat → „Korrigieren" einpflegen.
            Confluence/Brand-Inhalte kommen aus ihren Quellen.
          </p>
        </div>
        <footer className="kb-modal-foot">
          <button className="kb-btn kb-btn--ghost" onClick={onClose} disabled={saving}>
            Abbrechen
          </button>
          <button className="kb-btn kb-btn--primary" onClick={save} disabled={saving || !valid}>
            {saving ? <Loader2 size={15} className="kb-spin" /> : <Plus size={15} />} Anlegen + Embedding
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
