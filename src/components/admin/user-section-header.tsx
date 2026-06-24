import type { LoginStatus } from "@/lib/users";

// Status breakdown shown in the section header, in a fixed order. "ausstehend"
// is the human label for not_invited (no invite sent yet).
const BREAKDOWN_LABELS: { key: LoginStatus; label: string }[] = [
  { key: "active", label: "aktiv" },
  { key: "invited", label: "eingeladen" },
  { key: "not_invited", label: "ausstehend" },
];

/**
 * Collapsible header row for one role section in the User-Management table.
 * Renders a full-width <tr> (colSpan) so it lines up inside the shared table.
 * The whole header is a single button — click toggles the section.
 */
export function UserSectionHeader({
  label,
  count,
  breakdown,
  collapsed,
  colSpan,
  invitableCount,
  bulkDisabled,
  onToggle,
  onBulkInvite,
}: {
  label: string;
  count: number;
  breakdown: Record<LoginStatus, number>;
  collapsed: boolean;
  colSpan: number;
  /** not_invited members with a corporate email — drives the "Alle einladen (N)"
   *  button. The button is hidden (not disabled) at 0. */
  invitableCount: number;
  /** True while any bulk-invite run is in flight — disables this button to
   *  prevent overlapping runs across sections. */
  bulkDisabled: boolean;
  onToggle: () => void;
  onBulkInvite: () => void;
}) {
  const breakdownText = BREAKDOWN_LABELS.filter(({ key }) => breakdown[key] > 0)
    .map(({ key, label }) => `${breakdown[key]} ${label}`)
    .join(" · ");

  return (
    <tr className="uap-section-header-row">
      <td colSpan={colSpan}>
        <div className="uap-section-header-inner">
          <button
            type="button"
            className="uap-section-header"
            onClick={onToggle}
            aria-expanded={!collapsed}
          >
            <svg
              className={`uap-section-chevron${collapsed ? "" : " is-open"}`}
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
            <span className="uap-section-label">{label}</span>
            <span className="uap-section-count">{count}</span>
            {breakdownText && <span className="uap-section-breakdown">{breakdownText}</span>}
          </button>
          {invitableCount > 0 && (
            <button
              type="button"
              className="uap-section-invite-all"
              onClick={onBulkInvite}
              disabled={bulkDisabled}
            >
              Alle einladen ({invitableCount})
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
