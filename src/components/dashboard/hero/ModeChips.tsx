"use client";

import type { ReactNode } from "react";
import { MODE_CHIPS, type ChatMode } from "@/components/dashboard/hero-data";

/* KI-Mode-Chips above the search box (D-072). Each chip arms a focused mode in
 * rag-query (Mail polieren / Übersetzen / Kurzfassen / Eskalations-Antwort);
 * clicking the active chip again disarms it back to "default" (normal RAG).
 * The per-chip semantic glow is a scoped exception to D-036 — see hero-data.ts.
 *
 * The icons are inlined as their real lucide-react@1.18.0 geometry (not the
 * lucide components) so individual inner parts can carry .ic-* classes for the
 * per-part hover micro-animations defined in dashboard-hero.css. */

function ChipSvg({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// lucide mail — envelope body (static) + flap (the top "V"), which opens on hover.
function MailIcon({ className }: { className?: string }) {
  return (
    <ChipSvg className={className}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path className="ic-mail-flap" d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
    </ChipSvg>
  );
}

// lucide languages — left glyph group (4 paths) + right "A" group (2 paths),
// which spread apart on hover.
function LanguagesIcon({ className }: { className?: string }) {
  return (
    <ChipSvg className={className}>
      <g className="ic-lang-a">
        <path d="m5 8 6 6" />
        <path d="m4 14 6-6 2-3" />
        <path d="M2 5h12" />
        <path d="M7 2h1" />
      </g>
      <g className="ic-lang-b">
        <path d="m22 22-5-10-5 10" />
        <path d="M14 18h6" />
      </g>
    </ChipSvg>
  );
}

// lucide zap — a single bolt path (no inner parts); the whole bolt zaps on hover.
function ZapIcon({ className }: { className?: string }) {
  return (
    <ChipSvg className={className}>
      <path
        className="ic-zap"
        d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"
      />
    </ChipSvg>
  );
}

// lucide shield-alert — shield body (static) + the "!" mark (line + dot), which
// pulses on hover.
function ShieldAlertIcon({ className }: { className?: string }) {
  return (
    <ChipSvg className={className}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <g className="ic-shield-mark">
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </g>
    </ChipSvg>
  );
}

const ICONS: Record<Exclude<ChatMode, "default">, (p: { className?: string }) => ReactNode> = {
  "rewrite-mail": MailIcon,
  translate: LanguagesIcon,
  summarize: ZapIcon,
  escalation: ShieldAlertIcon,
};

export function ModeChips({
  active,
  onToggle,
}: {
  active: ChatMode;
  onToggle: (mode: ChatMode) => void;
}) {
  return (
    <div className="ai-mode-chips" role="group" aria-label="AI mode">
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
            <Icon className="ai-mode-chip-icon" />
            <span>{chip.label}</span>
          </button>
        );
      })}
    </div>
  );
}
