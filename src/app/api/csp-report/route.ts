import { NextRequest, NextResponse } from "next/server";

/**
 * CSP violation sink (SEC-03). The Content-Security-Policy-Report-Only header
 * (next.config.ts) points its report-uri here; browsers POST a JSON report for
 * each would-be violation. We log to Vercel function logs for the observation
 * window — cheap + best-effort (no DB), to learn what an enforcing CSP would
 * break (notably Next's framework inline scripts → a nonce strategy) before
 * flipping report-only → enforce. Public (browsers post un-authenticated); body
 * is truncated to bound log spend.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    console.warn("[csp-report]", body.slice(0, 2000));
  } catch {
    // ignore malformed reports
  }
  return new NextResponse(null, { status: 204 });
}
