"use client";

import { useEffect, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { COLUMNS, type ColumnVisibility } from "@/lib/admin-users-preferences";

/**
 * Column-visibility dropdown for the User-Management toolbar (AP 3 Phase 4).
 * Hand-rolled popover (mirrors FilterDropdown — no Radix), listing the toggleable
 * columns as checkboxes. The trigger shows a badge with how many columns are
 * currently hidden. Closes on outside-click or Escape. The panel owns the
 * visibility map and persists it to localStorage.
 */
export function ColumnVisibilityDropdown({
  visibility,
  onChange,
}: {
  visibility: ColumnVisibility;
  onChange: (next: ColumnVisibility) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggleable = COLUMNS.filter((c) => c.toggleable);
  const hiddenCount = toggleable.filter((c) => !visibility[c.key]).length;

  return (
    <div className="uap-colvis" ref={ref}>
      <button
        type="button"
        className={`uap-fdrop-btn${hiddenCount ? " is-active" : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        <svg
          viewBox="0 0 24 24"
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M9 4v16M15 4v16" />
        </svg>
        <span>Spalten</span>
        {hiddenCount > 0 && <span className="uap-fdrop-count">{hiddenCount}</span>}
      </button>
      {open && (
        <div className="uap-fdrop-menu uap-colvis-menu" role="group" aria-label="Spalten ein-/ausblenden">
          {toggleable.map((c) => (
            <label key={c.key} className="uap-fdrop-item">
              <Checkbox
                checked={visibility[c.key]}
                onChange={(checked) => onChange({ ...visibility, [c.key]: checked })}
                aria-label={c.label}
              />
              <span className="uap-fdrop-item-label">{c.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
