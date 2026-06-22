"use client";

import { useEffect, useRef, useState } from "react";
import { copyPlainText } from "@/lib/email-tools";
// Type-only import (blocks/types.ts has no server-only code; this keeps the
// boundary clean regardless).
import type { ColorPaletteContent } from "@/lib/blocks/types";

// Panel background is the brand swatch itself (brand-content colour, set from
// data — this is the one legitimate place brand colours like torch red appear).
// Text colour auto-contrasts against the swatch.
function isLight(hex: string) {
  const h = hex.replace("#", "");
  if (h.length < 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 186;
}

export function ColorPalette({ content }: { content: ColorPaletteContent }) {
  const strips = content.display === "strips";
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  // Clear any pending dismiss timer if the palette unmounts mid-toast.
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  // Reuses copyPlainText from email-tools (Clipboard API + textarea fallback) —
  // clipboard logic is not reimplemented here. Copied state mirrors the signature
  // generator: accent + check icon, transient, NO green (no success token exists).
  async function copyHex(i: number, hex: string) {
    const ok = await copyPlainText(hex);
    if (!ok) return;
    setCopiedIdx(i);
    setToast(`HEX ${hex} copied`);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setCopiedIdx(null);
      setToast(null);
    }, 1500);
  }

  return (
    <div className={`palette${strips ? " palette--strips" : ""}`}>
      {content.colors.map((c, i) => {
        const copied = copiedIdx === i;
        const cname = <div className="cname">{c.name}</div>;
        const vals = (
          <div className="vals">
            <span>HEX {c.hex}</span>
            {c.rgb ? <span>RGB {c.rgb}</span> : null}
            {c.cmyk ? <span>CMYK {c.cmyk}</span> : null}
          </div>
        );
        return (
          <div
            key={i}
            className="color-panel"
            style={{ background: c.hex, color: isLight(c.hex) ? "#222222" : "white" }}
            onClick={() => copyHex(i, c.hex)}
          >
            <div className="color-panel-top">
              <div className="color-panel-meta">
                <div className="idx">{String(i + 1).padStart(2, "0")}</div>
                {c.role ? <div className="role">{c.role}</div> : null}
              </div>
              <button
                type="button"
                className={`color-copy${copied ? " is-copied" : ""}`}
                aria-label={copied ? `Copied HEX ${c.hex}` : `Copy HEX ${c.hex}`}
                onClick={(e) => {
                  e.stopPropagation();
                  void copyHex(i, c.hex);
                }}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
              </button>
            </div>
            {strips ? (
              // strips variant: keep the original grouped order (name over values);
              // its compact-row layout stays exactly as before.
              <div>
                {cname}
                {vals}
              </div>
            ) : (
              // tall variant: name directly under the meta row, values pinned to
              // the bottom (CSS margin-top:auto on .vals).
              <>
                {cname}
                {vals}
              </>
            )}
          </div>
        );
      })}
      <div className={`palette-toast${toast ? " is-visible" : ""}`} role="status" aria-live="polite">
        {toast ? (
          <>
            <CheckIcon />
            <span>{toast}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
