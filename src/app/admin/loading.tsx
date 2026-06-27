import "@/styles/error-states.css";

/**
 * Suspense fallback for /admin/* routes (D-098). Mirrors the (public) skeleton
 * so navigating into User-Management / Knowledge / Admin shows a neutral pulse
 * instead of a blank white frame while the server component fetches. Server
 * component, no state/hooks.
 */
export default function AdminLoading() {
  return (
    <div className="skel-root" aria-busy="true" aria-live="polite">
      <div className="skel-block skel-headline" />
      <div className="skel-block skel-line" />
      <div className="skel-block skel-line skel-line--short" />
    </div>
  );
}
