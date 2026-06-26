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
      toast({ variant: "error", title: "Error", description: res.error });
      return;
    }
    toast({
      variant: res.embedded === false ? "warning" : "success",
      title: "Entry created",
      description:
        res.embedded === false
          ? "Re-embedding will follow on the next run."
          : "Embedded — the AI will use it from the next query onward.",
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
      aria-label="New identity entry"
    >
      <div className="kb-modal">
        <header className="kb-modal-head">
          <h2>New identity entry</h2>
          <button className="kb-modal-close" onClick={onClose} disabled={saving} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="kb-modal-body">
          <div className="kb-diff-label">Title</div>
          <input className="kb-search" style={{ width: "100%" }} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Escalation path accounting" />
          <div className="kb-diff-label" style={{ marginTop: "var(--space-3)" }}>Category</div>
          <input className="kb-search" style={{ width: "100%" }} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. process, team_structure, mission" />
          <div className="kb-diff-label" style={{ marginTop: "var(--space-3)" }}>Content</div>
          <textarea className="kb-edit-area" style={{ minHeight: 140 }} value={content} onChange={(e) => setContent(e.target.value)} placeholder="The knowledge/identity fact the AI should know…" />
          <div className="kb-diff-label" style={{ marginTop: "var(--space-3)" }}>Reason (required)</div>
          <input className="kb-search" style={{ width: "100%" }} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. New escalation rule from 07/2026" />
          <p className="kb-resultcount" style={{ marginTop: "var(--space-3)" }}>
            Note: Operational facts are better added via the AI chat → “Correct”.
            Confluence/brand content comes from its own sources.
          </p>
        </div>
        <footer className="kb-modal-foot">
          <button className="kb-btn kb-btn--ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="kb-btn kb-btn--primary" onClick={save} disabled={saving || !valid}>
            {saving ? <Loader2 size={15} className="kb-spin" /> : <Plus size={15} />} Create + embedding
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
