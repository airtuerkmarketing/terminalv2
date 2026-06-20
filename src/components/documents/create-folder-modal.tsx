"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";
import { createFolder } from "@/app/(public)/documents-library/actions";
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
      invalidateMoveTargets(); // new folder → next Move open re-fetches the tree
      setName("");
      onClose();
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <Modal open={open} onClose={close} title="New folder" width={440}>
      <form onSubmit={submit} className="dl-form">
        <label className="dl-field">
          <span>Folder name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Contracts"
            className="dl-input"
          />
        </label>
        {error && <p className="dl-error">{error}</p>}
        <div className="dl-form-actions">
          <button type="button" className="dl-btn ghost" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="dl-btn primary" disabled={busy || !name.trim()}>
            {busy ? "Creating…" : "Create folder"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
