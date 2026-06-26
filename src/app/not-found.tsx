import Link from "next/link";
import { getIdentity } from "@/lib/auth";
import "@/styles/error-states.css";

/**
 * Global 404 (Next.js renders this for unmatched routes and notFound()).
 * Server component: identity-aware recovery target — a signed-in user goes back
 * to the dashboard, an anonymous visitor to the login. getIdentity lives in
 * @/lib/auth (re-exported via @/lib/documents); it reads cookies, so this route
 * renders dynamically.
 */
export default async function NotFound() {
  const identity = await getIdentity();
  const isAuthed = !!identity;

  return (
    <div className="nf-root">
      <div className="nf-card">
        <div className="nf-code">404</div>
        <h1 className="nf-title">Seite nicht gefunden</h1>
        <p className="nf-subhead">Diese Seite existiert nicht (mehr).</p>
        <Link href={isAuthed ? "/" : "/login"} className="err-btn err-btn--primary">
          {isAuthed ? "Zurück zum Dashboard" : "Zur Anmeldung"}
        </Link>
      </div>
    </div>
  );
}
