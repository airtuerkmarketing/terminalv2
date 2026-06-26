"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { activateOwnProfileAction } from "./actions";

/**
 * Shown when the signed-in account has no linked team_member yet (the one
 * deliberately-unlinked account, dev@). One click provisions + links a profile so
 * the editable form can render.
 */
export default function ActivateProfile({ name }: { name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="acp-card acp-activate">
      <h1 className="acp-title">Set up profile</h1>
      <p className="acp-muted">
        No team profile exists yet for <strong>{name}</strong>. Create one now to
        complete your details.
      </p>
      {error && (
        <div className="acp-error" role="alert">
          {error}
        </div>
      )}
      <button
        type="button"
        className="acp-btn acp-btn--primary"
        disabled={pending}
        onClick={() => {
          setError(null);
          start(async () => {
            const r = await activateOwnProfileAction();
            if (!r.ok) setError(r.error);
            else router.refresh();
          });
        }}
      >
        {pending ? "Creating…" : "Create profile"}
      </button>
    </div>
  );
}
