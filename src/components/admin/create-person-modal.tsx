"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { isCorpEmail } from "@/lib/corp-email";
import type { Role } from "@/lib/users";
import { createTeamMemberAction, inviteUserAction } from "@/app/(public)/admin/users/actions";

const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super-Admin",
  admin: "Admin",
  user: "User",
};

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  position: string;
  role: Role;
}

const EMPTY: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  department: "",
  position: "",
  role: "user",
};

/**
 * Create a new team member (AP 3 Phase 7). Own modal with the hand-rolled
 * focus-trap pattern from user-detail-modal (Escape + Tab-trap + restore focus),
 * NOT the shared modal. Submit → createTeamMemberAction (server-side validation);
 * on success the list is refreshed and — only for a corp email — a secondary
 * ConfirmDialog offers an immediate invite.
 *
 * Mounted permanently by the panel (open is a prop, not a mount guard) so the
 * invite ConfirmDialog survives the form closing: the success flow sets
 * `invitePrompt` AND closes the form in one go, and the confirm must still render.
 *
 * Role select shows all three tiers unconditionally: this page is super_admin-
 * gated (page.tsx notFound() guard), so every viewer is a super_admin. If that
 * gate is ever relaxed to admins, thread isSuperAdmin and hide the super_admin
 * option here (createTeamMemberAction already re-checks server-side).
 */
export function CreatePersonModal({
  open,
  onClose,
  departments,
}: {
  open: boolean;
  onClose: () => void;
  departments: string[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Set after a successful create with a corp email → drives the "jetzt einladen?"
  // confirm. Survives the form modal closing (this component stays mounted).
  const [invitePrompt, setInvitePrompt] = useState<{
    teamMemberId: string;
    email: string;
    firstName: string;
  } | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const emailFieldRef = useRef<HTMLInputElement>(null);

  // Reset on close (every close path routes through here) instead of in an
  // open-effect — avoids a setState-in-effect cascade and still starts each
  // reopen clean. onClose is useCallback-stable in the parent, so handleClose is
  // too, which keeps the focus-trap effect below from re-running spuriously.
  const handleClose = useCallback(() => {
    setForm(EMPTY);
    setEmailError(null);
    setPending(false);
    onClose();
  }, [onClose]);

  // Escape + focus-trap + restore focus (1:1 with user-detail-modal:89-122).
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
    if (key === "email") setEmailError(null);
  }

  const canSubmit =
    form.firstName.trim() !== "" &&
    form.lastName.trim() !== "" &&
    form.email.trim().includes("@") &&
    !pending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    setEmailError(null);
    const email = form.email.trim().toLowerCase();
    const firstName = form.firstName.trim();
    const res = await createTeamMemberAction({
      firstName,
      lastName: form.lastName.trim(),
      email,
      department: form.department || null,
      position: form.position.trim() || null,
      intendedRole: form.role,
    });
    setPending(false);

    if (!res.ok) {
      // DUPLICATE_EMAIL is the only field-specific error → inline at the email
      // field; everything else is a toast (matches the action's German strings).
      if (res.error.includes("bereits vergeben")) {
        setEmailError(res.error);
        emailFieldRef.current?.focus();
      } else {
        toast({ variant: "error", title: res.error });
      }
      return;
    }

    toast({ variant: "success", title: "Person angelegt" });
    // A non-user intended role only takes effect once the person is invited (it
    // lives in user_role_defaults until then), so the new row shows under "Ohne
    // Rolle". Explain that up front.
    if (form.role !== "user") {
      toast({
        variant: "info",
        title: `Rolle '${ROLE_LABEL[form.role]}' wird aktiv, sobald ${firstName} eingeladen wurde`,
        duration: 5000,
      });
    }

    const corp = isCorpEmail(email);
    handleClose();

    if (corp) {
      // Defer the refresh until the invite question is answered.
      setInvitePrompt({ teamMemberId: res.teamMemberId, email, firstName });
    } else {
      toast({
        variant: "info",
        title: "Einladung später möglich nach Wechsel zu Corp-E-Mail",
        duration: 5000,
      });
      router.refresh();
    }
  }

  // useCallback-stable so ConfirmDialog's focus effect (deps [open, onClose]) is
  // not re-run by an unrelated re-render while the invite dialog is open — e.g. a
  // toast auto-dismissing ~5s later re-renders every useToast consumer, which
  // would otherwise steal focus back to Confirm and corrupt the focus-restore.
  const confirmInvite = useCallback(async () => {
    if (!invitePrompt) return;
    const { teamMemberId, email } = invitePrompt;
    setInvitePrompt(null);
    const res = await inviteUserAction(teamMemberId);
    if (res.ok) {
      toast({ variant: "success", title: `Einladung an ${email} versendet` });
    } else {
      toast({ variant: "error", title: res.error });
    }
    router.refresh();
  }, [invitePrompt, router, toast]);

  const skipInvite = useCallback(() => {
    setInvitePrompt(null);
    router.refresh();
  }, [router]);

  if (typeof document === "undefined") return null;

  return (
    <>
      {open &&
        createPortal(
          <div className="uap-modal-backdrop" onClick={handleClose}>
            <div
              className="uap-modal uap-create"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cp-title"
              ref={modalRef}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="uap-modal-close"
                onClick={handleClose}
                aria-label="Schließen"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>

              <div className="uap-modal-header uap-create-header">
                <h2 className="uap-modal-name" id="cp-title">Neue Person</h2>
              </div>

              <form className="uap-create-form" onSubmit={handleSubmit} noValidate>
                <div className="uap-modal-body">
                  <div className="uap-create-grid">
                    <div className="uap-field">
                      <label htmlFor="cp-first">Vorname *</label>
                      <input
                        id="cp-first"
                        ref={firstFieldRef}
                        value={form.firstName}
                        onChange={(e) => set("firstName", e.target.value)}
                        required
                        autoComplete="off"
                      />
                    </div>
                    <div className="uap-field">
                      <label htmlFor="cp-last">Nachname *</label>
                      <input
                        id="cp-last"
                        value={form.lastName}
                        onChange={(e) => set("lastName", e.target.value)}
                        required
                        autoComplete="off"
                      />
                    </div>

                    <div className={`uap-field uap-field--full${emailError ? " uap-field--error" : ""}`}>
                      <label htmlFor="cp-email">E-Mail *</label>
                      <input
                        id="cp-email"
                        ref={emailFieldRef}
                        type="email"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        required
                        autoComplete="off"
                        aria-invalid={emailError ? true : undefined}
                        aria-describedby={emailError ? "cp-email-err" : undefined}
                      />
                      {emailError && (
                        <span id="cp-email-err" className="uap-create-error" role="alert">
                          {emailError}
                        </span>
                      )}
                    </div>

                    <div className="uap-field">
                      <label htmlFor="cp-dept">Department</label>
                      <select
                        id="cp-dept"
                        value={form.department}
                        onChange={(e) => set("department", e.target.value)}
                      >
                        <option value="">— Kein Department —</option>
                        {departments.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="uap-field">
                      <label htmlFor="cp-pos">Position</label>
                      <input
                        id="cp-pos"
                        value={form.position}
                        onChange={(e) => set("position", e.target.value)}
                        autoComplete="off"
                      />
                    </div>

                    <div className="uap-field uap-field--full">
                      <label htmlFor="cp-role">Rolle</label>
                      <select
                        id="cp-role"
                        value={form.role}
                        onChange={(e) => set("role", e.target.value as Role)}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super-Admin</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="uap-modal-footer uap-create-actions">
                  <button type="button" className="uap-modal-btn" onClick={handleClose} disabled={pending}>
                    Abbrechen
                  </button>
                  <button type="submit" className="uap-create-submit" disabled={!canSubmit}>
                    {pending ? "Anlegen…" : "Person anlegen"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      <ConfirmDialog
        open={invitePrompt !== null}
        onClose={skipInvite}
        onConfirm={confirmInvite}
        title="Diese Person jetzt einladen?"
        description={
          invitePrompt
            ? `${invitePrompt.firstName} erhält eine Einladung an ${invitePrompt.email}.`
            : undefined
        }
        confirmLabel="Einladen senden"
        cancelLabel="Später"
      />
    </>
  );
}
