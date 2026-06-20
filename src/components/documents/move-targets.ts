"use client";

import { useEffect, useState } from "react";
import { listAllFolders } from "@/app/(public)/documents-library/actions";
import type { FolderDTO } from "@/lib/documents";

/**
 * Session cache for the admin "Move" pickers' destination list.
 *
 * The full folder list is only needed inside the folder-move and file-move
 * modals, so it's fetched lazily when a modal opens (not on every folder
 * navigation) and memoized here for the rest of the SPA session. Folder-tree
 * mutations (create/rename/move/delete) call invalidateMoveTargets() so the next
 * open re-fetches; file mutations leave it alone (they don't change the tree).
 */
let cache: Promise<FolderDTO[]> | null = null;

function loadMoveTargets(): Promise<FolderDTO[]> {
  if (!cache) cache = listAllFolders();
  return cache;
}

/** Bust the cache after a folder-tree mutation so the next Move open re-fetches. */
export function invalidateMoveTargets() {
  cache = null;
}

/** Fetch the destination list when `open` flips true (cached across opens). */
export function useMoveTargets(open: boolean): { folders: FolderDTO[]; loading: boolean } {
  const [folders, setFolders] = useState<FolderDTO[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    loadMoveTargets().then(
      (f) => {
        if (active) {
          setFolders(f);
          setLoading(false);
        }
      },
      () => {
        cache = null; // don't cache a rejection — let the next open retry
        if (active) setLoading(false);
      }
    );
    return () => {
      active = false;
    };
  }, [open]);

  return { folders, loading };
}
