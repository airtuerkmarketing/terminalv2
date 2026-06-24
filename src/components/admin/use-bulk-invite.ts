import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { isCorpEmail } from "@/lib/corp-email";
import type { TeamMemberListItem } from "@/lib/users";
import { inviteUserAction } from "@/app/(public)/admin/users/actions";

/**
 * Per-section bulk-invite orchestration (AP 3 Phase 6). Owns the two-step flow a
 * section header triggers: a confirm dialog, then sequential `inviteUserAction`
 * calls with a single live progress toast.
 *
 * Why sequential client-side calls (not the existing server-side `bulkInvite`):
 * the spec wants per-person progress ("Lädt ein… 3/12"), which a one-shot server
 * action can't surface. Supabase's invite rate limit (~30/s) makes a sequential
 * await-loop safe.
 *
 * Race safety: `request` is a no-op while a run is in flight, and the panel
 * disables every "Alle einladen" button via `inProgress`; the open confirm
 * dialog's backdrop blocks the buttons behind it. The member list is re-filtered
 * at confirm-time (loginStatus + corp-email), so anyone invited between render
 * and click is silently skipped — no double invite, graceful empty result.
 */

export interface BulkInviteTarget {
  label: string;
  /** Already filtered to invitable (not_invited + corp email) and sorted by
   *  last name, so the progress order is deterministic. */
  members: TeamMemberListItem[];
}

const fullName = (m: TeamMemberListItem) => `${m.firstName} ${m.lastName}`.trim();
const isInvitable = (m: TeamMemberListItem) =>
  m.loginStatus === "not_invited" && isCorpEmail(m.email);

export function useBulkInvite() {
  const router = useRouter();
  const { toast, update, dismiss } = useToast();
  const [target, setTarget] = useState<BulkInviteTarget | null>(null);
  const [running, setRunning] = useState(false);

  // Open the confirm dialog for a section. Ignored while a run is in flight.
  const request = useCallback(
    (label: string, members: TeamMemberListItem[]) => {
      if (running) return;
      setTarget({ label, members });
    },
    [running]
  );

  const cancel = useCallback(() => setTarget(null), []);

  const confirm = useCallback(async () => {
    if (!target) return;
    // Re-filter at click-time: a member may have been invited (in another tab,
    // or via the detail modal) between render and confirm — skip them.
    const pending = target.members.filter(isInvitable);
    setTarget(null);

    if (pending.length === 0) {
      toast({ variant: "info", title: "Niemand mehr einzuladen" });
      router.refresh();
      return;
    }

    setRunning(true);
    const total = pending.length;
    const progressId = toast({ variant: "info", title: `Lädt ein… 0/${total}`, duration: 0 });

    const failures: { name: string; error: string }[] = [];
    let done = 0;
    for (const m of pending) {
      const res = await inviteUserAction(m.teamMemberId);
      done++;
      if (!res.ok) failures.push({ name: fullName(m), error: res.error });
      update(progressId, { title: `Lädt ein… ${done}/${total}` });
    }
    dismiss(progressId);

    const sent = total - failures.length;
    if (failures.length === 0) {
      toast({ variant: "success", title: `${sent} ${sent === 1 ? "Person" : "Personen"} eingeladen` });
    } else {
      toast({ variant: "warning", title: `${sent} eingeladen, ${failures.length} Fehler` });
      // The toast is single-line (toast-desc is hidden by design), so the full
      // per-person breakdown also goes to the console for the admin to inspect.
      console.error("[bulk-invite] failures:", failures);
      const detail = failures.map((f) => `${f.name}: ${f.error}`).join(", ");
      toast({ variant: "info", title: detail, duration: 10000 });
    }

    setRunning(false);
    router.refresh();
  }, [target, toast, update, dismiss, router]);

  return { inProgress: running, request, confirmTarget: target, confirm, cancel };
}
