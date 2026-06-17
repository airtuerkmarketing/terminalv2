"use client";

import { useMemo, useState } from "react";
import "@/styles/team-directory.css";
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle";
// Type-only import: erased at compile time, so server-only pages.ts is NOT pulled
// into this client bundle.
import type { TeamMemberDTO } from "@/lib/pages";

// Department display order (from the Webflow team source TEAM_ORDER).
const TEAM_ORDER = [
  "Management",
  "Service",
  "Finance",
  "HR",
  "IT",
  "Flugdisposition",
  "Vertrieb",
  "Marketing",
  "Verwaltung",
  "airtuerk Holidays",
];

function deptRank(d: string | null): number {
  const i = TEAM_ORDER.indexOf(d ?? "");
  return i === -1 ? 99 : i;
}

function fullName(m: TeamMemberDTO): string {
  return `${m.firstName} ${m.lastName}`.replace(/\s+/g, " ").trim();
}

/**
 * Team Directory (hardcoded route /team, component_key='team-directory').
 * Server-fetched members are passed in; search + department filtering + the
 * grid/card/list view are client-side. Minimal UI for this phase: avatar, name,
 * position, department — the richer fields (tools, tasks, tenure, lead) live in
 * the DB for a later detail modal but are not surfaced here.
 */
export function TeamDirectory({ title, members }: { title: string; members: TeamMemberDTO[] }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("All");
  // Default "card" matches SSR; ViewToggle lifts the persisted choice after mount.
  const [view, setView] = useState<ViewMode>("card");

  const chips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of members) {
      const d = m.department ?? "—";
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    return [
      { key: "All", label: "Alle", count: members.length },
      // Departments in the canonical order; zero-count chips hidden.
      ...TEAM_ORDER.map((d) => ({ key: d, label: d, count: counts.get(d) ?? 0 })).filter(
        (d) => d.count > 0
      ),
    ];
  }, [members]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (active !== "All" && m.department !== active) return false;
      if (q === "") return true;
      const hay = `${fullName(m)} ${m.position ?? ""} ${m.department ?? ""} ${m.email ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [members, active, query]);

  // Group filtered members by department, in canonical order.
  const sections = useMemo(() => {
    const byDept = new Map<string, TeamMemberDTO[]>();
    for (const m of filtered) {
      const d = m.department ?? "—";
      const arr = byDept.get(d) ?? [];
      arr.push(m);
      byDept.set(d, arr);
    }
    return [...byDept.entries()]
      .map(([dept, items]) => ({ dept, items }))
      .sort((a, b) => deptRank(a.dept) - deptRank(b.dept));
  }, [filtered]);

  return (
    <article className="team-directory">
      <header className="page-hero">
        <div className="eyebrow">Resources</div>
        <h1>{title}</h1>
        <p className="lead">
          Das airtuerk-Team — {members.length} Menschen über alle Abteilungen und Marken hinweg.
          Suche nach Name oder Rolle, oder filtere nach Abteilung.
        </p>
      </header>

      <div className="tm-toolbar">
        <div className="tm-search">
          <SearchSvg />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`${members.length} Mitarbeiter durchsuchen…`}
            aria-label="Team durchsuchen"
          />
        </div>
        <ViewToggle value={view} onChange={setView} storageKey="terminalv2-team-view" />
      </div>

      <div className="tm-filters" role="tablist" aria-label="Abteilungen">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            role="tab"
            aria-selected={active === c.key}
            className={`tm-chip${active === c.key ? " active" : ""}`}
            onClick={() => setActive(c.key)}
          >
            {c.label}
            <span className="tm-chip-count">{c.count}</span>
          </button>
        ))}
      </div>

      <div className="tm-count">
        {filtered.length} {filtered.length === 1 ? "Person" : "Personen"}
      </div>

      {sections.length === 0 ? (
        <div className="tm-empty">
          <strong>Keine Treffer.</strong>
          <span>Versuch einen anderen Namen oder Abteilungsfilter.</span>
        </div>
      ) : (
        sections.map((s) => (
          <section key={s.dept} className="tm-section">
            <div className="tm-section-head">
              <h2>{s.dept}</h2>
              <span className="tm-section-count">{s.items.length}</span>
              <div className="tm-line" />
            </div>
            <div className="tm-grid" data-view={view}>
              {s.items.map((m) => (
                <MemberCard key={m.id} member={m} />
              ))}
            </div>
          </section>
        ))
      )}
    </article>
  );
}

function MemberCard({ member }: { member: TeamMemberDTO }) {
  return (
    <div className="tm-card">
      <span className="tm-avatar" aria-hidden={member.photoUrl ? undefined : true}>
        {member.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage avatar URL
          <img src={member.photoUrl} alt={fullName(member)} loading="lazy" decoding="async" />
        ) : (
          member.initials
        )}
      </span>
      <span className="tm-info">
        <span className="tm-name">{fullName(member)}</span>
        {member.position ? <span className="tm-position">{member.position}</span> : null}
      </span>
    </div>
  );
}

function SearchSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
