import { useMemo, type CSSProperties } from "react";
import type { LoginStatus, TeamMemberListItem } from "@/lib/users";
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
  onToggle,
  onOpenUser,
}: {
  label: string;
  color: string;
  users: TeamMemberListItem[];
  collapsed: boolean;
  colSpan: number;
  onToggle: () => void;
  onOpenUser: (teamMemberId: string) => void;
}) {
  const breakdown = useMemo(() => {
    const counts: Record<LoginStatus, number> = { active: 0, invited: 0, not_invited: 0 };
    for (const u of users) counts[u.loginStatus]++;
    return counts;
  }, [users]);

  return (
    <tbody className="uap-section" style={{ "--uap-section-color": color } as CSSProperties}>
      <UserSectionHeader
        label={label}
        count={users.length}
        breakdown={breakdown}
        collapsed={collapsed}
        colSpan={colSpan}
        onToggle={onToggle}
      />
      {!collapsed &&
        users.map((u) => (
          <UserRow key={u.teamMemberId} user={u} onClick={() => onOpenUser(u.teamMemberId)} />
        ))}
    </tbody>
  );
}
