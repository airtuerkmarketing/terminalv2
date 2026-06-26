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
        <h1 className="err-title">Something went wrong</h1>
        <p className="err-subhead">We couldn&apos;t load this page.</p>
        {error.digest && <p className="err-digest">Error ID: {error.digest}</p>}
        <div className="err-actions">
          <button type="button" onClick={reset} className="err-btn err-btn--primary">
            Try again
          </button>
          <Link href="/" className="err-btn err-btn--secondary">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
