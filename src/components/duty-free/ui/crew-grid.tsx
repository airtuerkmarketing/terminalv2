import type { CrewGroup } from "@/lib/duty-free";

// Crew object for Duty Free — the §7-adapted tailark/team card grid wired to live
// team_members (grouped by department). Token-swapped to the iOS-18 theme:
// bg-surface tiles, text-text-2 roles, border-hairline dividers (see
// ui/team.adapted.tsx for the raw→adapted pilot). Display-only for B2; the
// freelancer-profile-card center modal (master-plan D2) lands in B4.

function fullName(m: { firstName: string; lastName: string }): string {
  return `${m.firstName} ${m.lastName}`.replace(/\s+/g, " ").trim();
}

export function CrewGrid({ groups }: { groups: CrewGroup[] }) {
  return (
    <div className="mt-2">
      {groups.map((g) => (
        <div key={g.department} className="mt-8 first:mt-0">
          <h3 className="mb-1 text-lg font-medium">
            {g.department}{" "}
            <span className="text-text-3 text-sm font-normal">{g.members.length}</span>
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 border-t border-hairline py-6 sm:grid-cols-3 md:grid-cols-4">
            {g.members.map((m) => (
              <div key={m.id}>
                <div className="bg-surface size-20 rounded-full border border-hairline p-0.5 shadow shadow-zinc-950/5">
                  {m.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage avatar URL
                    <img
                      className="block aspect-square h-full w-full rounded-full object-cover"
                      src={m.photoUrl}
                      alt={fullName(m)}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="text-text-2 flex h-full w-full items-center justify-center rounded-full text-sm font-medium">
                      {m.initials}
                    </div>
                  )}
                </div>
                <span className="mt-2 block text-sm">
                  {fullName(m)}
                  {m.isLead && (
                    <span aria-label="Lead" style={{ color: "var(--df-accent)" }}>
                      {" "}·
                    </span>
                  )}
                </span>
                <span className="text-text-2 block text-xs">{m.position ?? "—"}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
