"use client";

import { QUICK_CHIPS } from "@/components/dashboard/hero-data";

/* 4 static curated chips under the box (BAU-Auftrag §5.6).
 * Click inserts the text into the box — NOT auto-submit. */

export function QuickChips({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="ai-search-chips">
      {QUICK_CHIPS.map((text) => (
        <button
          key={text}
          type="button"
          className="ai-search-chip"
          onClick={() => onPick(text)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
