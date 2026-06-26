"use client";

import { useEffect } from "react";
import Link from "next/link";
import "@/styles/error-states.css";

/**
 * Root error boundary (Next.js requires 'use client'). Catches uncaught render
 * errors from any route not handled by a closer error.tsx. Rendered inside the
 * root layout's themed <body> (no app shell) — error-states.css is token-only so
 * it styles correctly without shell.css.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root error boundary:", error);
  }, [error]);

  return (
    <div className="err-root">
      <div className="err-card">
        <h1 className="err-title">Etwas ist schiefgelaufen</h1>
        <p className="err-subhead">Wir konnten diese Seite nicht laden.</p>
        {error.digest && <p className="err-digest">Fehler-ID: {error.digest}</p>}
        <div className="err-actions">
          <button type="button" onClick={reset} className="err-btn err-btn--primary">
            Erneut versuchen
          </button>
          <Link href="/" className="err-btn err-btn--secondary">
            Zurück zum Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
