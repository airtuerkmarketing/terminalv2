"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { RelativeTime } from "@/components/documents/relative-time";
import { useToast } from "@/components/ui/toast";
import type { ActivityLogPage, Role, TeamMemberListItem } from "@/lib/users";
import { loadUserActivity, updateUserRoleAction } from "@/app/(public)/admin/users/actions";
import { avatarColor } from "./user-row";
import { InviteFooter } from "./invite-footer";

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

/**
 * Read-only detail modal for a team member (Stage 7B). Portal-mounted, centered
 * with a backdrop; closes on Escape, backdrop click, the ✕, or the footer button;
 * Tab is focus-trapped inside. No edit/invite/deactivate actions — that's 7C.
 *
 * Two layouts by login status:
 * - not_invited (currently all 63): single-column profile + an invite hint.
 * - active / invited: "Profil" + "Aktivität" tabs; the activity tab lazy-loads
 *   the log via the loadUserActivity server action. (No member has a login yet,
 *   so this path is built for Stage 8+/demo but not visually reachable today.)
 */
export function UserDetailModal({
  user,
  currentUserId,
  onClose,
}: {
  user: TeamMemberListItem;
  /** Self-lock: a super_admin can't change their OWN role (lockout guard). */
  currentUserId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const isTabbed = user.loginStatus !== "not_invited";
  const [tab, setTab] = useState<"profile" | "activity">("profile");
  const [activity, setActivity] = useState<ActivityLogPage | null>(null);
  const [activityError, setActivityError] = useState(false);

  // Role picker (Stage 7C-light). `role` is the live displayed value; `pendingRole`
  // is the in-flight select value. Editing is blocked for your own row — the
  // backend SELF_LOCK rejects any self role change, so we don't even offer it.
  const [role, setRole] = useState<Role | null>(user.role);
  const [editingRole, setEditingRole] = useState(false);
  const [pendingRole, setPendingRole] = useState<Role>(user.role ?? "user");
  const [savingRole, setSavingRole] = useState(false);
  const isSelf = user.profileId != null && user.profileId === currentUserId;

  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const name = `${user.firstName} ${user.lastName}`.trim();

  async function saveRole() {
    if (!user.profileId || pendingRole === role) {
      setEditingRole(false);
      return;
    }
    setSavingRole(true);
    const res = await updateUserRoleAction(user.profileId, pendingRole);
    setSavingRole(false);
    if (res.ok) {
      setRole(pendingRole);
      setEditingRole(false);
      toast({ variant: "success", title: "Rolle aktualisiert" });
      router.refresh(); // refresh the list behind the modal with the new role
    } else {
      toast({ variant: "error", title: res.error });
    }
  }

  // Escape + focus-trap + restore focus on close (adapted from the sidebar drawer).
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = modalRef.current;
      if (!root) return;
      const items = Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      prevFocus?.focus?.();
    };
  }, [onClose]);

  // Lazy-load activity when the tab opens. setState only inside the async
  // callbacks (never synchronously in the effect body) to avoid extra renders.
  useEffect(() => {
    if (tab !== "activity" || activity !== null || activityError || !user.profileId) return;
    let cancelled = false;
    loadUserActivity(user.profileId)
      .then((res) => {
        if (!cancelled) setActivity(res);
      })
      .catch(() => {
        if (!cancelled) setActivityError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, activity, activityError, user.profileId]);

  const activityLoading = tab === "activity" && activity === null && !activityError && !!user.profileId;

  if (typeof document === "undefined") return null;

  const profileFields = (
    <dl className="uap-fields">
      <div>
        <dt>Department</dt>
        <dd>{user.department ?? "—"}</dd>
      </div>
      <div>
        <dt>E-Mail</dt>
        <dd>{user.email ?? "—"}</dd>
      </div>
      <div>
        <dt>Im Team</dt>
        <dd>{user.joinedYear ? `seit ${user.joinedYear}` : "—"}</dd>
      </div>
      {!isTabbed && user.intendedRole && user.intendedRole !== "user" && (
        <div>
          <dt>Rolle</dt>
          <dd>
            <span className="uap-pill uap-pill--none">—</span>
            <span className="uap-role-planned">
              Geplante Rolle: {ROLE_LABEL[user.intendedRole]} (aktiv nach Einladung)
            </span>
          </dd>
        </div>
      )}
      {isTabbed && (
        <div>
          <dt>Rolle</dt>
          <dd>
            {editingRole ? (
              <span className="uap-role-edit">
                <select
                  className="uap-select"
                  value={pendingRole}
                  onChange={(e) => setPendingRole(e.target.value as Role)}
                  disabled={savingRole}
                  aria-label="Rolle wählen"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super-Admin</option>
                </select>
                <button type="button" className="uap-role-save" onClick={saveRole} disabled={savingRole}>
                  {savingRole ? "…" : "Speichern"}
                </button>
                <button
                  type="button"
                  className="uap-role-cancel"
                  onClick={() => setEditingRole(false)}
                  disabled={savingRole}
                >
                  Abbrechen
                </button>
              </span>
            ) : (
              <span className="uap-role-view">
                {role ? (
                  <span className={`uap-pill ${ROLE_CLASS[role]}`}>{ROLE_LABEL[role]}</span>
                ) : (
                  "—"
                )}
                <button
                  type="button"
                  className="uap-role-edit-btn"
                  onClick={() => {
                    setPendingRole(role ?? "user");
                    setEditingRole(true);
                  }}
                  disabled={isSelf}
                  title={isSelf ? "Du kannst deine eigene Rolle nicht ändern." : "Rolle ändern"}
                  aria-label="Rolle ändern"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                </button>
              </span>
            )}
          </dd>
        </div>
      )}
      {isTabbed && (
        <div>
          <dt>Letzter Login</dt>
          <dd>{user.lastSignInAt ? <RelativeTime iso={user.lastSignInAt} /> : "—"}</dd>
        </div>
      )}
      <div className="uap-fields-full">
        <dt>Tools</dt>
        <dd>
          {user.tools.length > 0 ? (
            <span className="uap-tools">
              {user.tools.map((t) => (
                <span key={t} className="uap-tool">
                  {t}
                </span>
              ))}
            </span>
          ) : (
            "—"
          )}
        </dd>
      </div>
      <div className="uap-fields-full">
        <dt>Aufgaben</dt>
        <dd>{user.tasks ?? "—"}</dd>
      </div>
    </dl>
  );

  const activityPanel = activityLoading ? (
    <p className="uap-modal-empty">Lädt…</p>
  ) : activityError ? (
    <p className="uap-modal-empty">Aktivität konnte nicht geladen werden.</p>
  ) : !activity || activity.items.length === 0 ? (
    <p className="uap-modal-empty">Keine Aktivität bisher</p>
  ) : (
    <ul className="uap-activity">
      {activity.items.map((a) => (
        <li key={a.id} className="uap-activity-item">
          <span className="uap-activity-action">{a.action}</span>
          {a.resourceType && <span className="uap-activity-res">{a.resourceType}</span>}
          <span className="uap-activity-time">
            <RelativeTime iso={a.createdAt} />
          </span>
        </li>
      ))}
    </ul>
  );

  return createPortal(
    <div className="uap-modal-backdrop" onClick={onClose}>
      <div
        className="uap-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Details: ${name}`}
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="uap-modal-close"
          onClick={onClose}
          aria-label="Schließen"
          ref={closeRef}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="uap-modal-header">
          <span
            className="uap-modal-avatar"
            style={user.avatarUrl ? undefined : { background: avatarColor(user.teamMemberId) }}
          >
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- public avatars-bucket URL; next/image adds no value, repo renders Storage URLs with raw <img>
              <img src={user.avatarUrl} alt="" loading="lazy" decoding="async" />
            ) : (
              <span>{user.initials}</span>
            )}
          </span>
          <div className="uap-modal-id">
            <h2 className="uap-modal-name">{name}</h2>
            {user.position && <p className="uap-modal-position">{user.position}</p>}
            <div className="uap-modal-badges">
              {user.isLead && <span className="uap-badge uap-badge--lead">Team Lead</span>}
              <span className={`uap-pill uap-pill--status-${user.loginStatus}`}>
                {STATUS_LABEL[user.loginStatus]}
              </span>
            </div>
          </div>
        </div>

        {isTabbed && (
          <div className="uap-tabs" role="tablist" aria-label="Detailbereiche">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "profile"}
              className={`uap-tab${tab === "profile" ? " is-active" : ""}`}
              onClick={() => setTab("profile")}
            >
              Profil
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "activity"}
              className={`uap-tab${tab === "activity" ? " is-active" : ""}`}
              onClick={() => setTab("activity")}
            >
              Aktivität
            </button>
          </div>
        )}

        <div className="uap-modal-body">{!isTabbed || tab === "profile" ? profileFields : activityPanel}</div>

        <div className="uap-modal-footer">
          <InviteFooter user={user} />
          <button type="button" className="uap-modal-btn" onClick={onClose}>
            Schließen
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
