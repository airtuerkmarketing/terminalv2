"use client";

import { useCallback, useMemo, useState } from "react";
import { SearchIcon } from "@/components/shell/icons";
import type { TeamMemberListItem } from "@/lib/users";
import { UserRow } from "./user-row";
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

/**
 * User-Management table (Stage 7A): read-only list of the whole team-member
 * directory with department / role / login-status / free-text filters applied
 * client-side. The full set (~63 rows) is passed in from the server page, so
 * filtering in memory is instant and reversible (no debounce needed at this
 * scale). Editing, the detail modal and server-side filter URL sync are Stage
 * 7B/7C; clicking a row is a no-op for now.
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
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td className="uap-empty" colSpan={8}>
                  Keine Personen gefunden
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <UserRow
                  key={u.teamMemberId}
                  user={u}
                  onClick={() => setOpenUserId(u.teamMemberId)}
                />
              ))
            )}
          </tbody>
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
