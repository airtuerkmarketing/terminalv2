import "server-only";
import { getTeamMembers, type TeamMemberDTO } from "@/lib/pages";

// Canonical department display order — mirrors TEAM_ORDER in the legacy
// /team directory (components/hardcoded/team.tsx) so the Duty Free Crew object
// reads identically to the page it supersedes.
const CREW_ORDER = [
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

export type CrewGroup = { department: string; members: TeamMemberDTO[] };

function deptRank(d: string): number {
  const i = CREW_ORDER.indexOf(d);
  return i === -1 ? 99 : i;
}

/**
 * Crew grouped by department for the Duty Free Crew object. Reuses the same
 * team_members read + avatar (assets.public_url) resolution as the legacy /team
 * directory — single source of truth, behind the (public) login gate's RLS.
 */
export async function getCrewGroups(): Promise<{ groups: CrewGroup[]; total: number }> {
  const members = await getTeamMembers();

  const byDept = new Map<string, TeamMemberDTO[]>();
  for (const m of members) {
    const d = m.department ?? "—";
    const arr = byDept.get(d);
    if (arr) arr.push(m);
    else byDept.set(d, [m]);
  }

  const groups = [...byDept.entries()]
    .map(([department, mem]) => ({ department, members: mem }))
    .sort((a, b) => deptRank(a.department) - deptRank(b.department));

  return { groups, total: members.length };
}
