"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle";
import { FilterSortPopover, type LibraryFilter } from "./filter-sort-popover";

/**
 * Shared library toolbar (search + Filter/Sort popover + view toggle + a ghost
 * secondary action + the single primary action), used by BOTH the Document-
 * Library root and a folder page so they look identical. The Document library
 * offers only card/list (no grid). Exactly one primary (blue) button per view.
 * All strings are English.
 */
export function LibraryToolbar({
  searchValue,
  onSearch,
  searchPlaceholder = "Search files…",
  filter,
  onFilter,
  showFolderToggle = true,
  showTypeFilter = true,
  view,
  onView,
  viewStorageKey,
  actionLabel,
  actionIcon,
  onAction,
  secondaryLabel,
  secondaryIcon,
  onSecondary,
}: {
  searchValue: string;
  onSearch: (v: string) => void;
  searchPlaceholder?: string;
  filter: LibraryFilter;
  onFilter: (f: LibraryFilter) => void;
  showFolderToggle?: boolean;
  showTypeFilter?: boolean;
  view: ViewMode;
  onView: (v: ViewMode) => void;
  viewStorageKey: string;
  actionLabel?: string;
  actionIcon?: ReactNode;
  onAction?: () => void;
  secondaryLabel?: string;
  secondaryIcon?: ReactNode;
  onSecondary?: () => void;
}) {
  return (
    <div className="dl-toolbar">
      <div className="dl-search">
        {/* Same lucide Search icon as the DocumentsSidebar search. */}
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          value={searchValue}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
        />
      </div>
      <div className="dl-toolbar-right">
        <FilterSortPopover
          value={filter}
          onChange={onFilter}
          showFolderToggle={showFolderToggle}
          showTypeFilter={showTypeFilter}
        />
        <ViewToggle value={view} onChange={onView} storageKey={viewStorageKey} allowed={["card", "list"]} />
        {secondaryLabel && onSecondary && (
          <button type="button" className="dl-btn ghost" onClick={onSecondary}>
            {secondaryIcon}
            {secondaryLabel}
          </button>
        )}
        {actionLabel && onAction && (
          <button type="button" className="dl-btn primary" onClick={onAction}>
            {actionIcon ?? (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            )}
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
