/**
 * Placeholder home so the public shell has a route to render on. The real,
 * block-driven dashboard is built in Task 3. The grid below is a placeholder
 * that exercises the reusable `.brands-grid` responsive columns (1 / 2 / 3) so
 * the breakpoint system is verifiable now; Task 3 replaces it with real cards.
 */
export default function DashboardHome() {
  return (
    <section>
      <div className="max-w-[760px]">
        <h1 className="mb-4 text-[38px] font-semibold leading-[1.1] tracking-[-0.022em] text-text-1">
          terminal<span className="text-text-3">v2</span>
        </h1>
        <p className="text-[17px] leading-[1.55] text-text-2">
          The public app shell is live — responsive sidebar (drawer on mobile and
          tablet, fixed and collapsible on desktop), glass topbar, ambient orbs and
          the light/dark theme toggle. Dashboard content and brand pages arrive in
          Task 3.
        </p>
      </div>

      <div className="brands-grid mt-12">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="min-h-[150px] rounded-[20px] border border-hairline bg-surface p-6"
          >
            <div className="font-semibold text-text-1">Placeholder card {i + 1}</div>
            <div className="mt-1 text-[13px] text-text-2">
              Real brand cards arrive in Task 3. This grid demonstrates the
              responsive columns: 1 (mobile) · 2 (tablet) · 3 (desktop+).
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
