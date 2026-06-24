"use client";

import { SearchIcon } from "@/components/shell/icons";
import type { ColumnVisibility } from "@/lib/admin-users-preferences";
import { FilterDropdown } from "./filter-dropdown";
import { FilterPill } from "./filter-pill";
import { ColumnVisibilityDropdown } from "./column-visibility-dropdown";

const STATUS_OPTIONS = [
  { value: "active", label: "Aktiv" },
  { value: "invited", label: "Eingeladen" },
  { value: "not_invited", label: "Ausstehend" },
];

/**
 * Search + filter toolbar for the User-Management panel (AP 3 Phase 3). Fully
 * controlled — the panel owns every value and applies the filters client-side
 * across all role sections. Search matches name / email / position.
 */
export function UserToolbar({
  q,
  onQ,
  departmentOptions,
  selectedDepartments,
  onDepartments,
  selectedStatuses,
  onStatuses,
  privateOnly,
  onPrivateOnly,
  noPhoto,
  onNoPhoto,
  hasActiveFilters,
  onReset,
  columnVisibility,
  onColumnVisibility,
}: {
  q: string;
  onQ: (v: string) => void;
  departmentOptions: { value: string; label: string }[];
  selectedDepartments: string[];
  onDepartments: (next: string[]) => void;
  selectedStatuses: string[];
  onStatuses: (next: string[]) => void;
  privateOnly: boolean;
  onPrivateOnly: (v: boolean) => void;
  noPhoto: boolean;
  onNoPhoto: (v: boolean) => void;
  hasActiveFilters: boolean;
  onReset: () => void;
  columnVisibility: ColumnVisibility;
  onColumnVisibility: (next: ColumnVisibility) => void;
}) {
  return (
    <div className="uap-toolbar">
      <div className="uap-search">
        <SearchIcon />
        <input
          type="search"
          value={q}
          onChange={(e) => onQ(e.target.value)}
          placeholder="Suchen: Name, E-Mail, Position…"
          aria-label="Personen suchen"
        />
      </div>

      <FilterDropdown
        label="Department"
        options={departmentOptions}
        selected={selectedDepartments}
        onChange={onDepartments}
      />
      <FilterDropdown
        label="Status"
        options={STATUS_OPTIONS}
        selected={selectedStatuses}
        onChange={onStatuses}
      />

      <FilterPill label="Nur Privat-E-Mail" active={privateOnly} onClick={() => onPrivateOnly(!privateOnly)} />
      <FilterPill label="Ohne Foto" active={noPhoto} onClick={() => onNoPhoto(!noPhoto)} />

      {hasActiveFilters && (
        <button type="button" className="uap-reset" onClick={onReset}>
          Zurücksetzen
        </button>
      )}

      <div className="uap-toolbar-end">
        <ColumnVisibilityDropdown visibility={columnVisibility} onChange={onColumnVisibility} />
      </div>
    </div>
  );
}
