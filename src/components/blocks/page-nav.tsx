import Link from "next/link";
import type { PageNavContent } from "@/lib/blocks/types";

export function PageNav({ content }: { content: PageNavContent }) {
  return (
    <nav className="page-nav" aria-label="Page navigation">
      {content.prev ? (
        <Link href={content.prev.href}>
          <span className="dir">← Previous</span>
          <span className="pg">{content.prev.label}</span>
        </Link>
      ) : (
        <span />
      )}
      {content.next ? (
        <Link className="next" href={content.next.href}>
          <span className="dir">Next →</span>
          <span className="pg">{content.next.label}</span>
        </Link>
      ) : null}
    </nav>
  );
}
