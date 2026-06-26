"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";
import { moveFolder } from "@/app/(public)/presentation-hub/actions";
import { invalidateMoveTargets, useMoveTargets } from "./move-targets";

/**
 * Standalone "Move folder" modal, reachable from a folder card/row context menu
 * (D-077) — mirrors the Document Library's. Same lazy destination list + cycle-safe
 * target filter + moveFolder action.
 */
export function PresentationFolderMoveModal({
  open,
  onClose,
  folderId,
  folderPath,
  parentId,
}: {
  open: boolean;
  onClose: () => void;
  folderId: string;
  folderPath: string;
  parentId: string | null;
}) {
  const router = useRouter();
  const { folders, loading: loadingTargets } = useMoveTargets(open);
  const [dest, setDest] = useState<string>(parentId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDest(parentId ?? "");
      setError(null);
    }
  }, [open, parentId]);

  const moveTargets = folders.filter(
    (f) => f.id !== folderId && !f.path.startsWith(`${folderPath}/`)
  );

  async function doMove() {
    setBusy(true);
    setError(null);
    const res = await moveFolder(folderId, dest || null);
    setBusy(false);
    if (res.ok) {
      invalidateMoveTargets();
      onClose();
      router.refresh();
    } else {
      setError(res.error ?? "Something went wrong.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Move folder" width={460}>
      <div className="dl-form">
        <label className="dl-field">
          <span>Destination</span>
          <select className="dl-input" value={dest} onChange={(e) => setDest(e.target.value)} disabled={loadingTargets}>
            <option value="">Top level</option>
            {moveTargets.map((f) => (
              <option key={f.id} value={f.id}>
                {f.path}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="dl-error">{error}</p>}
        <div className="dl-form-actions">
          <button type="button" className="dl-btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="dl-btn primary" onClick={doMove} disabled={busy || loadingTargets}>
            {busy ? "Moving…" : "Move here"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
