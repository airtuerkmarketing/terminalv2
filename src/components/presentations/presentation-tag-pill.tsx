import type { TagDTO } from "@/lib/presentations";

/** Department tag pill (color dot + display name). Tokens + `ph-tag` classes. */
export function PresentationTagPill({ tag }: { tag: TagDTO }) {
  return (
    <span className="ph-tag">
      <span className="ph-tag-dot" style={tag.color ? { background: tag.color } : undefined} />
      {tag.displayName}
    </span>
  );
}
