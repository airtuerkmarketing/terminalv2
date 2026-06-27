"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/documents/modal";
import { useToast } from "@/components/ui/toast";
import type { AccessMember, FolderKind } from "@/lib/folder-access";
import {
  getFolderAccess as getDocumentFolderAccess,
  saveFolderAccess as saveDocumentFolderAccess,
} from "@/app/(public)/documents-library/actions";
import {
  getFolderAccess as getPresentationFolderAccess,
  saveFolderAccess as savePresentationFolderAccess,
} from "@/app/(public)/presentation-hub/actions";

/**
 * Shared "Manage access" modal for both the Document Library and the Presentation
 * Hub (D-080). super_admin-only (its callers are gated). Lists the whole team
 * directory with a search box; each person is a toggle — selected = has read
 * access to this folder. Saving diffs the selection against the current grants,
 * persists the change server-side and emails the newly-added people.
 *
 * Granted people get READ-ONLY access (enforced in RLS + the server actions);
 * this modal only manages WHO can see the folder, never what they can do.
 */

// Deterministic avatar tint for the initials fallback (stable per team member).
const AVATAR_COLORS = [
  "#0A82DF", "#16a34a", "#d97706", "#7c3aed",
  "#db2777", "#0891b2", "#dc2626", "#4f46e5",
];
function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function summarize(added: number, removed: number): string {
  if (added && removed) return `Granted ${added}, removed ${removed}.`;
  if (added) return `${added} ${added === 1 ? "person" : "people"} granted access.`;
  if (removed) return `Access removed for ${removed} ${removed === 1 ? "person" : "people"}.`;
  return "No changes.";
}

export function ManagePermissionsModal({
  open,
  onClose,
  folderId,
  folderName,
  kind,
}: {
  open: boolean;
  onClose: () => void;
  folderId: string;
  folderName: string;
  kind: FolderKind;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const getAccess = kind === "document" ? getDocumentFolderAccess : getPresentationFolderAccess;
  const saveAccess = kind === "document" ? saveDocumentFolderAccess : savePresentationFolderAccess;

  const [members, setMembers] = useState<AccessMember[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initial, setInitial] = useState<Set<string>>(new Set());
  // null until the current folder's access has loaded; carries the load error (if any).
  const [loadState, setLoadState] = useState<{ folderId: string; error: string | null } | null>(null);
  const [failedAvatars, setFailedAvatars] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  // Discards a slow earlier load if the modal is reopened/switched mid-flight.
  const reqRef = useRef(0);

  // `loading` is DERIVED (not a setState-in-effect) so this respects the repo's
  // no-setState-in-effect rule: every setState below runs inside a resolved
  // promise or an event handler, never synchronously in the effect body.
  const ready = open && loadState?.folderId === folderId;
  const loading = open && !ready;
  const loadError = ready ? loadState!.error : null;

  useEffect(() => {
    if (!open) return;
    const reqId = ++reqRef.current;
    getAccess(folderId).then((res) => {
      if (reqId !== reqRef.current) return; // a newer load superseded this one
      if (res.ok) {
        setMembers(res.data.members);
        const granted = new Set(res.data.grantedIds);
        setSelected(new Set(granted));
        setInitial(new Set(granted));
        setFailedAvatars(new Set());
        setLoadState({ folderId, error: null });
      } else {
        setLoadState({ folderId, error: res.error });
      }
    });
  }, [open, folderId, getAccess]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
        (m.email ?? "").toLowerCase().includes(q)
    );
  }, [members, query]);

  const dirty =
    selected.size !== initial.size || [...selected].some((id) => !initial.has(id));

  function handleClose() {
    // Reset transient view state in an event handler (not an effect) so a reopen
    // starts clean: loadState=null → derived loading=true → effect refetches.
    setQuery("");
    setLoadState(null);
    onClose();
  }

  function toggle(tmId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tmId)) next.delete(tmId);
      else next.add(tmId);
      return next;
    });
  }

  async function doSave() {
    setBusy(true);
    const res = await saveAccess(folderId, [...selected]);
    setBusy(false);
    if (res.ok) {
      toast({ title: summarize(res.added, res.removed), variant: "success" });
      handleClose();
      router.refresh();
    } else {
      toast({ title: res.error, variant: "error" });
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Manage access" subtitle={folderName} width={480}>
      <div className="dl-perm">
        <input
          className="dl-input dl-perm-search"
          placeholder="Search people…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search people"
          disabled={loading || !!loadError}
        />

        {loading ? (
          <p className="dl-perm-empty">Loading…</p>
        ) : loadError ? (
          <p className="dl-error">{loadError}</p>
        ) : (
          <>
            <div className="dl-perm-meta">
              {selected.size} selected · {members.length} people
            </div>
            <ul className="dl-perm-list" role="listbox" aria-multiselectable="true">
              {filtered.length === 0 && <li className="dl-perm-empty">No people found.</li>}
              {filtered.map((m) => {
                const on = selected.has(m.teamMemberId);
                const showImg = !!m.avatarUrl && !failedAvatars.has(m.teamMemberId);
                const sub = [m.department, m.hasAccount ? null : "no account yet"]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <li key={m.teamMemberId}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={on}
                      className={`dl-perm-row${on ? " is-on" : ""}`}
                      onClick={() => toggle(m.teamMemberId)}
                    >
                      <span
                        className="dl-perm-avatar"
                        style={showImg ? undefined : { background: avatarColor(m.teamMemberId) }}
                      >
                        {showImg ? (
                          /* eslint-disable-next-line @next/next/no-img-element -- public avatars-bucket URL; falls back to initials on error */
                          <img
                            src={m.avatarUrl!}
                            alt=""
                            onError={() =>
                              setFailedAvatars((p) => {
                                const n = new Set(p);
                                n.add(m.teamMemberId);
                                return n;
                              })
                            }
                          />
                        ) : (
                          m.initials
                        )}
                      </span>
                      <span className="dl-perm-id">
                        <span className="dl-perm-name">
                          {m.firstName} {m.lastName}
                        </span>
                        {sub && <span className="dl-perm-sub">{sub}</span>}
                      </span>
                      <span className={`dl-perm-check${on ? " is-on" : ""}`} aria-hidden="true">
                        {on && (
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <div className="dl-form-actions">
          <button type="button" className="dl-btn ghost" onClick={handleClose}>
            Cancel
          </button>
          <button
            type="button"
            className="dl-btn primary"
            onClick={doSave}
            disabled={busy || loading || !!loadError || !dirty}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
