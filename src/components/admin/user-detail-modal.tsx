"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { RelativeTime } from "@/components/documents/relative-time";
import { useToast } from "@/components/ui/toast";
import type { ActivityLogPage, ChatSessionItem, Role, TeamMemberListItem } from "@/lib/users";
import { loadUserActivity, loadUserChat, updateUserRoleAction } from "@/app/(public)/admin/users/actions";
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
  active: "Active",
  invited: "Invited",
  not_invited: "Not invited",
};

/**
 * Read-only detail modal for a team member (Stage 7B). Portal-mounted, centered
 * with a backdrop; closes on Escape, backdrop click, the ✕, or the footer button;
 * Tab is focus-trapped inside. No edit/invite/deactivate actions — that's 7C.
 *
 * Two layouts by login status:
 * - not_invited (currently all 63): single-column profile + an invite hint.
 * - active / invited: "Profil" + "Aktivität" + "KI-Chat" tabs; the activity and
 *   chat tabs lazy-load via the loadUserActivity / loadUserChat server actions.
 *   The KI-Chat tab surfaces the user's verbatim AI questions — super_admin-only
 *   (this whole panel is super_admin-gated, and loadUserChat re-checks + the
 *   ai_chat RLS only grants is_super_admin() cross-user read).
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
  const [tab, setTab] = useState<"profile" | "activity" | "chat">("profile");
  const [activity, setActivity] = useState<ActivityLogPage | null>(null);
  const [activityError, setActivityError] = useState(false);
  const [chat, setChat] = useState<ChatSessionItem[] | null>(null);
  const [chatError, setChatError] = useState(false);

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
      toast({ variant: "success", title: "Role updated" });
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

  // Lazy-load AI-chat history when its tab opens (same pattern as activity).
  useEffect(() => {
    if (tab !== "chat" || chat !== null || chatError || !user.profileId) return;
    let cancelled = false;
    loadUserChat(user.profileId)
      .then((res) => {
        if (!cancelled) setChat(res);
      })
      .catch(() => {
        if (!cancelled) setChatError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, chat, chatError, user.profileId]);

  const chatLoading = tab === "chat" && chat === null && !chatError && !!user.profileId;

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
        <dt>On the team</dt>
        <dd>{user.joinedYear ? `since ${user.joinedYear}` : "—"}</dd>
      </div>
      {!isTabbed && user.intendedRole && user.intendedRole !== "user" && (
        <div>
          <dt>Role</dt>
          <dd>
            <span className="uap-pill uap-pill--none">—</span>
            <span className="uap-role-planned">
              Planned role: {ROLE_LABEL[user.intendedRole]} (active after invitation)
            </span>
          </dd>
        </div>
      )}
      {isTabbed && (
        <div>
          <dt>Role</dt>
          <dd>
            {editingRole ? (
              <span className="uap-role-edit">
                <select
                  className="uap-select"
                  value={pendingRole}
                  onChange={(e) => setPendingRole(e.target.value as Role)}
                  disabled={savingRole}
                  aria-label="Select role"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super-Admin</option>
                </select>
                <button type="button" className="uap-role-save" onClick={saveRole} disabled={savingRole}>
                  {savingRole ? "…" : "Save"}
                </button>
                <button
                  type="button"
                  className="uap-role-cancel"
                  onClick={() => setEditingRole(false)}
                  disabled={savingRole}
                >
                  Cancel
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
                  title={isSelf ? "You can't change your own role." : "Change role"}
                  aria-label="Change role"
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
          <dt>Last login</dt>
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
        <dt>Tasks</dt>
        <dd>{user.tasks ?? "—"}</dd>
      </div>
    </dl>
  );

  const activityPanel = activityLoading ? (
    <p className="uap-modal-empty">Loading…</p>
  ) : activityError ? (
    <p className="uap-modal-empty">Activity could not be loaded.</p>
  ) : !activity || activity.items.length === 0 ? (
    <p className="uap-modal-empty">No activity yet</p>
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

  const chatPanel = chatLoading ? (
    <p className="uap-modal-empty">Loading…</p>
  ) : chatError ? (
    <p className="uap-modal-empty">Chat history could not be loaded.</p>
  ) : !chat || chat.length === 0 ? (
    <p className="uap-modal-empty">No AI chat requests yet</p>
  ) : (
    <div className="uap-chat">
      <p className="uap-chat-note">
        Visible to super admins only. Access is logged.
      </p>
      {chat.map((s) => (
        <section key={s.sessionId} className="uap-chat-session">
          <header className="uap-chat-session-head">
            <span className="uap-chat-session-title">{s.title?.trim() || "Conversation"}</span>
            <span className="uap-chat-session-time">
              <RelativeTime iso={s.createdAt} />
            </span>
          </header>
          <ul className="uap-chat-turns">
            {s.messages.map((m) => (
              <li key={m.id} className={`uap-chat-msg uap-chat-msg--${m.role}`}>
                <span className="uap-chat-role">{m.role === "user" ? "Question" : "Answer"}</span>
                <span className="uap-chat-text">{m.content}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
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
          aria-label="Close"
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
          <div className="uap-tabs" role="tablist" aria-label="Detail sections">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "profile"}
              className={`uap-tab${tab === "profile" ? " is-active" : ""}`}
              onClick={() => setTab("profile")}
            >
              Profile
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "activity"}
              className={`uap-tab${tab === "activity" ? " is-active" : ""}`}
              onClick={() => setTab("activity")}
            >
              Activity
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "chat"}
              className={`uap-tab${tab === "chat" ? " is-active" : ""}`}
              onClick={() => setTab("chat")}
            >
              AI Chat
            </button>
          </div>
        )}

        <div className="uap-modal-body">
          {!isTabbed || tab === "profile"
            ? profileFields
            : tab === "activity"
              ? activityPanel
              : chatPanel}
        </div>

        <div className="uap-modal-footer">
          <InviteFooter user={user} />
          <button type="button" className="uap-modal-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
