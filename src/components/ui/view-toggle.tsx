"use client";

import { useEffect } from "react";
import { Grid3x3, LayoutGrid, List } from "lucide-react";

export type ViewMode = "grid" | "card" | "list";

const OPTIONS: { value: ViewMode; label: string; Icon: typeof Grid3x3 }[] = [
  { value: "grid", label: "Grid view", Icon: Grid3x3 },
  { value: "card", label: "Card view", Icon: LayoutGrid },
  { value: "list", label: "List view", Icon: List },
];

function isViewMode(v: string | null): v is ViewMode {
  return v === "grid" || v === "card" || v === "list";
}

/**
 * Three-way layout switch (grid / card / list), shared by the Asset and
 * Document libraries. Controlled: the parent owns `value`; this component owns
 * persistence via `storageKey`.
 *
 * SSR-safe: the parent's initial state must be the default ("card"), matching
 * the server HTML. On mount this effect reads localStorage and lifts any stored
 * choice up via onChange — so the first client render still matches SSR (no
 * hydration mismatch); a stored value applies one tick later.
 */
export function ViewToggle({
  value,
  onChange,
  storageKey,
  allowed,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
  storageKey: string;
  /** Which modes this toggle offers. Defaults to all three; the Document library
   *  passes ["card","list"] (no grid) without changing the shared Asset toggle. */
  allowed?: ViewMode[];
}) {
  const shown = allowed ? OPTIONS.filter((o) => allowed.includes(o.value)) : OPTIONS;
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      // Don't lift a stored mode this toggle no longer offers (e.g. an old "grid").
      const ok = isViewMode(stored) && (!allowed || allowed.includes(stored));
      if (ok && stored !== value) onChange(stored as ViewMode);
    } catch {
      // localStorage unavailable — keep the default.
    }
    // Run once on mount per storageKey; onChange/value are intentionally omitted
    // (this is a one-shot hydration of the persisted choice).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  function select(v: ViewMode) {
    onChange(v);
    try {
      localStorage.setItem(storageKey, v);
    } catch {
      // localStorage unavailable — selection still applies for this session.
    }
  }

  return (
    <div className="view-toggle" role="group" aria-label="View mode">
      {shown.map(({ value: v, label, Icon }) => (
        <button
          key={v}
          type="button"
          className={`view-toggle-btn${value === v ? " active" : ""}`}
          aria-label={label}
          aria-pressed={value === v}
          title={label}
          onClick={() => select(v)}
        >
          <Icon aria-hidden />
        </button>
      ))}
    </div>
  );
}
