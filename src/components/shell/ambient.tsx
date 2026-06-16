/**
 * Ambient orb background. Visibility is controlled by the data-orbs attribute
 * on <html> (see shell.css: `:root[data-orbs="off"] .ambient`), toggled from
 * the topbar. Animations are frozen under prefers-reduced-motion (shell.css).
 * Purely decorative, so hidden from assistive tech.
 */
export function Ambient() {
  return (
    <div className="ambient" aria-hidden="true">
      <div className="orb orb--a" />
      <div className="orb orb--b" />
      <div className="orb orb--c" />
    </div>
  );
}
