"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RelativeTime } from "@/components/documents/relative-time";
import { useToast } from "@/components/ui/toast";
import { TooltipShell } from "@/components/ui/tooltip";
import { isCorpEmail } from "@/lib/corp-email";
import type { TeamMemberListItem } from "@/lib/users";
import { inviteUserAction } from "@/app/(public)/admin/users/actions";

const STRINGS = {
  invite: "Einladen",
  resend: "Erneut einladen",
  sending: "Senden…",
  active: "Aktiv",
  lastLogin: "Letzter Login: ",
  lastInvited: "Zuletzt eingeladen ",
  noEmail: "Keine E-Mail-Adresse hinterlegt",
  blocked: "Privat-E-Mail — Einladung gesperrt",
  blockedTooltip: "Einladungen gehen nur an @airtuerk.de-Adressen. Bitte zuerst eine Firmen-Adresse einrichten.",
  successTitle: (email: string) => `Einladung an ${email} versendet`,
};

/**
 * Status-dependent left side of the detail-modal footer (AP 3 Phase 2). Owns the
 * invite/resend action; the modal keeps the "Schließen" button beside it.
 *
 * - active      → last-login hint, no invite (the role picker handles mutations)
 * - invited     → "Erneut einladen" + "zuletzt eingeladen vor X"
 * - not_invited → "Einladen" (corp email) · blocked pill + tooltip (private email)
 *
 * On success the list behind the modal is refreshed (router.refresh), so the
 * member's loginStatus flips and this footer re-renders into the resend state.
 * Server errors (incl. RATE_LIMIT:<n>) arrive pre-mapped to German and surface
 * as toasts.
 */
export function InviteFooter({ user }: { user: TeamMemberListItem }) {
  const router = useRouter();
  const { toast } = useToast();
  const [inviting, setInviting] = useState(false);

  async function doInvite() {
    setInviting(true);
    const res = await inviteUserAction(user.teamMemberId);
    setInviting(false);
    if (res.ok) {
      toast({ variant: "success", title: STRINGS.successTitle(user.email ?? "") });
      router.refresh();
    } else {
      toast({ variant: "error", title: res.error });
    }
  }

  if (user.loginStatus === "active") {
    return (
      <span className="uap-modal-hint">
        {user.lastSignInAt ? (
          <>
            {STRINGS.lastLogin}
            <RelativeTime iso={user.lastSignInAt} />
          </>
        ) : (
          STRINGS.active
        )}
      </span>
    );
  }

  if (user.loginStatus === "invited") {
    return (
      <div className="uap-invite">
        <button type="button" className="uap-invite-btn" onClick={doInvite} disabled={inviting}>
          {inviting ? STRINGS.sending : STRINGS.resend}
        </button>
        {user.lastInvitedAt && (
          <span className="uap-modal-hint">
            {STRINGS.lastInvited}
            <RelativeTime iso={user.lastInvitedAt} />
          </span>
        )}
      </div>
    );
  }

  // not_invited
  if (!user.email) {
    return <span className="uap-modal-hint">{STRINGS.noEmail}</span>;
  }
  if (!isCorpEmail(user.email)) {
    return (
      <TooltipShell content={STRINGS.blockedTooltip}>
        <span className="uap-invite-blocked" tabIndex={0}>
          {STRINGS.blocked}
        </span>
      </TooltipShell>
    );
  }
  return (
    <button
      type="button"
      className="uap-invite-btn uap-invite-btn--primary"
      onClick={doInvite}
      disabled={inviting}
    >
      {inviting ? STRINGS.sending : STRINGS.invite}
    </button>
  );
}
