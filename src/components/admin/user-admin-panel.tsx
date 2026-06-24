"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SearchIcon } from "@/components/shell/icons";
import type { LoginStatus, TeamMemberListItem } from "@/lib/users";
import { UserSection } from "./user-section";
import { UserDetailModal } from "./user-detail-modal";
import "@/styles/user-admin.css";

export interface UserAdminPanelFilters {
  department?: string;
  /** "" all · role value · "null" = no profile */
  role?: string;
  /** "" all · "active" | "invited" | "not_invited" */
  status?: string;
  q?: string;
}

// Role sections in display order. `key` doubles as the grouping + sessionStorage
// key ("null" = no linked profile yet). super_admin uses --torch — it matches the
// existing super_admin role pill in this panel, so the highest tier stands apart
// from the Quantum-Blue admin accent; user / null stay muted (--text-3).
const ROLE_SECTIONS: { key: string; label: string; color: string }[] = [
  { key: "super_admin", label: "Super-Admin", color: "var(--torch)" },
  { key: "admin", label: "Admin", color: "var(--accent)" },
  { key: "user", label: "User", color: "var(--text-3)" },
  { key: "null", label: "Ohne Rolle", color: "var(--text-3)" },
];

// Default collapse state: the two privileged groups open, the rest collapsed.
const DEFAULT_COLLAPSED: Record<string, boolean> = {
  super_admin: false,
  admin: false,
  user: true,
  null: true,
};

// Sort within a section: active → invited → not_invited, then by last name.
const STATUS_ORDER: Record<LoginStatus, number> = { active: 0, invited: 1, not_invited: 2 };

const SECTION_STORAGE_KEY = "admin-users-section-collapse";
const COLUMN_COUNT = 8;

/**
 * User-Management table (Stage 7A + AP 3 Phase 1): the team-member directory
 * grouped into collapsible role sections (Super-Admin / Admin / User / Ohne
 * Rolle). Department / role / status / free-text filters still apply client-side
 * over the full (~63-row) set passed from the server page; only non-empty
 * sections render. Clicking a row opens the read-only detail modal.
 */
export function UserAdminPanel({
  teamMembers,
  totalCount,
  departments,
  initialFilters,
  currentUserId,
}: {
  teamMembers: TeamMemberListItem[];
  totalCount: number;
  departments: string[];
  initialFilters: UserAdminPanelFilters;
  /** Forwarded to the detail modal; reserved for the Stage 7C self-lock. */
  currentUserId: string;
}) {
  const [q, setQ] = useState(initialFilters.q ?? "");
  const [department, setDepartment] = useState(initialFilters.department ?? "");
  const [role, setRole] = useState(initialFilters.role ?? "");
  const [status, setStatus] = useState(initialFilters.status ?? "");
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const closeModal = useCallback(() => setOpenUserId(null), []);
  const openUser = openUserId
    ? teamMembers.find((u) => u.teamMemberId === openUserId) ?? null
    : null;

  // Collapse state. Starts from the defaults (matches the server HTML), then a
  // stored override is applied one tick later on mount — so the first client
  // render still matches SSR (no hydration mismatch).
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(DEFAULT_COLLAPSED);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SECTION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        setCollapsed((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // sessionStorage unavailable — keep the defaults.
    }
  }, []);
  const toggleSection = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        sessionStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore persistence failures — the toggle still applies for this view.
      }
      return next;
    });
  }, []);

  const hasActiveFilters = q !== "" || department !== "" || role !== "" || status !== "";

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return teamMembers.filter((u) => {
      if (department && u.department !== department) return false;
      if (role) {
        if (role === "null") {
          if (u.role !== null) return false;
        } else if (u.role !== role) {
          return false;
        }
      }
      if (status && u.loginStatus !== status) return false;
      if (needle && !`${u.firstName} ${u.lastName} ${u.email ?? ""}`.toLowerCase().includes(needle))
        return false;
      return true;
    });
  }, [teamMembers, q, department, role, status]);

  // Group the filtered set by role and sort within each group.
  const grouped = useMemo(() => {
    const map: Record<string, TeamMemberListItem[]> = {
      super_admin: [],
      admin: [],
      user: [],
      null: [],
    };
    for (const u of filtered) map[u.role ?? "null"].push(u);
    for (const bucket of Object.values(map)) {
      bucket.sort(
        (a, b) =>
          STATUS_ORDER[a.loginStatus] - STATUS_ORDER[b.loginStatus] ||
          a.lastName.localeCompare(b.lastName) ||
          a.firstName.localeCompare(b.firstName)
      );
    }
    return map;
  }, [filtered]);

  // Only non-empty sections render (an empty Admin/User group is hidden, not
  // shown as "Admin (0)"; the same applies when a filter empties a group).
  const visibleSections = ROLE_SECTIONS.map((s) => ({ ...s, users: grouped[s.key] })).filter(
    (s) => s.users.length > 0
  );

  function resetFilters() {
    setQ("");
    setDepartment("");
    setRole("");
    setStatus("");
  }

  return (
    <div className="uap">
      <header className="uap-head">
        <h1 className="uap-title">User-Management</h1>
        <p className="uap-sub">
          {filtered.length} von {totalCount} Personen
        </p>
      </header>

      <div className="uap-filters">
        <div className="uap-search">
          <SearchIcon />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suchen: Name, E-Mail…"
            aria-label="Personen suchen"
          />
        </div>

        <select
          className="uap-select"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          aria-label="Nach Department filtern"
        >
          <option value="">Alle Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          className="uap-select"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          aria-label="Nach Rolle filtern"
        >
          <option value="">Alle Rollen</option>
          <option value="super_admin">Super-Admin</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
          <option value="null">Kein Profil</option>
        </select>

        <select
          className="uap-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Nach Login-Status filtern"
        >
          <option value="">Alle Status</option>
          <option value="active">Aktiv</option>
          <option value="invited">Eingeladen</option>
          <option value="not_invited">Nicht eingeladen</option>
        </select>

        {hasActiveFilters && (
          <button type="button" className="uap-reset" onClick={resetFilters}>
            Zurücksetzen
          </button>
        )}
      </div>

      <div className="uap-table-wrap">
        <table className="uap-table">
          <thead>
            <tr>
              <th className="uap-cell-avatar">
                <span className="uap-sr">Avatar</span>
              </th>
              <th>Name</th>
              <th>Position</th>
              <th>E-Mail</th>
              <th>Department</th>
              <th>Rolle</th>
              <th>Status</th>
              <th>Letzter Login</th>
            </tr>
          </thead>
          {filtered.length === 0 ? (
            <tbody>
              <tr>
                <td className="uap-empty" colSpan={COLUMN_COUNT}>
                  Keine Personen gefunden
                </td>
              </tr>
            </tbody>
          ) : (
            visibleSections.map((s) => (
              <UserSection
                key={s.key}
                label={s.label}
                color={s.color}
                users={s.users}
                collapsed={collapsed[s.key] ?? false}
                colSpan={COLUMN_COUNT}
                onToggle={() => toggleSection(s.key)}
                onOpenUser={setOpenUserId}
              />
            ))
          )}
        </table>
      </div>

      {openUser && (
        <UserDetailModal
          key={openUser.teamMemberId}
          user={openUser}
          currentUserId={currentUserId}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
