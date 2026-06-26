"use client";

import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle";
import type { FileSortKey } from "@/lib/documents";

/**
 * Shared library toolbar (search + sort + view toggle + primary action), used by
 * BOTH the Document-Library root and a folder page so they look identical. The
 * Document library offers only card/list (no grid). All strings are English.
 */
export function LibraryToolbar({
  searchValue,
  onSearch,
  searchPlaceholder = "Search files…",
  sort,
  onSort,
  view,
  onView,
  viewStorageKey,
  actionLabel,
  onAction,
}: {
  searchValue: string;
  onSearch: (v: string) => void;
  searchPlaceholder?: string;
  sort: FileSortKey;
  onSort: (s: FileSortKey) => void;
  view: ViewMode;
  onView: (v: ViewMode) => void;
  viewStorageKey: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="dl-toolbar">
      <div className="dl-search">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={searchValue}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
        />
      </div>
      <div className="dl-toolbar-right">
        <select
          className="dl-sort"
          value={sort}
          onChange={(e) => onSort(e.target.value as FileSortKey)}
          aria-label="Sort by"
        >
          <option value="name">Name</option>
          <option value="size">Size</option>
          <option value="date">Modified</option>
        </select>
        <ViewToggle value={view} onChange={onView} storageKey={viewStorageKey} allowed={["card", "list"]} />
        {actionLabel && onAction && (
          <button type="button" className="dl-btn primary" onClick={onAction}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
