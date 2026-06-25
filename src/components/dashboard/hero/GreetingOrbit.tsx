import "@/styles/dashboard-greeting.css";
import { NavIcon } from "@/components/shell/icons";

/* Dashboard greeting visual: a compact (~120px) floating brand-favicon seal next
 * to a greeting line. Replaces the old CloudOrbitHero LLM-provider orbit. The
 * brand marks are reused inline from the sidebar NavIcon set (no asset files):
 * core = airtuerk "at" glyph; satellites = Holidays, atBeds, Service, Center
 * (Service + Center share the "at" glyph — that's the real brand mark). */

// Static fallback greeting for now. TODO: later swap for the logged-in user's
// name (profile lookup — an auth/DB step, not part of this stage). Kept as a
// single const so that future change is a one-liner.
const GREETING_NAME = "Kollege";

export function GreetingOrbit() {
  return (
    <div className="dh-greeting">
      <div className="orbit-seal" aria-hidden="true">
        <div className="orbit-field">
          <div className="orbit-coin s1">
            <span className="badge"><NavIcon name="airtuerk-holidays" /></span>
          </div>
          <div className="orbit-coin s2">
            <span className="badge"><NavIcon name="atbeds" /></span>
          </div>
          <div className="orbit-coin s3">
            <span className="badge"><NavIcon name="airtuerk-service" /></span>
          </div>
          <div className="orbit-coin s4">
            <span className="badge"><NavIcon name="service-center-antalya" /></span>
          </div>
        </div>
        <div className="core">
          <NavIcon name="airtuerk-service" />
        </div>
      </div>
      <h1 className="dh-greeting-title">Was steht an, {GREETING_NAME}?</h1>
    </div>
  );
}
