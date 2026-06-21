"use client";

import { useEffect, useState } from "react";
import { listAllPresentationFolders } from "@/app/(public)/presentation-hub/actions";
import type { PresentationFolderDTO } from "@/lib/presentations";

/**
 * Session cache for the admin "Move" pickers' destination list. Fetched lazily
 * when a move modal opens, memoized for the rest of the SPA session. Folder-tree
 * mutations call invalidateMoveTargets() so the next open re-fetches.
 */
let cache: Promise<PresentationFolderDTO[]> | null = null;

function loadMoveTargets(): Promise<PresentationFolderDTO[]> {
  if (!cache) cache = listAllPresentationFolders();
  return cache;
}

export function invalidateMoveTargets() {
  cache = null;
}

export function useMoveTargets(open: boolean): { folders: PresentationFolderDTO[]; loading: boolean } {
  const [folders, setFolders] = useState<PresentationFolderDTO[]>([]);
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
