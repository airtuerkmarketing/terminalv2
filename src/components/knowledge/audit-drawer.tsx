"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";
import { loadChunkAudit } from "@/lib/knowledge/actions";
import type { ChunkEditLogEntry, ChunkLayer, KnowledgeChunk } from "@/lib/knowledge/types";

const TABLE_FOR_LAYER: Record<ChunkLayer, string> = {
  company: "company_context",
  confluence: "confluence_chunks",
  brand: "brand_chunks",
};

export function AuditDrawer({ chunk, onClose }: { chunk: KnowledgeChunk; onClose: () => void }) {
  const [entries, setEntries] = useState<ChunkEditLogEntry[] | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    let alive = true;
    loadChunkAudit(TABLE_FOR_LAYER[chunk.layer], chunk.id).then((e) => {
      if (alive) setEntries(e);
    });
    return () => {
      alive = false;
    };
  }, [chunk]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="kb-drawer-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside className="kb-drawer" role="dialog" aria-modal="true" aria-label="History">
        <header className="kb-drawer-head">
          <div>
            <div className="kb-drawer-title">{chunk.title}</div>
            <div className="kb-drawer-sub">
              {chunk.layer} · {chunk.sourceType} · id {chunk.id}
            </div>
          </div>
          <button className="kb-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="kb-drawer-body">
          <div className="kb-audit-item">
            <div className="kb-audit-when">
              {new Date(chunk.createdAt).toLocaleString("de-DE")} · System
            </div>
            <div className="kb-audit-text">
              Initial embedding · {chunk.hasEmbedding ? "Embedding active" : "no embedding"} ·
              Retrieved ×{chunk.retrievedCount}
            </div>
          </div>

          {entries === null ? (
            <div className="kb-audit-empty">
              <Loader2 size={14} className="kb-spin" /> Loading…
            </div>
          ) : entries.length === 0 ? (
            <div className="kb-audit-empty">No manual changes recorded yet.</div>
          ) : (
            entries.map((e) => (
              <div key={e.id} className="kb-audit-item">
                <div className="kb-audit-when">
                  {new Date(e.createdAt).toLocaleString("de-DE")} · {e.editedByName ?? "—"}
                </div>
                <div className="kb-audit-text">
                  <b>Reason:</b> {e.editReason}
                </div>
                {e.diffBefore != null && (
                  <div className="kb-diff-box kb-diff-box--old" style={{ marginTop: 6 }}>
                    {e.diffBefore.slice(0, 300)}
                    {e.diffBefore.length > 300 ? "…" : ""}
                  </div>
                )}
                {e.diffAfter != null && (
                  <div className="kb-diff-box kb-diff-box--new" style={{ marginTop: 6 }}>
                    {e.diffAfter.slice(0, 300)}
                    {e.diffAfter.length > 300 ? "…" : ""}
                  </div>
                )}
                {e.sourceCorrectionId && (
                  <div className="kb-audit-src">from correction #{e.sourceCorrectionId.slice(0, 8)}</div>
                )}
              </div>
            ))
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
