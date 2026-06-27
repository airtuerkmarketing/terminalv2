import { notFound } from "next/navigation";
import LabClient from "./lab-client";

// Disposable dev-only visual-diff harness for the Duty Free 21st.dev vendor
// pipeline (master-plan V3-2). NODE_ENV-gated so it 404s in production builds.
//
// Named "lab" (NOT "_lab"): an underscore-prefixed App Router folder is a PRIVATE
// folder and never routes — the plan's "/duty-free/_lab" would 404 permanently.
// Lives OUTSIDE the (public) group so it needs no auth and renders components in
// isolation (no shell). Deleted before merge to main (master-plan B12).
export const dynamic = "force-dynamic";

export default function LabPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <LabClient />;
}
