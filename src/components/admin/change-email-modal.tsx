"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { isCorpEmail } from "@/lib/corp-email";
import type { TeamMemberListItem } from "@/lib/users";
import { changeUserEmailAction } from "@/app/(public)/admin/users/actions";

/**
 * Change a team member's LOGIN email (super_admin-gated). Dedicated modal rather
 * than a field in the stammdaten form: email is the GoTrue identity, the backend
 * forces `email_confirm: true` (no ownership re-confirm), and a typed RE-ENTRY of
 * the new address is required here to guard the fat-finger lockout risk that opens
 * (review M3).
 *
 * Mirrors CreatePersonModal: own portal modal, hand-rolled focus-trap, useToast,
 * .uap-create-* CSS. On confirm it calls changeUserEmailAction; on success it
 * router.refresh()es the list (the three-way mirror changed server-side) and closes.
 *
 * Guards surfaced client-side (the server is authoritative and re-checks all of
 * them): not-invited people have no auth account (NOT_INVITED); a peer super_admin's
 * email may only be changed by themselves (CANNOT_MANAGE_PEER_SUPERADMIN); the new
 * address must be a corporate one (PRIVATE_EMAIL_BLOCKED).
 */
export function ChangeEmailModal({
  open,
  user,
  currentUserId,
  onClose,
}: {
  open: boolean;
  user: TeamMemberListItem | null;
  /** Self vs peer check for the super_admin guard (mirrors the server). */
  currentUserId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmPrompt, setConfirmPrompt] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const notInvited = user?.loginStatus === "not_invited";
  const isPeerSuperAdmin =
    user?.role === "super_admin" && user.profileId != null && user.profileId !== currentUserId;
  const blockedReason = notInvited
    ? "This person hasn’t been invited yet — there is no login email to change."
    : isPeerSuperAdmin
      ? "You can’t change the email of another super admin."
      : null;

  // Re-seed on (re)open.
  useEffect(() => {
    if (open) {
      setNewEmail("");
      setConfirmEmail("");
      setPending(false);
    }
  }, [open, user]);

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

  const trimmedNew = newEmail.trim().toLowerCase();
  const trimmedConfirm = confirmEmail.trim().toLowerCase();
  const emailsMatch = trimmedNew !== "" && trimmedNew === trimmedConfirm;
  const looksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedNew);
  const corpOk = trimmedNew === "" || isCorpEmail(trimmedNew);
  const canSubmit = !blockedReason && emailsMatch && looksValid && corpOk && !pending;

  // Inline hint (only once the user has typed something).
  const hint =
    blockedReason ??
    (trimmedNew && !looksValid
      ? "Please enter a valid email address."
      : trimmedNew && !corpOk
        ? "Only company addresses (@airtuerk.de / @airtuerkholidays.de) are allowed."
        : trimmedConfirm && !emailsMatch
          ? "The two email addresses don’t match."
          : null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setConfirmPrompt(true);
  }

  const confirmChange = useCallback(async () => {
    if (!user) return;
    setConfirmPrompt(false);
    setPending(true);
    const res = await changeUserEmailAction(user.teamMemberId, newEmail.trim().toLowerCase());
    setPending(false);
    if (!res.ok) {
      toast({ variant: "error", title: res.error });
      return;
    }
    toast({ variant: "success", title: "Login email changed" });
    handleClose();
    router.refresh();
  }, [user, newEmail, toast, handleClose, router]);

  const cancelConfirm = useCallback(() => setConfirmPrompt(false), []);

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
              aria-labelledby="ce-title"
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
                <h2 className="uap-modal-name" id="ce-title">Change login email</h2>
              </div>

              <form className="uap-create-form" onSubmit={handleSubmit} noValidate>
                <div className="uap-modal-body">
                  <div className="uap-create-grid">
                    <div className="uap-field uap-field--full">
                      <label>Current email</label>
                      <input value={user.email ?? "—"} readOnly disabled />
                    </div>
                    <div className="uap-field uap-field--full">
                      <label htmlFor="ce-new">New email *</label>
                      <input
                        id="ce-new"
                        ref={firstFieldRef}
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        disabled={!!blockedReason}
                        autoComplete="off"
                        required
                      />
                    </div>
                    <div className="uap-field uap-field--full">
                      <label htmlFor="ce-confirm">Re-enter new email *</label>
                      <input
                        id="ce-confirm"
                        type="email"
                        value={confirmEmail}
                        onChange={(e) => setConfirmEmail(e.target.value)}
                        disabled={!!blockedReason}
                        autoComplete="off"
                        required
                      />
                    </div>
                  </div>
                  {hint && (
                    <p className="uap-create-error" role={blockedReason ? "note" : "alert"}>
                      {hint}
                    </p>
                  )}
                </div>

                <div className="uap-modal-footer uap-create-actions">
                  <button type="button" className="uap-modal-btn" onClick={handleClose} disabled={pending}>
                    Cancel
                  </button>
                  <button type="submit" className="uap-create-submit" disabled={!canSubmit}>
                    {pending ? "Changing…" : "Change email"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      <ConfirmDialog
        open={confirmPrompt}
        onClose={cancelConfirm}
        onConfirm={confirmChange}
        variant="danger"
        title="Change this login email?"
        description={
          user
            ? `${user.firstName}'s login email will change from ${user.email ?? "—"} to ${trimmedNew}. They will sign in with the new address from now on.`
            : undefined
        }
        confirmLabel="Change email"
        cancelLabel="Cancel"
      />
    </>
  );
}
