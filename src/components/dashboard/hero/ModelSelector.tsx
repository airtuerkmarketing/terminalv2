"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Check, ChevronDown } from "lucide-react";
import { AI_MODELS } from "@/components/dashboard/hero-data";

/* Model selector pill — visible only in KI-Modus (BAU-Auftrag §5.5).
 * Controlled: parent owns the value + localStorage persistence. Today the
 * selection is pure UI; it doesn't route to a real model yet. */

export function ModelSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = AI_MODELS.find((m) => m.id === value) ?? AI_MODELS[0];

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="dh-model" ref={ref}>
      <button
        type="button"
        className="dh-pill dh-model-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Bot className="dh-pill-icon" aria-hidden="true" />
        <span>{current.label}</span>
        <ChevronDown className="dh-pill-caret" aria-hidden="true" />
      </button>

      {open && (
        <ul className="dh-model-menu" role="listbox">
          {AI_MODELS.map((m) => (
            <li key={m.id} role="option" aria-selected={m.id === value}>
              <button
                type="button"
                className="dh-model-option"
                onClick={() => {
                  onChange(m.id);
                  setOpen(false);
                }}
              >
                <Bot className="dh-pill-icon" aria-hidden="true" />
                <span className="dh-model-option-label">{m.label}</span>
                <span className="dh-model-option-provider">{m.provider}</span>
                {m.id === value && (
                  <Check className="dh-model-check" aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
