import type { DutyCardContent } from "@/lib/blocks/types";

export function DutyCard({ content }: { content: DutyCardContent }) {
  return (
    <div className="duty-card">
      <div className="title">{content.title}</div>
      {content.person ? <div className="who">{content.person}</div> : null}
      {content.role ? <div className="role">{content.role}</div> : null}
      {content.items?.length ? (
        <ul>
          {content.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
