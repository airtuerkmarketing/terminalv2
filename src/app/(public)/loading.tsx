import "@/styles/error-states.css";

/**
 * Suspense fallback for (public) routes — shown while server components fetch.
 * A neutral 3-block skeleton with a subtle pulse (no spinner, no "Loading…"
 * text). Server component, no state/hooks.
 */
export default function PublicLoading() {
  return (
    <div className="skel-root" aria-busy="true" aria-live="polite">
      <div className="skel-block skel-headline" />
      <div className="skel-block skel-line" />
      <div className="skel-block skel-line skel-line--short" />
    </div>
  );
}
