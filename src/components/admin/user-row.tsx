import { RelativeTime } from "@/components/documents/relative-time";
import { Checkbox } from "@/components/ui/checkbox";
import type { TeamMemberListItem } from "@/lib/users";
import type { ColumnVisibility } from "@/lib/admin-users-preferences";

/**
 * One row of the User-Management table. Rendered inside the client
 * <UserAdminPanel>. Clicking (or Enter/Space when focused) opens the read-only
 * detail modal (Stage 7B). Avatar is the real photo when present, else a
 * stable-coloured initials chip.
 */

// Deterministic per-user avatar colour: stable across renders/sessions because
// it's hashed from the team_member id (not random). Vivid, distinct palette.
const AVATAR_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#6366f1",
];
export function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super-Admin",
  department_admin: "Department-Admin",
  ai_admin: "AI-Admin",
  user: "User",
};
const ROLE_CLASS: Record<string, string> = {
  super_admin: "uap-pill--super",
  department_admin: "uap-pill--admin",
  ai_admin: "uap-pill--admin",
  user: "uap-pill--user",
};
const STATUS_LABEL: Record<TeamMemberListItem["loginStatus"], string> = {
  active: "Active",
  invited: "Invited",
  not_invited: "Not invited",
};

export function UserRow({
  user,
  visibility,
  selected,
  onToggleSelect,
  onClick,
}: {
  user: TeamMemberListItem;
  visibility: ColumnVisibility;
  selected: boolean;
  onToggleSelect: () => void;
  onClick: () => void;
}) {
  const name = `${user.firstName} ${user.lastName}`.trim();
  return (
    <tr
      className={`uap-row${selected ? " is-selected" : ""}`}
      tabIndex={0}
      aria-label={`Open details for ${name}`}
      onClick={onClick}
      onKeyDown={(e) => {
        // Only the row itself toggles the detail modal via keyboard; a focused
        // child (the select checkbox) must not also trigger it.
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <td className="uap-col-select" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={selected}
          onChange={() => onToggleSelect()}
          aria-label={selected ? `Deselect ${name}` : `Select ${name}`}
        />
      </td>
      {visibility.avatar && (
        <td className="uap-cell-avatar">
          <span
            className="uap-avatar"
            style={user.avatarUrl ? undefined : { background: avatarColor(user.teamMemberId) }}
          >
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- public avatars-bucket URL; next/image adds no value here and the repo renders Storage URLs with raw <img>
              <img src={user.avatarUrl} alt="" loading="lazy" decoding="async" />
            ) : (
              <span>{user.initials}</span>
            )}
          </span>
        </td>
      )}
      {visibility.name && (
        <td className="uap-cell-name">
          <span className="uap-name">{name}</span>
        </td>
      )}
      {visibility.position && (
        <td className="uap-cell-pos">
          <span className="uap-muted">{user.position ?? "—"}</span>
        </td>
      )}
      {visibility.email && (
        <td className="uap-cell-email">
          <span className="uap-muted">{user.email ?? "—"}</span>
        </td>
      )}
      {visibility.department && <td>{user.department ?? "—"}</td>}
      {visibility.role && (
        <td>
          {user.role ? (
            <span className={`uap-pill ${ROLE_CLASS[user.role]}`}>{ROLE_LABEL[user.role]}</span>
          ) : (
            <span className="uap-pill uap-pill--none">—</span>
          )}
        </td>
      )}
      {visibility.status && (
        <td>
          <span className={`uap-status uap-status--${user.loginStatus}`}>
            <span className="uap-dot" aria-hidden="true" />
            {STATUS_LABEL[user.loginStatus]}
          </span>
        </td>
      )}
      {visibility.lastSignIn && (
        <td className="uap-muted">
          {user.lastSignInAt ? <RelativeTime iso={user.lastSignInAt} /> : "—"}
        </td>
      )}
      {visibility.tools && (
        <td className="uap-cell-tools">
          {user.tools.length ? (
            <span className="uap-muted">{user.tools.join(", ")}</span>
          ) : (
            <span className="uap-muted">—</span>
          )}
        </td>
      )}
      {visibility.created && (
        <td className="uap-muted">
          <RelativeTime iso={user.createdAt} />
        </td>
      )}
    </tr>
  );
}
