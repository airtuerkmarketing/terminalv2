import "./flag-icon.css";

/**
 * Real SVG country flags for the supported document/presentation languages.
 *
 * Unicode flag emoji (🇩🇪 etc.) render as bare letter pairs ("DE", "GB") on
 * Windows — it ships no flag glyphs — so we draw the flags as inline SVG, which
 * is consistent on every platform. en → GB. Unknown/empty code → nothing.
 */
const FLAGS: Record<string, React.ReactNode> = {
  de: (
    <svg viewBox="0 0 20 14" aria-hidden="true">
      <rect width="20" height="14" fill="#000000" />
      <rect y="4.667" width="20" height="4.666" fill="#DD0000" />
      <rect y="9.333" width="20" height="4.667" fill="#FFCE00" />
    </svg>
  ),
  en: (
    <svg viewBox="0 0 20 14" aria-hidden="true">
      <rect width="20" height="14" fill="#012169" />
      <path d="M0 0 20 14 M20 0 0 14" stroke="#FFFFFF" strokeWidth="2.8" />
      <path d="M0 0 20 14 M20 0 0 14" stroke="#C8102E" strokeWidth="1.4" />
      <path d="M10 0 V14 M0 7 H20" stroke="#FFFFFF" strokeWidth="4.5" />
      <path d="M10 0 V14 M0 7 H20" stroke="#C8102E" strokeWidth="2.6" />
    </svg>
  ),
  tr: (
    <svg viewBox="0 0 20 14" aria-hidden="true">
      <rect width="20" height="14" fill="#E30A17" />
      <circle cx="8" cy="7" r="3.4" fill="#FFFFFF" />
      <circle cx="9.2" cy="7" r="2.7" fill="#E30A17" />
      <polygon
        fill="#FFFFFF"
        points="12.7,4.8 13.22,6.29 14.79,6.32 13.54,7.27 13.99,8.78 12.7,7.88 11.41,8.78 11.86,7.27 10.61,6.32 12.18,6.29"
      />
    </svg>
  ),
};

export function FlagIcon({
  code,
  className,
}: {
  code?: string | null;
  className?: string;
}) {
  if (!code) return null;
  const key = code.trim().toLowerCase().slice(0, 2);
  const flag = FLAGS[key];
  if (!flag) return null;
  return (
    <span
      className={`flag-icon${className ? ` ${className}` : ""}`}
      role="img"
      aria-label={key.toUpperCase()}
      title={key.toUpperCase()}
    >
      {flag}
    </span>
  );
}
