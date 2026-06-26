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
      toast({ variant: "error", title: "Reason required" });
      return;
    }
    setSaving(true);
    const res = await updateCompanyContextChunk(chunk.id, { content }, reason.trim());
    setSaving(false);
    if (!res.ok) {
      toast({ variant: "error", title: "Error", description: res.error });
      return;
    }
    toast({
      variant: res.embedded === false ? "warning" : "success",
      title: "Saved",
      description:
        res.embedded === false
          ? "Re-embedding failed — it will be retried on the next run."
          : "Re-embedding is running — identity layer updated.",
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
      aria-label="Edit identity chunk"
    >
      <div className="kb-modal">
        <header className="kb-modal-head">
          <h2>Edit identity chunk</h2>
          <button className="kb-modal-close" onClick={onClose} disabled={saving} aria-label="Close">
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
            aria-label="Content"
          />
          <div className="kb-diff-label" style={{ marginTop: "var(--space-3)" }}>
            Reason for the change (required)
          </div>
          <input
            className="kb-search"
            style={{ width: "100%" }}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. updated the management phone number"
          />
        </div>
        <footer className="kb-modal-foot">
          <button className="kb-btn kb-btn--ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="kb-btn kb-btn--primary" onClick={save} disabled={saving || !reason.trim()}>
            {saving ? <Loader2 size={15} className="kb-spin" /> : <Save size={15} />}
            {changed ? "Save + Re-embed" : "Save"}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
