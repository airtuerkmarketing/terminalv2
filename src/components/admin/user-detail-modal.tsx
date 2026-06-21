"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RelativeTime } from "@/components/documents/relative-time";
import type { ActivityLogPage, TeamMemberListItem } from "@/lib/users";
import { loadUserActivity } from "@/app/(public)/admin/users/actions";
import { avatarColor } from "./user-row";

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
  onClose,
}: {
  user: TeamMemberListItem;
  /** Reserved for the Stage 7C self-lock (current super_admin acting on self). */
  currentUserId: string;
  onClose: () => void;
}) {
  const isTabbed = user.loginStatus !== "not_invited";
  const [tab, setTab] = useState<"profile" | "activity">("profile");
  const [activity, setActivity] = useState<ActivityLogPage | null>(null);
  const [activityError, setActivityError] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const name = `${user.firstName} ${user.lastName}`.trim();

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
      {isTabbed && (
        <div>
          <dt>Rolle</dt>
          <dd>
            {user.role ? (
              <span className={`uap-pill ${ROLE_CLASS[user.role]}`}>{ROLE_LABEL[user.role]}</span>
            ) : (
              "—"
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
          {user.loginStatus === "not_invited" ? (
            <p className="uap-modal-hint">
              Diese Person hat noch keinen Login. Eine Einladung wird in der nächsten Version möglich
              sein.
            </p>
          ) : (
            <p className="uap-modal-hint">
              {user.lastSignInAt ? (
                <>
                  Letzter Login: <RelativeTime iso={user.lastSignInAt} />
                </>
              ) : (
                "Eingeladen — noch nie eingeloggt"
              )}
            </p>
          )}
          <button type="button" className="uap-modal-btn" onClick={onClose}>
            Schließen
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
