"use client";

import type { ComponentType } from "react";
import {
  FileText,
  FileStack,
  ImageIcon,
  Tag,
  type LucideProps,
} from "lucide-react";
import { TerminalLogo } from "@/components/shell/TerminalLogo";
import { FlagIcon } from "@/components/ui/flag-icon";
import { LANGUAGES } from "@/lib/documents-constants";
import type { SearchHit, SearchResults } from "@/lib/search/types";

/* Floating results dropdown under the box, Linear-style (BAU-Auftrag §5.3).
 * Grouped by type, max 5 per group. Keyboard nav (↑↓/Enter/Esc) lives in the
 * parent (SearchAIBox); this component highlights `activeId` and reports hover.
 * The last row always escalates to KI-Modus with the current query. */

const ASK_AI_ID = "__ask_ai__";
export { ASK_AI_ID };

type GroupKey = keyof SearchResults;

const GROUPS: { key: GroupKey; label: string; Icon: ComponentType<LucideProps> }[] = [
  { key: "pages", label: "Pages", Icon: FileText },
  { key: "documents", label: "Documents", Icon: FileStack },
  { key: "assets", label: "Assets", Icon: ImageIcon },
  { key: "brands", label: "Brands", Icon: Tag },
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
                {(hit.language || hit.extension) && (
                  <span
                    className="ai-search-hit-badges"
                    role="img"
                    aria-label={[
                      hit.language
                        ? LANGUAGES.find((l) => l.code === hit.language)?.name ??
                          hit.language.toUpperCase()
                        : null,
                      hit.extension ? hit.extension.toUpperCase() : null,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  >
                    {hit.language && <FlagIcon code={hit.language} />}
                    {hit.extension && (
                      <span className="ai-search-hit-badge">
                        {hit.extension.toUpperCase()}
                      </span>
                    )}
                  </span>
                )}
              </button>
            ))}
          </div>
        );
      })}

      {total === 0 && !loading && (
        <div className="ai-search-empty">No results for “{query}”</div>
      )}
      {loading && total === 0 && <div className="ai-search-empty">Searching…</div>}

      <button
        type="button"
        role="option"
        aria-selected={activeId === ASK_AI_ID}
        className={`ai-search-askai${activeId === ASK_AI_ID ? " is-active" : ""}`}
        onMouseEnter={() => onHover(ASK_AI_ID)}
        onClick={onAskAi}
      >
        <TerminalLogo variant="mark" title="" className="ai-search-hit-icon ai-search-askai-mark" />
        <span className="ai-search-askai-text">
          Ask the AI instead: <strong>“{query}”</strong>
        </span>
      </button>
    </div>
  );
}
