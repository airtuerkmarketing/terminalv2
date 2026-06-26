"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
 * grid/card/list view are client-side. Selecting a member opens a profile detail
 * modal (AP 4) backed by the detail fields carried in the list payload.
 */
export function TeamDirectory({ title, members }: { title: string; members: TeamMemberDTO[] }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("All");
  // Default "card" matches SSR; ViewToggle lifts the persisted choice after mount.
  const [view, setView] = useState<ViewMode>("card");
  const [openId, setOpenId] = useState<string | null>(null);
  const selected = useMemo(() => members.find((m) => m.id === openId) ?? null, [members, openId]);

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
                <MemberCard key={m.id} member={m} onOpen={() => setOpenId(m.id)} />
              ))}
            </div>
          </section>
        ))
      )}

      {selected && <MemberDetailModal member={selected} onClose={() => setOpenId(null)} />}
    </article>
  );
}

function MemberCard({ member, onOpen }: { member: TeamMemberDTO; onOpen: () => void }) {
  return (
    <button type="button" className="tm-card" onClick={onOpen} aria-haspopup="dialog">
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
    </button>
  );
}

// ── Member detail modal (AP 4) ──────────────────────────────────────────────

function formatBirthday(iso: string): string {
  // iso = YYYY-MM-DD; show day + month only (year withheld even when opted in).
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}.${m[2]}.` : iso;
}

/** Normalize a handle/URL to an href; null if blank. */
function asHref(value: string | null, kind: "url" | "mailto" | "tel"): string | null {
  const v = value?.trim();
  if (!v) return null;
  if (kind === "mailto") return `mailto:${v}`;
  if (kind === "tel") return `tel:${v.replace(/[^\d+]/g, "")}`;
  return /^https?:\/\//i.test(v) ? v : `https://${v.replace(/^@/, "")}`;
}

function MemberDetailModal({ member, onClose }: { member: TeamMemberDTO; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const name = fullName(member);
  const socials = [
    { label: "Website", href: asHref(member.website, "url"), value: member.website },
    { label: "GitHub", href: asHref(member.github, "url"), value: member.github },
    { label: "LinkedIn", href: asHref(member.linkedin, "url"), value: member.linkedin },
    { label: "Instagram", href: asHref(member.instagram, "url"), value: member.instagram },
  ].filter((s) => s.href);

  const hasContact = member.email || member.phone || member.location || member.company;

  return createPortal(
    <div className="tmd-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={ref}
        className="tmd-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Profil von ${name}`}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="tmd-close" onClick={onClose} aria-label="Schließen">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <header className="tmd-header">
          <span className="tmd-avatar" aria-hidden={member.photoUrl ? undefined : true}>
            {member.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage avatar URL
              <img src={member.photoUrl} alt={name} />
            ) : (
              member.initials
            )}
          </span>
          <div className="tmd-headmeta">
            <h2 className="tmd-name">
              {name}
              {member.isLead && <span className="tmd-lead">Lead</span>}
            </h2>
            <div className="tmd-sub">
              {[member.position, member.department].filter(Boolean).join(" · ") || "Team"}
            </div>
            {member.statusLine && <p className="tmd-status">{member.statusLine}</p>}
          </div>
        </header>

        <div className="tmd-body">
          {member.about && <p className="tmd-about">{member.about}</p>}

          {hasContact && (
            <section className="tmd-block">
              <h3 className="tmd-block-title">Kontakt</h3>
              <dl className="tmd-dl">
                {member.email && (
                  <Row label="E-Mail">
                    <a href={asHref(member.email, "mailto")!}>{member.email}</a>
                  </Row>
                )}
                {member.phone && (
                  <Row label="Telefon">
                    <a href={asHref(member.phone, "tel")!}>{member.phone}</a>
                  </Row>
                )}
                {member.location && <Row label="Standort">{member.location}</Row>}
                {member.company && <Row label="Firma / Team">{member.company}</Row>}
              </dl>
            </section>
          )}

          {socials.length > 0 && (
            <section className="tmd-block">
              <h3 className="tmd-block-title">Profile</h3>
              <div className="tmd-socials">
                {socials.map((s) => (
                  <a key={s.label} href={s.href!} target="_blank" rel="noopener noreferrer" className="tmd-social">
                    {s.label}
                  </a>
                ))}
              </div>
            </section>
          )}

          {(member.tools.length > 0 || member.joinedYear || member.birthday) && (
            <section className="tmd-block">
              <h3 className="tmd-block-title">Team</h3>
              {member.tools.length > 0 && (
                <div className="tmd-chips">
                  {member.tools.map((t) => (
                    <span key={t} className="tmd-chip">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <dl className="tmd-dl">
                {member.joinedYear && <Row label="Im Team seit">{member.joinedYear}</Row>}
                {member.birthday && <Row label="Geburtstag">{formatBirthday(member.birthday)}</Row>}
              </dl>
            </section>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="tmd-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
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
