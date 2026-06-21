"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";
import { createFolder } from "@/app/(public)/presentation-hub/actions";
import { invalidateMoveTargets } from "./move-targets";

/** Create a folder under `parentId` (null = top level). */
export function CreateFolderModal({
  open,
  onClose,
  parentId,
}: {
  open: boolean;
  onClose: () => void;
  parentId: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (busy) return;
    setName("");
    setError(null);
    onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createFolder(parentId, name);
    setBusy(false);
    if (res.ok) {
      invalidateMoveTargets();
      setName("");
      onClose();
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <Modal open={open} onClose={close} title="New folder" width={440}>
      <form onSubmit={submit} className="ph-form">
        <label className="ph-field">
          <span>Folder name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sales"
            className="ph-input"
          />
        </label>
        {error && <p className="ph-error">{error}</p>}
        <div className="ph-form-actions">
          <button type="button" className="ph-btn ghost" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="ph-btn primary" disabled={busy || !name.trim()}>
            {busy ? "Creating…" : "Create folder"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
