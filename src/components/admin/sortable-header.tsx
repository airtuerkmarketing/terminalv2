import type { SortDir } from "@/lib/admin-users-preferences";

/**
 * A sortable column header cell for the User-Management table (AP 3 Phase 4).
 * Renders a `<th>` whose whole label is a button; clicking cycles the panel's
 * sort tri-state (default → asc → desc → default). The dual-chevron icon
 * highlights the active direction. `aria-sort` reflects state for assistive tech.
 */
export function SortableHeader({
  label,
  active,
  dir,
  onSort,
  className,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onSort: () => void;
  className?: string;
}) {
  return (
    <th
      className={className}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        className={`uap-sort${active ? ` is-active is-${dir}` : ""}`}
        onClick={onSort}
      >
        <span>{label}</span>
        <svg
          className="uap-sort-icon"
          viewBox="0 0 24 24"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path className="uap-sort-up" d="M8 10l4-4 4 4" />
          <path className="uap-sort-down" d="M8 14l4 4 4-4" />
        </svg>
      </button>
    </th>
  );
}
