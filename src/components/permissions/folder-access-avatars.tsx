"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useToast } from "@/components/ui/toast";
import type { AccessMember, FolderKind } from "@/lib/folder-access";
import { revokeFolderAccess as revokeDocumentAccess } from "@/app/(public)/documents-library/actions";
import { revokeFolderAccess as revokePresentationAccess } from "@/app/(public)/presentation-hub/actions";
import "./folder-access-avatars.css";

/**
 * Header avatar group for a folder's per-user grants (D-080). super_admin-only —
 * the grantee list is fetched through a super_admin-gated server action, and
 * non-admins can't read other people's grants under RLS anyway.
 *
 * Shows who currently has access at a glance; clicking an avatar opens a small
 * popover with the person's name and a one-click "Revoke access". Revoking
 * deletes the grant row — RLS then immediately hides the folder + its files from
 * that person. Adding people stays in the ⋮ → "Manage access" modal; this is a
 * view + revoke surface, not a full picker.
 *
 * The parent keys this component by the grantee id set, so a grant/revoke that
 * lands via router.refresh() remounts it clean (no stale optimistic state).
 */

// Deterministic avatar tint for the initials fallback — mirrors the Manage-access
// modal so the same person keeps the same colour across both surfaces.
const AVATAR_COLORS = [
  "#0A82DF", "#16a34a", "#d97706", "#7c3aed",
  "#db2777", "#0891b2", "#dc2626", "#4f46e5",
];
function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const MAX_VISIBLE = 5;

export function FolderAccessAvatars({
  folderId,
  kind,
  grantees,
}: {
  folderId: string;
  kind: FolderKind;
  grantees: AccessMember[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const revoke = kind === "document" ? revokeDocumentAccess : revokePresentationAccess;

  // Optimistic removals for snappy feedback; `grantees` stays the source of truth.
  // A grant/revoke elsewhere changes the parent's key → this remounts and clears.
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const rootRef = useRef<HTMLDivElement>(null);

  // Close the open popover on outside-click / Esc (same pattern as VisibilityPopover).
  useEffect(() => {
    if (openId === null) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpenId(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openId]);

  const shown = grantees.filter((m) => !removed.has(m.teamMemberId));
  if (shown.length === 0) return null;

  const visible = shown.slice(0, MAX_VISIBLE);
  const extra = shown.length - visible.length;

  async function doRevoke(teamMemberId: string) {
    setBusyId(teamMemberId);
    const res = await revoke(folderId, teamMemberId);
    setBusyId(null);
    if (res.ok) {
      setRemoved((prev) => new Set(prev).add(teamMemberId));
      setOpenId(null);
      toast({ title: "Access removed.", variant: "success" });
      router.refresh(); // re-run RLS so the tree/files reflect the revoke immediately
    } else {
      toast({ title: res.error, variant: "error" });
    }
  }

  return (
    <div className="faa" ref={rootRef}>
      <div className="faa-stack">
        {visible.map((m, idx) => {
          const isOpen = openId === m.teamMemberId;
          const showImg = !!m.avatarUrl && !failed.has(m.teamMemberId);
          const fullName = `${m.firstName} ${m.lastName}`;
          const sub = [m.department, m.hasAccount ? null : "no account yet"]
            .filter(Boolean)
            .join(" · ");
          return (
            <div
              key={m.teamMemberId}
              className="faa-item"
              style={{ zIndex: isOpen ? 50 : visible.length - idx }}
            >
              <button
                type="button"
                className="faa-avatar"
                style={showImg ? undefined : { background: avatarColor(m.teamMemberId) }}
                onClick={() => setOpenId(isOpen ? null : m.teamMemberId)}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                title={fullName}
              >
                {showImg ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- public avatars-bucket URL; falls back to initials on error */
                  <img
                    src={m.avatarUrl!}
                    alt=""
                    onError={() =>
                      setFailed((p) => {
                        const n = new Set(p);
                        n.add(m.teamMemberId);
                        return n;
                      })
                    }
                  />
                ) : (
                  m.initials
                )}
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    className="faa-pop"
                    role="dialog"
                    aria-label={`Access — ${fullName}`}
                    initial={{ opacity: 0, y: -4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  >
                    <div className="faa-pop-head">
                      <span
                        className="faa-pop-avatar"
                        style={showImg ? undefined : { background: avatarColor(m.teamMemberId) }}
                      >
                        {showImg ? (
                          /* eslint-disable-next-line @next/next/no-img-element -- same public URL as above */
                          <img src={m.avatarUrl!} alt="" />
                        ) : (
                          m.initials
                        )}
                      </span>
                      <span className="faa-pop-id">
                        <span className="faa-pop-name">{fullName}</span>
                        {sub && <span className="faa-pop-sub">{sub}</span>}
                      </span>
                    </div>

                    <hr className="faa-sep" />

                    <button
                      type="button"
                      className="faa-revoke"
                      onClick={() => doRevoke(m.teamMemberId)}
                      disabled={busyId === m.teamMemberId}
                    >
                      {busyId === m.teamMemberId ? "Revoking…" : "Revoke access"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {extra > 0 && (
          <div className="faa-more" title={`+${extra} more with access`}>
            +{extra}
          </div>
        )}
      </div>
    </div>
  );
}
