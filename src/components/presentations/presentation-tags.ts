"use client";

import { useEffect, useState } from "react";
import { listPresentationTags } from "@/app/(public)/presentation-hub/actions";
import type { TagDTO } from "@/lib/presentations";

/**
 * Session cache for the department-tag list (upload + manage modals). Tags rarely
 * change and are seeded, so fetch once on first modal open and reuse.
 */
let cache: Promise<TagDTO[]> | null = null;

function loadTags(): Promise<TagDTO[]> {
  if (!cache) cache = listPresentationTags();
  return cache;
}

export function usePresentationTags(open: boolean): { tags: TagDTO[]; loading: boolean } {
  const [tags, setTags] = useState<TagDTO[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    loadTags().then(
      (t) => {
        if (active) {
          setTags(t);
          setLoading(false);
        }
      },
      () => {
        cache = null;
        if (active) setLoading(false);
      }
    );
    return () => {
      active = false;
    };
  }, [open]);

  return { tags, loading };
}
