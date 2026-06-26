import { useMemo, type CSSProperties } from "react";
import type { LoginStatus, TeamMemberListItem } from "@/lib/users";
import type { ColumnVisibility } from "@/lib/admin-users-preferences";
import { isCorpEmail } from "@/lib/corp-email";
import { UserRow } from "./user-row";
import { UserSectionHeader } from "./user-section-header";

/**
 * One role group in the User-Management table — a <tbody> holding a collapsible
 * header row plus the member rows (hidden when collapsed). A <table> may contain
 * several <tbody> elements, so each section is its own body while the columns
 * stay aligned under the single shared <thead>.
 *
 * The left edge is tinted via the --uap-section-color custom property (the role
 * marker). The panel only renders this for non-empty groups.
 */
export function UserSection({
  label,
  color,
  users,
  collapsed,
  colSpan,
  visibility,
  selected,
  onToggleRow,
  onToggleSection,
  bulkInProgress,
  onToggle,
  onOpenUser,
  onBulkInvite,
}: {
  label: string;
  color: string;
  users: TeamMemberListItem[];
  collapsed: boolean;
  colSpan: number;
  visibility: ColumnVisibility;
  /** Selected team_member ids (the whole set; the section derives its own state). */
  selected: Set<string>;
  /** Toggle a single row's selection. */
  onToggleRow: (id: string) => void;
  /** Section select-all: toggleMany over the section's ids (all→clear, else add). */
  onToggleSection: (ids: string[]) => void;
  /** True while any section's bulk-invite run is in flight. */
  bulkInProgress: boolean;
  onToggle: () => void;
  onOpenUser: (teamMemberId: string) => void;
  onBulkInvite: (label: string, members: TeamMemberListItem[]) => void;
}) {
  const breakdown = useMemo(() => {
    const counts: Record<LoginStatus, number> = { active: 0, invited: 0, not_invited: 0 };
    for (const u of users) counts[u.loginStatus]++;
    return counts;
  }, [users]);

  // Invitable = not yet invited AND a corporate email (private addresses are
  // invite-locked, never counted). Sorted by last name so the bulk-invite
  // progress order is deterministic, independent of the table's active sort.
  const invitable = useMemo(
    () =>
      users
        .filter((u) => u.loginStatus === "not_invited" && isCorpEmail(u.email))
        .sort((a, b) => a.lastName.localeCompare(b.lastName, "de")),
    [users]
  );

  // Section select-all state, derived from the whole selection set. memberIds are
  // every row in this (role) section; the select-all is disabled while collapsed
  // because collapsed rows aren't selectable (the panel prunes them — Q4).
  const memberIds = useMemo(() => users.map((u) => u.teamMemberId), [users]);
  const selectedCount = useMemo(
    () => memberIds.reduce((n, id) => (selected.has(id) ? n + 1 : n), 0),
    [memberIds, selected]
  );
  const allSelected = memberIds.length > 0 && selectedCount === memberIds.length;
  const someSelected = selectedCount > 0 && selectedCount < memberIds.length;

  return (
    <tbody className="uap-section" style={{ "--uap-section-color": color } as CSSProperties}>
      <UserSectionHeader
        label={label}
        count={users.length}
        breakdown={breakdown}
        collapsed={collapsed}
        colSpan={colSpan}
        invitableCount={invitable.length}
        bulkDisabled={bulkInProgress}
        selectAllChecked={allSelected}
        selectAllIndeterminate={someSelected}
        selectDisabled={collapsed}
        onToggleSelectAll={() => onToggleSection(memberIds)}
        onToggle={onToggle}
        onBulkInvite={() => onBulkInvite(label, invitable)}
      />
      {!collapsed &&
        users.map((u) => (
          <UserRow
            key={u.teamMemberId}
            user={u}
            visibility={visibility}
            selected={selected.has(u.teamMemberId)}
            onToggleSelect={() => onToggleRow(u.teamMemberId)}
            onClick={() => onOpenUser(u.teamMemberId)}
          />
        ))}
    </tbody>
  );
}
