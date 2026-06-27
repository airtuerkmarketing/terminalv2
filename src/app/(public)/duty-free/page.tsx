import type { Metadata } from "next";
import "@/styles/duty-free.css";
import { getCrewGroups } from "@/lib/duty-free";
import { CrewGrid } from "@/components/duty-free/ui/crew-grid";

// Duty Free landing (master-plan §4). Auth is enforced by (public)/layout.tsx.
// B2 scope: page shell + the Crew object wired to live team_members. The Hero
// (animated-text-cycle), Memories rail, Celebration strip, Leaderboard and
// Arcade land in later phases (B3, B5–B9).
export const metadata: Metadata = { title: "Duty Free · airtuerk" };

export default async function DutyFreePage() {
  const { groups, total } = await getCrewGroups();

  return (
    <div className="df-page">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <header className="mb-10">
          <div className="df-label mb-3" style={{ color: "var(--df-accent)" }}>
            Duty Free
          </div>
          <h1 className="text-4xl font-bold lg:text-5xl">Welcome to Duty Free.</h1>
          <p className="text-text-2 mt-3 max-w-2xl">
            No status required, no boarding pass needed — just the crew, the
            memories, and the high score that beats yesterday.
          </p>
        </header>

        <section>
          <div className="df-label mb-1" style={{ color: "var(--text-3)" }}>
            Crew · {total}
          </div>
          <CrewGrid groups={groups} />
        </section>
      </div>
    </div>
  );
}
