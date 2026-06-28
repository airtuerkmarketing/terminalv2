"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { TeamMemberListItem } from "@/lib/users";
import { adminUpdateUserAction, sendPasswordResetAction } from "@/app/(public)/admin/users/actions";

/**
 * Admin edit modal for a team member's stammdaten (super_admin-gated). Mirrors
 * CreatePersonModal 1:1: own portal modal with the hand-rolled focus-trap (Escape +
 * Tab-trap + restore focus), a single FormState object + generic set<K>(), the
 * .uap-create-* / .uap-field CSS, useToast, a client canSubmit gate, and inline
 * errors for field-specific tokens / toasts for the rest.
 *
 * Keyed on the TEAM_MEMBER id — adminUpdateUserAction + sendPasswordResetAction
 * both take team_members.id (the panel's natural key). Deliberately does NOT edit
 * role (that stays on the detail modal's own RLS-gated inline picker) or email
 * (auth-level op, out of v1 scope). `metadata` is intentionally NOT surfaced — it
 * is a write-reserved jsonb escape hatch (review F3), not a UI field.
 *
 * Prefilled from the TeamMemberListItem already in the list payload (≤63 rows, no
 * extra round-trip). On save it returns the freshly-written row, which the panel
 * splices in place via onSaved (no full refetch); a null row falls back to a
 * router.refresh.
 *
 * For a not-yet-invited person (loginStatus === "not_invited") Save IS allowed
 * (editing stammdaten pre-invite is valid — adminUpdateUser keys on team_members),
 * but the password-reset stays disabled (it needs an auth account — invite first).
 * Mounted permanently by the panel (open is a prop) so the reset ConfirmDialog
 * survives the form closing.
 */
interface FormState {
  title: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  phone: string;
}

export function EditUserModal({
  open,
  user,
  departments,
  onClose,
  onSaved,
  onChangeEmail,
}: {
  open: boolean;
  /** The member being edited, or null when closed. */
  user: TeamMemberListItem | null;
  departments: string[];
  onClose: () => void;
  /** Splice the freshly-written row into the panel's local list state. */
  onSaved: (user: TeamMemberListItem) => void;
  /** Open the dedicated change-login-email modal for this member. */
  onChangeEmail: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(() => fromUser(user));
  const [pending, setPending] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  // Drives the "send password reset?" confirm.
  const [resetPrompt, setResetPrompt] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const notInvited = user?.loginStatus === "not_invited";

  // Re-seed the form whenever a (different) user is opened.
  useEffect(() => {
    if (open) setForm(fromUser(user));
  }, [open, user]);

  // Reset transient state on close (every close path routes through here).
  const handleClose = useCallback(() => {
    setPending(false);
    onClose();
  }, [onClose]);

  // Escape + focus-trap + restore focus (1:1 with create-person-modal).
  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    firstFieldRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
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
  }, [open, handleClose]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Save is allowed for not-yet-invited people (editing stammdaten pre-invite is
  // valid — adminUpdateUser keys on team_members). Only the password reset stays
  // gated on notInvited (it needs an auth account).
  const canSubmit =
    form.firstName.trim() !== "" && form.lastName.trim() !== "" && !pending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || !user) return;
    setPending(true);
    const res = await adminUpdateUserAction(user.teamMemberId, {
      title: form.title.trim() || null,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      position: form.position.trim() || null,
      department: form.department || null,
      phone: form.phone.trim() || null,
    });
    setPending(false);

    if (!res.ok) {
      toast({ variant: "error", title: res.error });
      return;
    }
    toast({ variant: "success", title: "Changes saved" });
    if (res.user) onSaved(res.user);
    else router.refresh();
    handleClose();
  }

  // useCallback-stable so ConfirmDialog's focus effect isn't re-run by an unrelated
  // re-render (e.g. a toast auto-dismissing) while it's open.
  const confirmReset = useCallback(async () => {
    if (!user) return;
    setResetPrompt(false);
    setResetPending(true);
    const res = await sendPasswordResetAction(user.teamMemberId);
    setResetPending(false);
    if (res.ok) {
      toast({ variant: "success", title: `Password-reset email sent to ${user.email ?? "the user"}` });
    } else {
      toast({ variant: "error", title: res.error });
    }
  }, [user, toast]);

  const cancelReset = useCallback(() => setResetPrompt(false), []);

  if (typeof document === "undefined") return null;

  return (
    <>
      {open &&
        user &&
        createPortal(
          <div className="uap-modal-backdrop" onClick={handleClose}>
            <div
              className="uap-modal uap-create"
              role="dialog"
              aria-modal="true"
              aria-labelledby="eu-title"
              ref={modalRef}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="uap-modal-close"
                onClick={handleClose}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>

              <div className="uap-modal-header uap-create-header">
                <h2 className="uap-modal-name" id="eu-title">Edit person</h2>
              </div>

              <form className="uap-create-form" onSubmit={handleSubmit} noValidate>
                <div className="uap-modal-body">
                  <div className="uap-create-grid">
                    <div className="uap-field">
                      <label htmlFor="eu-title-field">Title</label>
                      <input
                        id="eu-title-field"
                        value={form.title}
                        onChange={(e) => set("title", e.target.value)}
                        placeholder="e.g. Dr."
                        maxLength={20}
                        autoComplete="off"
                      />
                    </div>
                    <div className="uap-field">
                      <label htmlFor="eu-pos">Position</label>
                      <input
                        id="eu-pos"
                        value={form.position}
                        onChange={(e) => set("position", e.target.value)}
                        autoComplete="off"
                      />
                    </div>

                    <div className="uap-field">
                      <label htmlFor="eu-first">First name *</label>
                      <input
                        id="eu-first"
                        ref={firstFieldRef}
                        value={form.firstName}
                        onChange={(e) => set("firstName", e.target.value)}
                        required
                        autoComplete="off"
                      />
                    </div>
                    <div className="uap-field">
                      <label htmlFor="eu-last">Last name *</label>
                      <input
                        id="eu-last"
                        value={form.lastName}
                        onChange={(e) => set("lastName", e.target.value)}
                        required
                        autoComplete="off"
                      />
                    </div>

                    <div className="uap-field">
                      <label htmlFor="eu-dept">Department</label>
                      <select
                        id="eu-dept"
                        value={form.department}
                        onChange={(e) => set("department", e.target.value)}
                      >
                        <option value="">— No department —</option>
                        {departments.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="uap-field">
                      <label htmlFor="eu-phone">Phone</label>
                      <input
                        id="eu-phone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => set("phone", e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  {notInvited && (
                    <p className="uap-create-error" role="note">
                      This person hasn’t been invited yet — you can edit their details, but a
                      password reset needs an account (invite them first).
                    </p>
                  )}
                </div>

                <div className="uap-modal-footer uap-create-actions">
                  <button
                    type="button"
                    className="uap-modal-btn"
                    onClick={() => setResetPrompt(true)}
                    disabled={pending || resetPending || notInvited || !user.email}
                    title={
                      notInvited
                        ? "Invite this person first."
                        : user.email
                          ? "Send a password-reset email"
                          : "No email address on file"
                    }
                  >
                    {resetPending ? "Sending…" : "Send password reset"}
                  </button>
                  <button
                    type="button"
                    className="uap-modal-btn"
                    onClick={onChangeEmail}
                    disabled={pending || notInvited}
                    title={notInvited ? "Invite this person first." : "Change the login email"}
                  >
                    Change email
                  </button>
                  <span style={{ flex: 1 }} />
                  <button type="button" className="uap-modal-btn" onClick={handleClose} disabled={pending}>
                    Cancel
                  </button>
                  <button type="submit" className="uap-create-submit" disabled={!canSubmit}>
                    {pending ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      <ConfirmDialog
        open={resetPrompt}
        onClose={cancelReset}
        onConfirm={confirmReset}
        title="Send password-reset email?"
        description={
          user
            ? `${user.firstName} will receive a password-reset link at ${user.email ?? "their email"}.`
            : undefined
        }
        confirmLabel="Send reset email"
        cancelLabel="Cancel"
      />
    </>
  );
}

/** Seed the form from the list payload. */
function fromUser(user: TeamMemberListItem | null): FormState {
  return {
    title: user?.title ?? "",
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    position: user?.position ?? "",
    department: user?.department ?? "",
    phone: user?.phone ?? "",
  };
}
