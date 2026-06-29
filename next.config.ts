import type { NextConfig } from "next";
import { createHash } from "node:crypto";
import { PREFS_SCRIPT } from "./src/lib/prefs-script";

// Build-derived SHA-256 of the inline pre-paint script so the CSP allowlists THIS
// exact script (never hand-coded — SEC-03). One source of truth: src/lib/prefs-script.ts.
const PREFS_SCRIPT_HASH = createHash("sha256").update(PREFS_SCRIPT).digest("base64");

// Report-ONLY CSP (SEC-03): observe, don't block. Violations POST to
// /api/csp-report (logged to Vercel function logs) for ~48h so we can see what an
// enforcing policy would break (notably Next's framework inline scripts → a nonce
// strategy) BEFORE flipping to Content-Security-Policy. External hosts allowed:
// Supabase (storage/functions/auth), CARTO basemap tiles, SharePoint deck iframe.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  `script-src 'self' 'sha256-${PREFS_SCRIPT_HASH}'`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://*.basemaps.cartocdn.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co",
  "frame-src 'self' https://*.sharepoint.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "report-uri /api/csp-report",
].join("; ");

const nextConfig: NextConfig = {
  // sharp ships prebuilt native binaries; keep it external so Next doesn't try to
  // bundle them into the server build (required for image thumbnails on Vercel).
  serverExternalPackages: ["sharp"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY }],
      },
    ];
  },
};

export default nextConfig;
