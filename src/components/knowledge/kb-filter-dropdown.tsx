"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Search, Check } from "lucide-react";

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

/**
 * Per-axis multi-select filter dropdown (hand-rolled, no Radix) with search-inside,
 * per-value counts, and a "Tag verwalten →" link. Whitelist semantics: empty
 * selection = no filter (badge "Alle"); checking values narrows to them.
 */
export function KbFilterDropdown({
  label,
  icon,
  options,
  selected,
  onChange,
  onManage,
}: {
  label: string;
  icon?: ReactNode;
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  onManage?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 0);
    else setQ("");
  }, [open]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n
      ? options.filter((o) => o.label.toLowerCase().includes(n) || o.value.toLowerCase().includes(n))
      : options;
  }, [options, q]);

  function toggle(v: string) {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  }

  return (
    <div className="kb-fdrop" ref={ref}>
      <button
        type="button"
        className={`kb-fdrop-btn${selected.length ? " is-active" : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        {icon}
        <span>{label}</span>
        <span className={`kb-fdrop-badge${selected.length ? " is-active" : ""}`}>
          {selected.length || "Alle"}
        </span>
        <ChevronDown size={13} aria-hidden="true" />
      </button>

      {open && (
        <div className="kb-fdrop-menu" role="group" aria-label={label}>
          <div className="kb-fdrop-search">
            <Search size={14} aria-hidden="true" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`${label} durchsuchen…`}
              aria-label={`${label} durchsuchen`}
            />
            <span className="kb-fdrop-search-count">
              {filtered.length}/{options.length}
            </span>
          </div>

          <div className="kb-fdrop-list">
            {filtered.length === 0 ? (
              <p className="kb-fdrop-empty">Keine Treffer</p>
            ) : (
              filtered.map((o) => {
                const on = selected.includes(o.value);
                return (
                  <button
                    type="button"
                    key={o.value}
                    className="kb-fdrop-row"
                    onClick={() => toggle(o.value)}
                    aria-pressed={on}
                  >
                    <span className={`kb-fdrop-check${on ? " is-on" : ""}`} aria-hidden="true">
                      {on && <Check size={12} />}
                    </span>
                    <span className="kb-fdrop-row-label">{o.label}</span>
                    <span className="kb-fdrop-row-count">{o.count}</span>
                  </button>
                );
              })
            )}
          </div>

          <div className="kb-fdrop-foot">
            <button
              type="button"
              className="kb-fdrop-clear"
              onClick={() => onChange([])}
              disabled={!selected.length}
            >
              Alle abwählen
            </button>
            {onManage && (
              <button
                type="button"
                className="kb-fdrop-manage"
                onClick={() => {
                  setOpen(false);
                  onManage();
                }}
              >
                Tag verwalten →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
