import Link from "next/link";
import "@/styles/gold-set.css";

/**
 * Gold-Set parent index (hardcoded route /gold-set, component_key='gold-set').
 * The three AI TEST review pages were relocated under /gold-set/* (DB MCP move,
 * 2026-06-21), so this small index links to them. hidden_in_sidebar=true on the
 * page row keeps it out of the nav; reached directly or via the sidebar's three
 * AI-TEST leaves. noindex,nofollow is applied in page-view.tsx (NOINDEX_PATHS).
 */
const TESTS = [
  { slug: "ai-test-1", label: "AI TEST 1" },
  { slug: "ai-test-2", label: "AI TEST 2" },
  { slug: "ai-test-3", label: "AI TEST 3" },
];

export function GoldSetIndex({ title }: { title: string }) {
  return (
    <article className="gs-wrap">
      <header className="page-hero">
        <div className="eyebrow">Internal</div>
        <h1>{title}</h1>
      </header>

      <p className="gs-intro">
        Diese Seiten dienen der <strong>Gold-Set-Validation</strong> durch Selin und Ufuk.
        Jede Test-Seite zeigt vorgeschlagene Antworten zur Bewertung (richtig/falsch).
      </p>

      <nav className="gs-index-list" aria-label="Gold-Set Tests">
        {TESTS.map((t) => (
          <Link key={t.slug} href={`/gold-set/${t.slug}`} className="gs-index-link">
            <span>{t.label}</span>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14" />
              <path d="M13 6l6 6-6 6" />
            </svg>
          </Link>
        ))}
      </nav>
    </article>
  );
}
