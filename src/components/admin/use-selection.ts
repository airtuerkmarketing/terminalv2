import { useCallback, useMemo, useState } from "react";

/**
 * Row-selection state for the User-Management table (AP 3 Phase 5). A single
 * Set<string> of team_member ids plus the helpers the panel + checkbox column
 * need. Every mutator uses the functional setState form, so the callbacks are
 * stable (empty deps) — their identity never forces an effect to re-run.
 *
 * `pruneTo` is the safety valve behind two product rules, both expressed by the
 * panel as "keep only the currently selectable ids":
 *   - F4 (filter prunes selection): a row leaving the filtered view is dropped
 *     from the selection — "einmal weg = weg".
 *   - Q4 (collapse clears a section's selection): a collapsed section's rows are
 *     no longer selectable, so the panel prunes them too.
 * It returns the previous Set unchanged when nothing is pruned, so it is safe to
 * call from an effect on every render without causing state churn.
 *
 * No "use client" directive — matches the sibling use-bulk-invite.ts (the
 * directive lives on the consuming Client Component).
 */
export interface Selection {
  selected: Set<string>;
  size: number;
  has: (id: string) => boolean;
  /** Add the id if absent, remove it if present. */
  toggle: (id: string) => void;
  /**
   * Batch toggle: if every id is already selected, remove them all; otherwise
   * add them all. Additive — ids outside `ids` are untouched (drives the
   * per-section select-all without disturbing other sections).
   */
  toggleMany: (ids: string[]) => void;
  /** Replace the entire selection with exactly these ids. */
  selectAll: (ids: string[]) => void;
  /** Empty the selection. */
  clear: () => void;
  /** Keep only ids that are in `visibleIds`; drop the rest (F4 + Q4). */
  pruneTo: (visibleIds: string[]) => void;
}

export function useSelection(): Selection {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleMany = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = ids.every((id) => next.has(id));
      for (const id of ids) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelected(new Set(ids));
  }, []);

  const clear = useCallback(() => {
    setSelected((prev) => (prev.size === 0 ? prev : new Set()));
  }, []);

  const pruneTo = useCallback((visibleIds: string[]) => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(visibleIds);
      let removed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (visible.has(id)) next.add(id);
        else removed = true;
      }
      return removed ? next : prev;
    });
  }, []);

  const has = useCallback((id: string) => selected.has(id), [selected]);

  return useMemo(
    () => ({ selected, size: selected.size, has, toggle, toggleMany, selectAll, clear, pruneTo }),
    [selected, has, toggle, toggleMany, selectAll, clear, pruneTo]
  );
}
