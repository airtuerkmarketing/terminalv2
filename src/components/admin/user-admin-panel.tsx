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
import { EditUserModal } from "./edit-user-modal";
import { ChangeEmailModal } from "./change-email-modal";
import { useBulkInvite } from "./use-bulk-invite";
import { useSelection } from "./use-selection";
import { BulkActionBar } from "./bulk-action-bar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { exportUsersAction } from "@/app/(public)/admin/users/actions";
import { buildUsersCsv, downloadCsv, generateCsvFilename } from "@/lib/admin-users-csv";
import "@/styles/user-admin.css";

// How many names to preview in the bulk-invite confirm dialog before collapsing
// the rest into a "…und X weitere" line.
const BULK_PREVIEW_LIMIT = 5;

// Invitable = no auth account yet AND a corporate email. Mirrors the (module-
// private) predicate in use-bulk-invite.ts and the section's own filter — the hook
// re-applies it at confirm-time, so this is just the UI-side gate for the hint
// count + the subset we hand to request().
const isInvitableMember = (m: TeamMemberListItem) =>
  m.loginStatus === "not_invited" && isCorpEmail(m.email);

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
  { key: "null", label: "No role", color: "var(--text-3)" },
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

  // Local copy of the server list so a single-row edit can splice in place without
  // a full 63-row refetch (the caching pass's one real latency win). Re-synced
  // whenever the server passes fresh data (after a revalidatePath navigation).
  const [members, setMembers] = useState(teamMembers);
  useEffect(() => setMembers(teamMembers), [teamMembers]);

  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [changeEmailUserId, setChangeEmailUserId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const closeModal = useCallback(() => setOpenUserId(null), []);
  const closeEdit = useCallback(() => setEditUserId(null), []);
  const closeChangeEmail = useCallback(() => setChangeEmailUserId(null), []);
  const closeCreate = useCallback(() => setCreateOpen(false), []);
  const openUser = openUserId
    ? members.find((u) => u.teamMemberId === openUserId) ?? null
    : null;
  const editUser = editUserId
    ? members.find((u) => u.teamMemberId === editUserId) ?? null
    : null;
  const changeEmailUser = changeEmailUserId
    ? members.find((u) => u.teamMemberId === changeEmailUserId) ?? null
    : null;

  // Splice an edited row back into the local list (from adminUpdateUserAction).
  const applyEditedMember = useCallback((updated: TeamMemberListItem) => {
    setMembers((prev) =>
      prev.map((m) => (m.teamMemberId === updated.teamMemberId ? updated : m))
    );
  }, []);

  // Row selection (AP 3 Phase 5). Lives in the orchestrator like all other panel
  // state; the checkbox column (B2) and the sticky bulk-action bar (B3+) consume
  // it. The prune effect below the grouping enforces F4 (filter) + Q4 (collapse).
  const selection = useSelection();
  const { toast } = useToast();

  // Per-section bulk invite (Phase 6). The hook owns the confirm + sequential
  // invite run; the panel renders the single shared ConfirmDialog below and
  // passes `request` / `inProgress` down to every section header.
  const bulk = useBulkInvite();
  const bulkTarget = bulk.confirmTarget;
  const bulkCount = bulkTarget?.members.length ?? 0;
  const bulkPreview = bulkTarget?.members.slice(0, BULK_PREVIEW_LIMIT).map((m) => `${m.firstName} ${m.lastName}`.trim()) ?? [];
  const bulkExtra = bulkCount - bulkPreview.length;
  const bulkItems = bulkExtra > 0 ? [...bulkPreview, `…and ${bulkExtra} more`] : bulkPreview;

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
    return members.filter((u) => {
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
  }, [members, q, selectedDepartments, selectedStatuses, privateOnly, noPhoto]);

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

  // Currently SELECTABLE rows = in the filtered view AND in a non-collapsed
  // section (collapsed rows aren't rendered, so they can't be selected). Pruning
  // the selection down to this set in a single effect enforces both F4 (a row
  // leaving the filtered view drops out of the selection) and Q4 (collapsing a
  // section clears its rows) — re-expanding or clearing the filter does NOT bring
  // them back ("einmal weg = weg"). pruneTo no-ops when nothing leaves, so this
  // is safe on every render and never churns state.
  const selectableIds = useMemo(
    () =>
      filtered
        .filter((u) => !(collapsed[u.role ?? "null"] ?? false))
        .map((u) => u.teamMemberId),
    [filtered, collapsed]
  );
  const { pruneTo } = selection;
  useEffect(() => {
    pruneTo(selectableIds);
  }, [selectableIds, pruneTo]);

  // Invitable subset of the current selection (corp email + not yet invited) — the
  // bulk bar shows it as a hint, and B4 will invite exactly this subset. The Set
  // identity in selection.selected changes on every toggle, so this recomputes
  // when (and only when) it should.
  const invitableSelectedCount = useMemo(() => {
    let n = 0;
    for (const u of members) {
      if (selection.selected.has(u.teamMemberId) && isInvitableMember(u)) n++;
    }
    return n;
  }, [members, selection.selected]);

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

  // Bulk-invite the current selection (B4). The invite logic lives here in the
  // orchestrator (the bar stays presentational); we hand the *invitable* subset to
  // the shared per-section bulk hook so its confirm dialog shows the right count
  // and confirm() runs the same progress/result toasts as a section invite.
  function handleBulkInvite() {
    const selectedMembers = members.filter((m) => selection.selected.has(m.teamMemberId));
    const invitableMembers = selectedMembers.filter(isInvitableMember);
    const skipped = selectedMembers.length - invitableMembers.length;

    // Case A — nothing invitable: warn and stop (don't open an empty confirm dialog).
    if (invitableMembers.length === 0) {
      toast({ variant: "warning", title: "No invitable people in the selection" });
      return;
    }

    // Case C — mixed: request() is void (it only opens the confirm dialog) and has
    // no completion hook, so the skip hint is surfaced up-front, not after the run.
    // Case B (all invitable → skipped === 0) shows no extra toast.
    if (skipped > 0) {
      toast({ variant: "info", title: `${skipped} not invitable – skipped` });
    }

    bulk.request("Selection", invitableMembers);
  }

  // Export the current selection to CSV — or, with nothing selected, the filtered
  // view (F1: selection preferred, filtered fallback). The file is built +
  // downloaded client-side FIRST so it always reaches the user, then the audit log
  // (exportUsersAction) is written best-effort — a log failure is console-only and
  // never reported to the user as an export failure.
  async function handleExportCsv() {
    const hasSelection = selection.size > 0;
    const exportMembers = hasSelection
      ? members.filter((m) => selection.selected.has(m.teamMemberId))
      : filtered;
    const scope: "selection" | "filtered" = hasSelection ? "selection" : "filtered";

    if (exportMembers.length === 0) {
      toast({ variant: "warning", title: "No people to export" });
      return;
    }

    downloadCsv(generateCsvFilename(), buildUsersCsv(exportMembers));

    try {
      const res = await exportUsersAction({ count: exportMembers.length, scope });
      if (!res.ok) console.error("[export] audit log failed:", res.error);
    } catch (e) {
      console.error("[export] audit log error:", e);
    }

    toast({
      variant: "success",
      title: `${exportMembers.length} ${exportMembers.length === 1 ? "person" : "people"} exported`,
    });
  }

  return (
    <div className="uap">
      <header className="uap-head">
        <h1 className="uap-title">User Management</h1>
        <p className="uap-sub">
          {filtered.length} of {totalCount} people
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
              <th className="uap-col-select">
                <Checkbox
                  checked={selection.size > 0 && selection.size === selectableIds.length}
                  indeterminate={selection.size > 0 && selection.size < selectableIds.length}
                  disabled={selectableIds.length === 0}
                  onChange={() => {
                    if (selection.size === selectableIds.length) selection.clear();
                    else selection.selectAll(selectableIds);
                  }}
                  aria-label="Select all visible people"
                />
              </th>
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
                <td className="uap-empty" colSpan={colSpan + 1}>
                  No people found{q.trim() ? ` for “${q.trim()}”` : ""}.
                  {hasActiveFilters && (
                    <button type="button" className="uap-empty-reset" onClick={resetFilters}>
                      Reset filters
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
                selected={selection.selected}
                onToggleRow={selection.toggle}
                onToggleSection={selection.toggleMany}
                bulkInProgress={bulk.inProgress}
                onToggle={() => toggleSection(s.key)}
                onOpenUser={setOpenUserId}
                onBulkInvite={bulk.request}
              />
            ))
          )}
        </table>
      </div>

      {selection.size > 0 && (
        <BulkActionBar
          selectedCount={selection.size}
          invitableCount={invitableSelectedCount}
          invitePending={bulk.inProgress}
          onInvite={handleBulkInvite}
          onExportCsv={handleExportCsv}
          onClear={selection.clear}
        />
      )}

      {openUser && (
        <UserDetailModal
          key={openUser.teamMemberId}
          user={openUser}
          currentUserId={currentUserId}
          onClose={closeModal}
          onEdit={() => {
            setEditUserId(openUser.teamMemberId);
            closeModal();
          }}
        />
      )}

      {/* Super-admin full-edit. Mounted permanently (open is a prop) so the
          password-reset ConfirmDialog survives the form modal closing. */}
      <EditUserModal
        open={editUser !== null}
        user={editUser}
        departments={departments}
        onClose={closeEdit}
        onSaved={applyEditedMember}
        onChangeEmail={() => {
          if (editUser) setChangeEmailUserId(editUser.teamMemberId);
          closeEdit();
        }}
      />

      {/* Dedicated change-login-email modal (typed re-entry). Mounted permanently so
          its confirm dialog survives the edit modal closing. */}
      <ChangeEmailModal
        open={changeEmailUser !== null}
        user={changeEmailUser}
        currentUserId={currentUserId}
        onClose={closeChangeEmail}
      />

      {/* Mounted permanently (open is a prop, not a mount guard) so the post-create
          invite ConfirmDialog survives the form modal closing. */}
      <CreatePersonModal
        open={createOpen}
        onClose={closeCreate}
        departments={departments}
      />

      {/* Per-section bulk invite confirm (Phase 6). One shared dialog; the open
          target carries the section label + the invitable members. */}
      <ConfirmDialog
        open={!!bulkTarget}
        onClose={bulk.cancel}
        onConfirm={bulk.confirm}
        title={`Invite ${bulkCount} ${bulkCount === 1 ? "person" : "people"} from “${bulkTarget?.label ?? ""}”?`}
        description="Invitation emails will be sent to the following company addresses:"
        items={bulkItems}
        confirmLabel={`Invite ${bulkCount}`}
      />
    </div>
  );
}
