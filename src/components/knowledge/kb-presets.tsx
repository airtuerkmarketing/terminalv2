"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, Trash2, Check } from "lucide-react";
import type { ChunkLayer, TagAxis } from "@/lib/knowledge/types";

export interface FilterState {
  search: string;
  layers: ChunkLayer[];
  sort: string;
  axes: Record<TagAxis, string[]>;
}

interface Preset {
  name: string;
  state: FilterState;
}

const KEY = "kb_filter_presets";
const MAX = 10;

function load(): Preset[] {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(r) ? r : [];
  } catch {
    return [];
  }
}

/** Save / recall named filter combinations in localStorage (max 10). */
export function KbPresets({
  current,
  onApply,
}: {
  current: FilterState;
  onApply: (s: FilterState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [name, setName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setPresets(load()), []);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function persist(next: Preset[]) {
    setPresets(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage full / disabled — non-critical */
    }
  }
  function save() {
    const n = name.trim();
    if (!n) return;
    persist([...presets.filter((p) => p.name !== n), { name: n, state: current }].slice(-MAX));
    setName("");
  }

  const isActive = (p: Preset) => JSON.stringify(p.state) === JSON.stringify(current);

  return (
    <div className="kb-fdrop" ref={ref}>
      <button type="button" className="kb-fdrop-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Bookmark size={13} aria-hidden="true" />
        <span>Preset</span>
        {presets.length > 0 && <span className="kb-fdrop-badge">{presets.length}</span>}
      </button>
      {open && (
        <div className="kb-fdrop-menu" role="group" aria-label="Filter presets">
          <div className="kb-fdrop-search">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
              }}
              placeholder="Save current filters as…"
              aria-label="Preset name"
            />
            <button
              type="button"
              className="kb-fdrop-manage"
              onClick={save}
              disabled={!name.trim() || presets.length >= MAX}
            >
              Save
            </button>
          </div>
          <div className="kb-fdrop-list">
            {presets.length === 0 ? (
              <p className="kb-fdrop-empty">No presets yet</p>
            ) : (
              presets.map((p) => (
                <div key={p.name} className="kb-fdrop-row" style={{ cursor: "default" }}>
                  <span className={`kb-fdrop-check${isActive(p) ? " is-on" : ""}`} aria-hidden="true">
                    {isActive(p) && <Check size={12} />}
                  </span>
                  <button
                    type="button"
                    className="kb-preset-apply"
                    onClick={() => {
                      onApply(p.state);
                      setOpen(false);
                    }}
                  >
                    {p.name}
                  </button>
                  <button
                    type="button"
                    className="kb-preset-del"
                    onClick={() => persist(presets.filter((x) => x.name !== p.name))}
                    aria-label={`Delete ${p.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
          {presets.length >= MAX && (
            <div className="kb-fdrop-foot">
              <span className="kb-fdrop-search-count">Max {MAX} presets reached</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
