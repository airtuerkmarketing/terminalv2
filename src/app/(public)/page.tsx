/**
 * Placeholder home so the public shell has a route to render on. The real,
 * block-driven dashboard is built in Task 3 — this is intentionally minimal.
 */
export default function DashboardHome() {
  return (
    <section className="max-w-[760px]">
      <h1 className="mb-4 text-[38px] font-semibold leading-[1.1] tracking-[-0.022em] text-text-1">
        terminal<span className="text-text-3">v2</span>
      </h1>
      <p className="text-[17px] leading-[1.55] text-text-2">
        The public app shell is live — collapsible sidebar, glass topbar, ambient
        orbs and the light/dark theme toggle. Dashboard content and brand pages
        arrive in Task 3.
      </p>
    </section>
  );
}
