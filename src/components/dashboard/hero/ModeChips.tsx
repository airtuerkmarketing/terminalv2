"use client";

import { Mail, Languages, Zap, ShieldAlert, type LucideIcon } from "lucide-react";
import { MODE_CHIPS, type ChatMode } from "@/components/dashboard/hero-data";

/* KI-Mode-Chips above the search box (D-072). Each chip arms a focused mode in
 * rag-query (Mail polieren / Übersetzen / Kurzfassen / Eskalations-Antwort);
 * clicking the active chip again disarms it back to "default" (normal RAG).
 * The per-chip semantic glow is a scoped exception to D-036 — see hero-data.ts. */

const ICONS: Record<Exclude<ChatMode, "default">, LucideIcon> = {
  "rewrite-mail": Mail,
  translate: Languages,
  summarize: Zap,
  escalation: ShieldAlert,
};

export function ModeChips({
  active,
  onToggle,
}: {
  active: ChatMode;
  onToggle: (mode: ChatMode) => void;
}) {
  return (
    <div className="ai-mode-chips" role="group" aria-label="KI-Modus">
      {MODE_CHIPS.map((chip) => {
        const Icon = ICONS[chip.id];
        const isActive = active === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            className={`ai-mode-chip ai-mode-${chip.glow}${isActive ? " is-active" : ""}`}
            aria-pressed={isActive}
            onClick={() => onToggle(isActive ? "default" : chip.id)}
          >
            <Icon className="ai-mode-chip-icon" aria-hidden="true" />
            <span>{chip.label}</span>
          </button>
        );
      })}
    </div>
  );
}
