// The terminal chevron mark (icon-only). Geometry is the icon group from
// /logos/terminal/wordmark.svg. Two uses on the login brand panel:
//   • animated  → the lockup mark, draw-then-fill motion (see login.css
//                 .auth-logo-icon) paired with the "terminal" CSS-text logo.
//   • static    → the large faint background watermark (.auth-mark-static).
// Always aria-hidden: the accessible brand name comes from the visible
// "terminal" text next to it, not from this SVG.
export default function TerminalMark({
  animated = false,
  className,
}: {
  animated?: boolean;
  className?: string;
}) {
  const classes = [animated ? "auth-logo-icon" : "auth-mark-static", className]
    .filter(Boolean)
    .join(" ");

  return (
    <svg
      viewBox="0 5.94 57.29 52.45"
      className={classes}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon points="0 5.94 19.04 38.93 25.3 28.18 12.53 5.94 0 5.94" />
      <polygon points="18.72 11.65 24.8 22.43 51.09 22.43 57.29 11.65 18.72 11.65" />
      <polygon points="30.38 25.16 42.9 25.16 23.75 58.39 17.48 47.58 30.38 25.16" />
    </svg>
  );
}
