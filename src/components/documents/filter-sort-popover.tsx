"use client";

import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, Check, ArrowUp, ArrowDown } from "lucide-react";
import type { FileSortKey } from "@/lib/documents";
import type { FileKind } from "@/lib/documents-constants";

/**
 * Combined Filter / Sort popover used by the LibraryToolbar (replaces the bare
 * sort <select>). Sort drives the existing sort mechanism; the type filter +
 * "show" toggle are applied CLIENT-side by the parent over the already-loaded
 * list (no new server call). The trigger shows an active-count dot when any
 * filter is set. Closes on outside-click / Esc.
 */

export type SortDir = "asc" | "desc";
export interface LibraryFilter {
  sort: FileSortKey;
  dir: SortDir;
  kinds: FileKind[]; // empty = all types
  show: "all" | "folders" | "files";
}

export const DEFAULT_FILTER: LibraryFilter = { sort: "name", dir: "asc", kinds: [], show: "all" };
/** A filter is "active" only for type/show — sort alone is not a filter. */
export const isFilterActive = (f: LibraryFilter) => f.kinds.length > 0 || f.show !== "all";

const SORTS: { key: FileSortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "size", label: "Size" },
  { key: "date", label: "Modified" },
];
const KIND_CHIPS: { kind: FileKind; label: string }[] = [
  { kind: "pdf", label: "PDF" },
  { kind: "word", label: "Word" },
  { kind: "excel", label: "Excel" },
  { kind: "ppt", label: "PPT" },
  { kind: "image", label: "Image" },
  { kind: "txt", label: "Text" },
];
const SHOWS: { key: LibraryFilter["show"]; label: string }[] = [
  { key: "all", label: "All" },
  { key: "folders", label: "Folders" },
  { key: "files", label: "Files" },
];

export function FilterSortPopover({
  value,
  onChange,
  showFolderToggle = true,
  showTypeFilter = true,
}: {
  value: LibraryFilter;
  onChange: (f: LibraryFilter) => void;
  /** Root index has no files to hide, so the "All / Folders / Files" row is off there. */
  showFolderToggle?: boolean;
  /** Root index lists folders only (no extensions), so the type chips are off there. */
  showTypeFilter?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = isFilterActive(value);
  const count = value.kinds.length + (value.show !== "all" ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggleKind = (k: FileKind) => {
    const has = value.kinds.includes(k);
    onChange({ ...value, kinds: has ? value.kinds.filter((x) => x !== k) : [...value.kinds, k] });
  };

  return (
    <div className="dl-fsp" ref={rootRef}>
      <button
        type="button"
        className={`dl-btn ghost dl-fsp-btn${active ? " is-active" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <SlidersHorizontal size={16} aria-hidden="true" />
        Filter / Sort
        {active && <span className="dl-fsp-dot">{count}</span>}
      </button>

      {open && (
        <div className="dl-fsp-panel" role="dialog" aria-label="Filter and sort">
          <div className="dl-fsp-group">
            <span className="dl-fsp-glabel">Sort by</span>
            <div className="dl-fsp-sorts">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className={`dl-fsp-opt${value.sort === s.key ? " is-on" : ""}`}
                  onClick={() => onChange({ ...value, sort: s.key })}
                >
                  <span className="dl-fsp-check">{value.sort === s.key && <Check size={14} aria-hidden="true" />}</span>
                  {s.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="dl-fsp-dir"
              onClick={() => onChange({ ...value, dir: value.dir === "asc" ? "desc" : "asc" })}
            >
              {value.dir === "asc" ? <ArrowUp size={14} aria-hidden="true" /> : <ArrowDown size={14} aria-hidden="true" />}
              {value.dir === "asc" ? "Ascending" : "Descending"}
            </button>
          </div>

          {showTypeFilter && (
            <>
              <div className="dl-fsp-sep" />
              <div className="dl-fsp-group">
                <span className="dl-fsp-glabel">File type</span>
                <div className="dl-fsp-chips">
                  {KIND_CHIPS.map((c) => (
                    <button
                      key={c.kind}
                      type="button"
                      className={`dl-fsp-chip${value.kinds.includes(c.kind) ? " is-on" : ""}`}
                      aria-pressed={value.kinds.includes(c.kind)}
                      onClick={() => toggleKind(c.kind)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {showFolderToggle && (
            <>
              <div className="dl-fsp-sep" />
              <div className="dl-fsp-group">
                <span className="dl-fsp-glabel">Show</span>
                <div className="dl-fsp-segment">
                  {SHOWS.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      className={`dl-fsp-seg${value.show === s.key ? " is-on" : ""}`}
                      onClick={() => onChange({ ...value, show: s.key })}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {active && (
            <button
              type="button"
              className="dl-fsp-clear"
              onClick={() => onChange({ ...value, kinds: [], show: "all" })}
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
