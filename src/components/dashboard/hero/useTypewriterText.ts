"use client";

import { useEffect, useState } from "react";

/* Progressive per-character reveal of `text` (the AI answer "typing" effect).
 * Public shape { shown, done } stays stable so the stage-2 streaming-RAG
 * response can drop in unchanged. Resets when `text` changes, cleans up its
 * timer, and returns the full string instantly under prefers-reduced-motion. */

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useTypewriterText(
  text: string,
  { charMs = 14 }: { charMs?: number } = {}
): { shown: string; done: boolean } {
  const [count, setCount] = useState(0);
  const reduced = reducedMotion();

  useEffect(() => {
    if (reduced || !text) {
      setCount(text.length);
      return;
    }
    setCount(0);
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      i += 1;
      setCount(i);
      if (i < text.length) timer = setTimeout(tick, charMs);
    };
    timer = setTimeout(tick, charMs);
    return () => clearTimeout(timer);
  }, [text, charMs, reduced]);

  const shown = reduced ? text : text.slice(0, count);
  return { shown, done: shown.length >= text.length };
}
