"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import "@/styles/error-states.css";

/**
 * (public)-scope error boundary. Catches errors from pages rendered inside the
 * app shell (sidebar/topbar stay; only the page area is replaced). Offers reset
 * plus a router.back() fallback. 'use client' is required for error.tsx.
 */
export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Public error boundary:", error);
  }, [error]);

  return (
    <div className="err-root">
      <div className="err-card">
        <h1 className="err-title">Something went wrong</h1>
        <p className="err-subhead">This page could not be loaded.</p>
        {error.digest && <p className="err-digest">Error ID: {error.digest}</p>}
        <div className="err-actions">
          <button type="button" onClick={reset} className="err-btn err-btn--primary">
            Try again
          </button>
          <button type="button" onClick={() => router.back()} className="err-btn err-btn--secondary">
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
