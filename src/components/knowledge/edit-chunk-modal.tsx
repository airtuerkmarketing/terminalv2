"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, Loader2, Save } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { updateCompanyContextChunk } from "@/lib/knowledge/actions";
import type { KnowledgeChunk } from "@/lib/knowledge/types";

/**
 * Edit modal — company_context only (the one durable, in-place-embedded layer,
 * D-A). Saving re-embeds via embed-knowledge('context'). Confluence/brand chunks
 * are read-only (regenerable caches) and never reach this modal.
 */
export function EditChunkModal({ chunk, onClose }: { chunk: KnowledgeChunk; onClose: () => void }) {
  const { toast } = useToast();
  const router = useRouter();
  const [content, setContent] = useState(chunk.content);
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

  async function save() {
    if (!reason.trim()) {
      toast({ variant: "error", title: "Grund erforderlich" });
      return;
    }
    setSaving(true);
    const res = await updateCompanyContextChunk(chunk.id, { content }, reason.trim());
    setSaving(false);
    if (!res.ok) {
      toast({ variant: "error", title: "Fehler", description: res.error });
      return;
    }
    toast({
      variant: res.embedded === false ? "warning" : "success",
      title: "Gespeichert",
      description:
        res.embedded === false
          ? "Re-Embedding fehlgeschlagen — wird beim nächsten Lauf nachgeholt."
          : "Re-Embedding läuft — Identitäts-Layer aktualisiert.",
    });
    onClose();
    router.refresh();
  }

  if (!mounted) return null;
  const changed = content !== chunk.content;

  return createPortal(
    <div
      className="kb-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Identitäts-Chunk bearbeiten"
    >
      <div className="kb-modal">
        <header className="kb-modal-head">
          <h2>Identitäts-Chunk bearbeiten</h2>
          <button className="kb-modal-close" onClick={onClose} disabled={saving} aria-label="Schließen">
            <X size={18} />
          </button>
        </header>
        <div className="kb-modal-body">
          <div className="kb-diff-label">{chunk.title}</div>
          <textarea
            className="kb-edit-area"
            style={{ minHeight: 180 }}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            aria-label="Inhalt"
          />
          <div className="kb-diff-label" style={{ marginTop: "var(--space-3)" }}>
            Grund für die Änderung (Pflicht)
          </div>
          <input
            className="kb-search"
            style={{ width: "100%" }}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="z.B. Telefonnummer der Geschäftsführung aktualisiert"
          />
        </div>
        <footer className="kb-modal-foot">
          <button className="kb-btn kb-btn--ghost" onClick={onClose} disabled={saving}>
            Abbrechen
          </button>
          <button className="kb-btn kb-btn--primary" onClick={save} disabled={saving || !reason.trim()}>
            {saving ? <Loader2 size={15} className="kb-spin" /> : <Save size={15} />}
            {changed ? "Speichern + Re-Embedding" : "Speichern"}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
