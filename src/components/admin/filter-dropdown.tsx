"use client";

import { useEffect, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * Multi-select filter dropdown (hand-rolled popover, no Radix). The trigger shows
 * the label plus a count badge when anything is selected; the menu lists the
 * options as checkboxes. Closes on outside-click or Escape.
 */
export function FilterDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
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

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  return (
    <div className="uap-fdrop" ref={ref}>
      <button
        type="button"
        className={`uap-fdrop-btn${selected.length ? " is-active" : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        <span>{label}</span>
        {selected.length > 0 && <span className="uap-fdrop-count">{selected.length}</span>}
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="uap-fdrop-menu" role="group" aria-label={label}>
          {options.length === 0 ? (
            <p className="uap-fdrop-empty">Keine Optionen</p>
          ) : (
            options.map((o) => (
              <label key={o.value} className="uap-fdrop-item">
                <Checkbox
                  checked={selected.includes(o.value)}
                  onChange={() => toggle(o.value)}
                  aria-label={o.label}
                />
                <span className="uap-fdrop-item-label">{o.label}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}
