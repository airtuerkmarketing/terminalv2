import type { LoginStatus, TeamMemberListItem } from "./users";

/**
 * Column + sort preferences for the User-Management table (AP 3 Phase 4).
 *
 * Pure, no-JSX module shared by the panel, the sortable headers and the column-
 * visibility dropdown. Two persistence channels, deliberately split:
 *   - column visibility  → localStorage ("admin-users-columns"), per-device
 *   - sort state         → the URL (?sort=&dir=), so it is bookmarkable/shareable
 *     (parsed server-side in the page and seeded back as initialSort)
 */

export type ColumnKey =
  | "avatar"
  | "name"
  | "position"
  | "email"
  | "department"
  | "role"
  | "status"
  | "lastSignIn"
  | "tools"
  | "created";

export type SortKey =
  | "name"
  | "position"
  | "email"
  | "department"
  | "status"
  | "lastSignIn"
  | "created";

export type SortDir = "asc" | "desc";

export interface SortState {
  key: SortKey | null;
  dir: SortDir;
}

export interface ColumnDef {
  key: ColumnKey;
  label: string;
  /** false → always visible and hidden from the dropdown (Name anchors the row). */
  toggleable: boolean;
  defaultVisible: boolean;
  /** Sort key when the header is sortable, else null. */
  sortKey: SortKey | null;
}

/** Column order — drives both the <thead> and each row's cell order. */
export const COLUMNS: ColumnDef[] = [
  { key: "avatar", label: "Avatar", toggleable: true, defaultVisible: true, sortKey: null },
  { key: "name", label: "Name", toggleable: false, defaultVisible: true, sortKey: "name" },
  { key: "position", label: "Position", toggleable: true, defaultVisible: true, sortKey: "position" },
  { key: "email", label: "E-Mail", toggleable: true, defaultVisible: true, sortKey: "email" },
  { key: "department", label: "Department", toggleable: true, defaultVisible: true, sortKey: "department" },
  { key: "role", label: "Rolle", toggleable: true, defaultVisible: true, sortKey: null },
  { key: "status", label: "Status", toggleable: true, defaultVisible: true, sortKey: "status" },
  { key: "lastSignIn", label: "Letzter Login", toggleable: true, defaultVisible: false, sortKey: "lastSignIn" },
  { key: "tools", label: "Tools", toggleable: true, defaultVisible: false, sortKey: null },
  { key: "created", label: "Erstellt", toggleable: true, defaultVisible: false, sortKey: "created" },
];

export type ColumnVisibility = Record<ColumnKey, boolean>;

export const DEFAULT_VISIBILITY: ColumnVisibility = COLUMNS.reduce((acc, c) => {
  acc[c.key] = c.defaultVisible;
  return acc;
}, {} as ColumnVisibility);

const COLUMNS_STORAGE_KEY = "admin-users-columns";

/**
 * Read persisted column visibility, falling back to the defaults. Name is forced
 * on so the table can never become nameless; unknown/legacy keys are ignored.
 * Call only on the client (guarded so SSR/first render uses DEFAULT_VISIBILITY,
 * which keeps the markup hydration-stable).
 */
export function loadColumnVisibility(): ColumnVisibility {
  const next = { ...DEFAULT_VISIBILITY };
  try {
    const raw = window.localStorage.getItem(COLUMNS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Record<ColumnKey, unknown>>;
      for (const c of COLUMNS) {
        if (typeof parsed[c.key] === "boolean") next[c.key] = parsed[c.key] as boolean;
      }
    }
  } catch {
    // localStorage unavailable / malformed — keep the defaults.
  }
  next.name = true;
  return next;
}

export function saveColumnVisibility(v: ColumnVisibility): void {
  try {
    window.localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(v));
  } catch {
    // ignore persistence failures — the change still applies for this view.
  }
}

const SORT_KEYS = new Set<SortKey>([
  "name",
  "position",
  "email",
  "department",
  "status",
  "lastSignIn",
  "created",
]);

/** Parse the URL ?sort/?dir params into a SortState (defaults to no sort). */
export function parseSort(sort?: string, dir?: string): SortState {
  if (sort && SORT_KEYS.has(sort as SortKey)) {
    return { key: sort as SortKey, dir: dir === "desc" ? "desc" : "asc" };
  }
  return { key: null, dir: "asc" };
}

const STATUS_RANK: Record<LoginStatus, number> = { active: 0, invited: 1, not_invited: 2 };

function byName(a: TeamMemberListItem, b: TeamMemberListItem): number {
  return a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);
}

/**
 * Compare two string/date cells with empty values always sorted last. Returns a
 * finite number when both are present; ±Infinity flags a null that must stay at
 * the bottom regardless of sort direction.
 */
function nullsLast(a: string | null, b: string | null, isDate: boolean): number {
  const ae = a == null || a === "";
  const be = b == null || b === "";
  if (ae && be) return 0;
  if (ae) return Number.POSITIVE_INFINITY;
  if (be) return Number.NEGATIVE_INFINITY;
  if (isDate) return a! < b! ? -1 : a! > b! ? 1 : 0; // ISO 8601 sorts lexicographically
  return a!.localeCompare(b!);
}

/**
 * Row comparator honouring the active sort. With no column selected this is the
 * panel's default order (status, then name). Empty cells always sink to the
 * bottom regardless of direction; ties break by name for a stable order.
 */
export function compareBySort(
  a: TeamMemberListItem,
  b: TeamMemberListItem,
  sort: SortState
): number {
  if (!sort.key) {
    return STATUS_RANK[a.loginStatus] - STATUS_RANK[b.loginStatus] || byName(a, b);
  }

  let raw = 0;
  switch (sort.key) {
    case "name":
      raw = byName(a, b);
      break;
    case "position":
      raw = nullsLast(a.position, b.position, false);
      break;
    case "email":
      raw = nullsLast(a.email, b.email, false);
      break;
    case "department":
      raw = nullsLast(a.department, b.department, false);
      break;
    case "status":
      raw = STATUS_RANK[a.loginStatus] - STATUS_RANK[b.loginStatus];
      break;
    case "lastSignIn":
      raw = nullsLast(a.lastSignInAt, b.lastSignInAt, true);
      break;
    case "created":
      raw = nullsLast(a.createdAt, b.createdAt, true);
      break;
  }

  // A null sentinel (±Infinity) keeps that row last in BOTH directions.
  if (!Number.isFinite(raw)) return raw > 0 ? 1 : -1;

  const base = raw !== 0 ? raw : byName(a, b);
  return sort.dir === "desc" ? -base : base;
}
