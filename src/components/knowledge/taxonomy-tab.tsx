"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check, X, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { createVocabTerm, deleteVocabTerm, reviewSuggestion } from "@/lib/knowledge/actions";
import { TAG_AXES, type TagAxis, type VocabTerm, type TagSuggestion } from "@/lib/knowledge/types";

const AXIS_LABEL: Record<TagAxis, string> = {
  topic: "Themen",
  airline: "Airlines",
  department: "Abteilungen",
  provider: "Provider",
  brand: "Brands",
};

export function TaxonomyTab({ vocab, suggestions }: { vocab: VocabTerm[]; suggestions: TagSuggestion[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [addAxis, setAddAxis] = useState<TagAxis | null>(null);
  const [val, setVal] = useState("");
  const [label, setLabel] = useState("");

  async function add(axis: TagAxis) {
    if (!val.trim() || !label.trim()) return;
    setBusy("add");
    const res = await createVocabTerm({ axis, value: val.trim(), labelDe: label.trim() });
    setBusy(null);
    if (!res.ok) return toast({ variant: "error", title: "Fehler", description: res.error });
    toast({ variant: "success", title: "Tag hinzugefügt" });
    setVal(""); setLabel(""); setAddAxis(null);
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(id);
    const res = await deleteVocabTerm(id);
    setBusy(null);
    if (!res.ok) return toast({ variant: "error", title: "Fehler", description: res.error });
    router.refresh();
  }

  async function review(id: string, decision: "approved" | "rejected") {
    setBusy(id);
    const res = await reviewSuggestion(id, decision);
    setBusy(null);
    if (!res.ok) return toast({ variant: "error", title: "Fehler", description: res.error });
    toast({ variant: "info", title: decision === "approved" ? "Vorschlag übernommen" : "Vorschlag abgelehnt" });
    router.refresh();
  }

  return (
    <div>
      {suggestions.length > 0 && (
        <div style={{ marginBottom: "var(--space-5)" }}>
          <div className="kb-rev-section-title">KI-Vorschläge ({suggestions.length})</div>
          <div className="kb-tax-rows">
            {suggestions.map((s) => (
              <span key={s.id} className="kb-tax-row">
                <b>{AXIS_LABEL[s.axis]}:</b> {s.suggestedValue}
                <button disabled={busy === s.id} onClick={() => review(s.id, "approved")} aria-label="Übernehmen" style={{ color: "var(--success)" }}>
                  {busy === s.id ? <Loader2 size={13} className="kb-spin" /> : <Check size={13} />}
                </button>
                <button disabled={busy === s.id} onClick={() => review(s.id, "rejected")} aria-label="Ablehnen">
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {TAG_AXES.map((axis) => {
        const terms = vocab.filter((v) => v.axis === axis);
        return (
          <section key={axis} className="kb-tax-axis">
            <div className="kb-tax-axis-head">
              <span className="kb-tax-axis-name">{AXIS_LABEL[axis]} ({terms.length})</span>
              <button className="kb-chip" onClick={() => setAddAxis(addAxis === axis ? null : axis)}>
                <Plus size={13} /> Tag
              </button>
            </div>

            {addAxis === axis && (
              <div className="kb-toolbar" style={{ marginBottom: "var(--space-2)" }}>
                <input className="kb-search" placeholder="wert (z.B. pegasus)" value={val} onChange={(e) => setVal(e.target.value)} />
                <input className="kb-search" placeholder="Label (z.B. Pegasus)" value={label} onChange={(e) => setLabel(e.target.value)} />
                <button className="kb-btn kb-btn--primary" disabled={busy === "add" || !val.trim() || !label.trim()} onClick={() => add(axis)}>
                  {busy === "add" ? <Loader2 size={15} className="kb-spin" /> : <Plus size={15} />} Hinzufügen
                </button>
              </div>
            )}

            {terms.length === 0 ? (
              <p className="kb-resultcount">Noch keine Tags.</p>
            ) : (
              <div className="kb-tax-rows">
                {terms.map((t) => (
                  <span key={t.id} className="kb-tax-row">
                    {t.labelDe}
                    {t.citedCount > 0 && <span style={{ color: "var(--text-3)" }}> ·{t.citedCount}</span>}
                    <button disabled={busy === t.id} onClick={() => remove(t.id)} aria-label={`${t.labelDe} löschen`}>
                      {busy === t.id ? <Loader2 size={13} className="kb-spin" /> : <Trash2 size={13} />}
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
