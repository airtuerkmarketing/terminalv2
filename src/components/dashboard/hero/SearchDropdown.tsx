"use client";

import type { ComponentType } from "react";
import {
  FileText,
  FileStack,
  ImageIcon,
  Tag,
  Sparkles,
  type LucideProps,
} from "lucide-react";
import type { SearchHit, SearchResults } from "@/lib/search/types";

/* Floating results dropdown under the box, Linear-style (BAU-Auftrag §5.3).
 * Grouped by type, max 5 per group. Keyboard nav (↑↓/Enter/Esc) lives in the
 * parent (SearchAIBox); this component highlights `activeId` and reports hover.
 * The last row always escalates to KI-Modus with the current query. */

const ASK_AI_ID = "__ask_ai__";
export { ASK_AI_ID };

type GroupKey = keyof SearchResults;

const GROUPS: { key: GroupKey; label: string; Icon: ComponentType<LucideProps> }[] = [
  { key: "pages", label: "Seiten", Icon: FileText },
  { key: "documents", label: "Dokumente", Icon: FileStack },
  { key: "assets", label: "Assets", Icon: ImageIcon },
  { key: "brands", label: "Marken", Icon: Tag },
];

export function SearchDropdown({
  results,
  loading,
  query,
  activeId,
  onSelect,
  onAskAi,
  onHover,
}: {
  results: SearchResults;
  loading: boolean;
  query: string;
  activeId: string | null;
  onSelect: (hit: SearchHit) => void;
  onAskAi: () => void;
  onHover: (id: string) => void;
}) {
  const total =
    results.pages.length +
    results.documents.length +
    results.assets.length +
    results.brands.length;

  return (
    <div className="ai-search-dropdown" role="listbox">
      {GROUPS.map(({ key, label, Icon }) => {
        const hits = results[key];
        if (hits.length === 0) return null;
        return (
          <div className="ai-search-group" key={key}>
            <div className="ai-search-group-label">{label}</div>
            {hits.map((hit) => (
              <button
                type="button"
                key={hit.id}
                role="option"
                aria-selected={activeId === hit.id}
                className={`ai-search-hit${activeId === hit.id ? " is-active" : ""}`}
                onMouseEnter={() => onHover(hit.id)}
                onClick={() => onSelect(hit)}
              >
                <Icon className="ai-search-hit-icon" aria-hidden="true" />
                <span className="ai-search-hit-body">
                  <span className="ai-search-hit-title">{hit.title}</span>
                  {hit.subtitle && (
                    <span className="ai-search-hit-meta">{hit.subtitle}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        );
      })}

      {total === 0 && !loading && (
        <div className="ai-search-empty">Keine Treffer für „{query}“</div>
      )}
      {loading && total === 0 && <div className="ai-search-empty">Suche…</div>}

      <button
        type="button"
        role="option"
        aria-selected={activeId === ASK_AI_ID}
        className={`ai-search-askai${activeId === ASK_AI_ID ? " is-active" : ""}`}
        onMouseEnter={() => onHover(ASK_AI_ID)}
        onClick={onAskAi}
      >
        <Sparkles className="ai-search-hit-icon" aria-hidden="true" />
        <span className="ai-search-askai-text">
          Frag stattdessen die KI: <strong>„{query}“</strong>
        </span>
      </button>
    </div>
  );
}
