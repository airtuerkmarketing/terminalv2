# Signed-URL Serving — Optimization Analysis — 2026-06-28 (D-093)

**Route:** `src/app/api/library/file/[id]/route.ts` (gated signed-URL serving for the private
`library` bucket, D-052). **D-088 baseline:** p50 0.48s / p95 0.87s (anon public-file path,
EU workstation → eu-central-1). **Target:** 200ms p95.

## What the route actually does (recon)

Two **sequential, dependent** Supabase operations:

1. **RLS-gated row read** — `createClient()` (request-scoped, the viewer's session) →
   `from("document_files").select("id,title,extension,storage_path").eq("id",id).is("deleted_at",null).maybeSingle()`.
   This is the **access gate** (RLS returns the row only if the viewer may see the folder).
2. **Signed-URL mint** — `createAdminClient()` (service role) →
   `storage.from("library").createSignedUrl(storage_path, 120s)`.

Call 2 needs `storage_path` **from** call 1, so they run in series.

## Why the prompt's optimization options don't apply

- **Option 1 — parallelize the 2 calls:** ❌ impossible. They're dependent (sign needs the path
  from the gated read). `Promise.all` can't be used.
- **Option 2 — single combined SQL function:** ❌ not viable. Minting a signed URL is a
  **Storage-service** operation (`createSignedUrl` POSTs to `/storage/v1/object/sign/…`), not a
  SQL operation. A Postgres function can return the path but cannot mint the URL.
- **Option 3 — edge runtime:** ⚠️ technically possible (`createClient` via `@supabase/ssr` and
  `createAdminClient` via `@supabase/supabase-js` are both fetch-based, no Node-only APIs), but it
  **does not reduce the two round-trips** — those dominate the *warm* latency. Edge only trims
  serverless cold-start (~250ms → ~50ms), i.e. it would help the p95 *outliers*, not the p50.

## Why the measured number overstates the real cost

The 0.48s p50 was measured **from a workstation over the public internet** and therefore includes
the client→Vercel RTT. The server-side work is two eu-central-1↔eu-central-1 round-trips (DB +
Storage) + invocation overhead ≈ **~200–300ms**, and real users near the edge see less than the
0.48s figure. A document opens in well under a second.

## Decision — no code change

The route is **near-optimal for its security model**: a per-request RLS gate (call 1) followed by
a short-TTL, no-cache service-role sign (call 2). The two round-trips are inherent to *gated*
signing of a *private* bucket. Changing the demo-critical file-serving route for a latency that is
(a) inherent, (b) partly a measurement artifact, and (c) already sub-second is **not justified
before the demo** — the risk (breaking all Document-Library file serving) outweighs a marginal,
warm-path-neutral gain.

**Verdict:** 🟡 acceptable for demo; no change shipped.

## Post-demo lever (if sub-200ms is ever truly required)

The only way past the two-round-trip floor is an architectural change, e.g. an **edge-cached
signing layer** (cache `(file_id, viewer-scope) → signed_url` for the TTL at the edge) or moving
to a CDN that signs at the edge. That's a deliberate project, not a pre-demo tweak. Edge-runtime
migration (Option 3) could be trialled then too, behind the mandatory Vercel preview gate, for the
cold-start p95 win.

*Generated 2026-06-28. Read-only analysis; no change to the route.*
