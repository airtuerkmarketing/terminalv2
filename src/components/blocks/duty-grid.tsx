import type { DutyGridContent } from "@/lib/blocks/types";
import { DutyCard } from "./duty-card";

export function DutyGrid({ content }: { content: DutyGridContent }) {
  return (
    <div className="duty-grid">
      {content.cards.map((c, i) => (
        <DutyCard key={i} content={c} />
      ))}
    </div>
  );
}
