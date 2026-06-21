import { RelativeTime } from "@/components/documents/relative-time";
import type { TeamMemberListItem } from "@/lib/users";

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
  admin: "Admin",
  user: "User",
};
const ROLE_CLASS: Record<string, string> = {
  super_admin: "uap-pill--super",
  admin: "uap-pill--admin",
  user: "uap-pill--user",
};
const STATUS_LABEL: Record<TeamMemberListItem["loginStatus"], string> = {
  active: "Aktiv",
  invited: "Eingeladen",
  not_invited: "Nicht eingeladen",
};

export function UserRow({ user, onClick }: { user: TeamMemberListItem; onClick: () => void }) {
  const name = `${user.firstName} ${user.lastName}`.trim();
  return (
    <tr
      className="uap-row"
      tabIndex={0}
      aria-label={`Details zu ${name} öffnen`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
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
      <td className="uap-cell-name">
        <span className="uap-name">{name}</span>
      </td>
      <td className="uap-cell-pos">
        <span className="uap-muted">{user.position ?? "—"}</span>
      </td>
      <td className="uap-cell-email">
        <span className="uap-muted">{user.email ?? "—"}</span>
      </td>
      <td>{user.department ?? "—"}</td>
      <td>
        {user.role ? (
          <span className={`uap-pill ${ROLE_CLASS[user.role]}`}>{ROLE_LABEL[user.role]}</span>
        ) : (
          <span className="uap-pill uap-pill--none">—</span>
        )}
      </td>
      <td>
        <span className={`uap-status uap-status--${user.loginStatus}`}>
          <span className="uap-dot" aria-hidden="true" />
          {STATUS_LABEL[user.loginStatus]}
        </span>
      </td>
      <td className="uap-muted">
        {user.lastSignInAt ? <RelativeTime iso={user.lastSignInAt} /> : "—"}
      </td>
    </tr>
  );
}
