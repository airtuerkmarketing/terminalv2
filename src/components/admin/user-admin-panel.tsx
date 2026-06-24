"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TeamMemberListItem } from "@/lib/users";
import { isCorpEmail } from "@/lib/corp-email";
import { useDebouncedCallback } from "@/lib/use-debounced-callback";
import {
  COLUMNS,
  DEFAULT_VISIBILITY,
  compareBySort,
  loadColumnVisibility,
  saveColumnVisibility,
  type ColumnVisibility,
  type SortKey,
  type SortState,
} from "@/lib/admin-users-preferences";
import { UserSection } from "./user-section";
import { UserToolbar } from "./user-toolbar";
import { SortableHeader } from "./sortable-header";
import { UserDetailModal } from "./user-detail-modal";
import { CreatePersonModal } from "./create-person-modal";
import "@/styles/user-admin.css";

export interface UserAdminPanelFilters {
  q?: string;
  departments?: string[];
  statuses?: string[];
  /** Only members with a non-corporate (invite-blocked) email. */
  privateOnly?: boolean;
  /** Only members without an avatar photo. */
  noPhoto?: boolean;
}

// Role sections in display order. `key` doubles as the grouping + sessionStorage
// key ("null" = no linked profile yet). super_admin uses --torch — it matches the
// existing super_admin role pill in this panel, so the highest tier stands apart
// from the Quantum-Blue admin accent; user/null stay muted (--text-3).
const ROLE_SECTIONS: { key: string; label: string; color: string }[] = [
  { key: "super_admin", label: "Super-Admin", color: "var(--torch)" },
  { key: "admin", label: "Admin", color: "var(--accent)" },
  { key: "user", label: "User", color: "var(--text-3)" },
  { key: "null", label: "Ohne Rolle", color: "var(--text-3)" },
];

// Default collapse state: the two privileged groups open, the rest collapsed.
const DEFAULT_COLLAPSED: Record<string, boolean> = {
  super_admin: false,
  admin: false,
  user: true,
  null: true,
};

const SECTION_STORAGE_KEY = "admin-users-section-collapse";

/**
 * User-Management table (Stage 7A + AP 3 Phase 1+3+4): the team-member directory
 * grouped into collapsible role sections, with a search + filter toolbar, sortable
 * column headers and a column-visibility dropdown — all applied client-side over
 * the full (~63-row) set passed from the server. Filter + sort state is mirrored
 * into the URL via history.replaceState (bookmarkable, no server refetch) and
 * seeded back from the server-parsed searchParams; column visibility persists in
 * localStorage. Only non-empty sections render. Clicking a row opens the
 * read-only detail modal.
 */
export function UserAdminPanel({
  teamMembers,
  totalCount,
  departments,
  initialFilters,
  initialSort,
  currentUserId,
}: {
  teamMembers: TeamMemberListItem[];
  totalCount: number;
  /** All distinct department values (the dropdown options). */
  departments: string[];
  initialFilters: UserAdminPanelFilters;
  /** Sort seeded from the URL (?sort=&dir=); { key: null } = default order. */
  initialSort: SortState;
  /** Forwarded to the detail modal; reserved for the Stage 7C self-lock. */
  currentUserId: string;
}) {
  const [q, setQ] = useState(initialFilters.q ?? "");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(
    initialFilters.departments ?? []
  );
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(initialFilters.statuses ?? []);
  const [privateOnly, setPrivateOnly] = useState(initialFilters.privateOnly ?? false);
  const [noPhoto, setNoPhoto] = useState(initialFilters.noPhoto ?? false);
  const [sort, setSort] = useState<SortState>(initialSort);

  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const closeModal = useCallback(() => setOpenUserId(null), []);
  const closeCreate = useCallback(() => setCreateOpen(false), []);
  const openUser = openUserId
    ? teamMembers.find((u) => u.teamMemberId === openUserId) ?? null
    : null;

  // Collapse state. Starts from the defaults (matches the server HTML), then a
  // stored override is applied one tick later on mount — no hydration mismatch.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(DEFAULT_COLLAPSED);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SECTION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        setCollapsed((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // sessionStorage unavailable — keep the defaults.
    }
  }, []);
  const toggleSection = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        sessionStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore persistence failures — the toggle still applies for this view.
      }
      return next;
    });
  }, []);

  // Column visibility. Same default-then-override pattern as the collapse state:
  // the server HTML + first client render use DEFAULT_VISIBILITY, then the stored
  // override is applied post-mount (localStorage, per-device).
  const [visibility, setVisibility] = useState<ColumnVisibility>(DEFAULT_VISIBILITY);
  useEffect(() => {
    setVisibility(loadColumnVisibility());
  }, []);
  const updateVisibility = useCallback((next: ColumnVisibility) => {
    setVisibility(next);
    saveColumnVisibility(next);
  }, []);

  // Tri-state cycle on a sortable header: default → asc → desc → default.
  const cycleSort = useCallback((key: SortKey) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return { key: null, dir: "asc" };
    });
  }, []);

  // Mirror filters + sort into the URL (debounced so typing doesn't spam history).
  // history.replaceState keeps it bookmarkable WITHOUT a server refetch (the page
  // is a Server Component; router.replace would re-run getAllTeamMembers).
  const syncUrl = useDebouncedCallback(() => {
    const params = new URLSearchParams();
    const qt = q.trim();
    if (qt) params.set("q", qt);
    if (selectedDepartments.length) params.set("dept", selectedDepartments.join(","));
    if (selectedStatuses.length) params.set("status", selectedStatuses.join(","));
    if (privateOnly) params.set("privateOnly", "1");
    if (noPhoto) params.set("noPhoto", "1");
    if (sort.key) {
      params.set("sort", sort.key);
      if (sort.dir === "desc") params.set("dir", "desc");
    }
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, 300);
  useEffect(() => {
    syncUrl();
  }, [q, selectedDepartments, selectedStatuses, privateOnly, noPhoto, sort, syncUrl]);

  const hasActiveFilters =
    q !== "" ||
    selectedDepartments.length > 0 ||
    selectedStatuses.length > 0 ||
    privateOnly ||
    noPhoto;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return teamMembers.filter((u) => {
      if (selectedDepartments.length && (!u.department || !selectedDepartments.includes(u.department)))
        return false;
      if (selectedStatuses.length && !selectedStatuses.includes(u.loginStatus)) return false;
      if (privateOnly && !(u.email && !isCorpEmail(u.email))) return false;
      if (noPhoto && u.avatarUrl) return false;
      if (
        needle &&
        !`${u.firstName} ${u.lastName} ${u.email ?? ""} ${u.position ?? ""}`
          .toLowerCase()
          .includes(needle)
      )
        return false;
      return true;
    });
  }, [teamMembers, q, selectedDepartments, selectedStatuses, privateOnly, noPhoto]);

  // Group the filtered set by role, then sort within each group by the active
  // sort (grouping is preserved — sort is global but applied inside each section).
  const grouped = useMemo(() => {
    const map: Record<string, TeamMemberListItem[]> = {
      super_admin: [],
      admin: [],
      user: [],
      null: [],
    };
    for (const u of filtered) map[u.role ?? "null"].push(u);
    for (const bucket of Object.values(map)) bucket.sort((a, b) => compareBySort(a, b, sort));
    return map;
  }, [filtered, sort]);

  const visibleSections = ROLE_SECTIONS.map((s) => ({ ...s, users: grouped[s.key] })).filter(
    (s) => s.users.length > 0
  );

  const visibleColumns = useMemo(() => COLUMNS.filter((c) => visibility[c.key]), [visibility]);
  const colSpan = visibleColumns.length;

  const departmentOptions = useMemo(
    () => departments.map((d) => ({ value: d, label: d })),
    [departments]
  );

  function resetFilters() {
    setQ("");
    setSelectedDepartments([]);
    setSelectedStatuses([]);
    setPrivateOnly(false);
    setNoPhoto(false);
  }

  return (
    <div className="uap">
      <header className="uap-head">
        <h1 className="uap-title">User-Management</h1>
        <p className="uap-sub">
          {filtered.length} von {totalCount} Personen
        </p>
      </header>

      <UserToolbar
        q={q}
        onQ={setQ}
        departmentOptions={departmentOptions}
        selectedDepartments={selectedDepartments}
        onDepartments={setSelectedDepartments}
        selectedStatuses={selectedStatuses}
        onStatuses={setSelectedStatuses}
        privateOnly={privateOnly}
        onPrivateOnly={setPrivateOnly}
        noPhoto={noPhoto}
        onNoPhoto={setNoPhoto}
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
        columnVisibility={visibility}
        onColumnVisibility={updateVisibility}
        onCreatePersonClick={() => setCreateOpen(true)}
      />

      <div className="uap-table-wrap">
        <table className="uap-table">
          <thead>
            <tr>
              {visibleColumns.map((col) => {
                if (col.key === "avatar") {
                  return (
                    <th key={col.key} className="uap-cell-avatar">
                      <span className="uap-sr">Avatar</span>
                    </th>
                  );
                }
                if (col.sortKey) {
                  const isActive = sort.key === col.sortKey;
                  return (
                    <SortableHeader
                      key={col.key}
                      label={col.label}
                      active={isActive}
                      dir={isActive ? sort.dir : "asc"}
                      onSort={() => cycleSort(col.sortKey!)}
                    />
                  );
                }
                return <th key={col.key}>{col.label}</th>;
              })}
            </tr>
          </thead>
          {filtered.length === 0 ? (
            <tbody>
              <tr>
                <td className="uap-empty" colSpan={colSpan}>
                  Keine Personen gefunden{q.trim() ? ` für „${q.trim()}“` : ""}.
                  {hasActiveFilters && (
                    <button type="button" className="uap-empty-reset" onClick={resetFilters}>
                      Filter zurücksetzen
                    </button>
                  )}
                </td>
              </tr>
            </tbody>
          ) : (
            visibleSections.map((s) => (
              <UserSection
                key={s.key}
                label={s.label}
                color={s.color}
                users={s.users}
                collapsed={collapsed[s.key] ?? false}
                colSpan={colSpan}
                visibility={visibility}
                onToggle={() => toggleSection(s.key)}
                onOpenUser={setOpenUserId}
              />
            ))
          )}
        </table>
      </div>

      {openUser && (
        <UserDetailModal
          key={openUser.teamMemberId}
          user={openUser}
          currentUserId={currentUserId}
          onClose={closeModal}
        />
      )}

      {/* Mounted permanently (open is a prop, not a mount guard) so the post-create
          invite ConfirmDialog survives the form modal closing. */}
      <CreatePersonModal
        open={createOpen}
        onClose={closeCreate}
        departments={departments}
      />
    </div>
  );
}
