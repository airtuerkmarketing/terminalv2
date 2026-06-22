interface TerminalMarkProps {
  size?: number;
  color?: string;
  className?: string;
  showWordmark?: boolean;
  wordmarkSize?: number;
}

export function TerminalMark({
  size = 40,
  color = "currentColor",
  className = "",
  showWordmark = false,
  wordmarkSize = 28,
}: TerminalMarkProps) {
  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: showWordmark ? 12 : 0,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="terminal"
      >
        {/* 4 outer nodes */}
        <circle cx="10" cy="10" r="3" fill={color} />
        <circle cx="30" cy="10" r="3" fill={color} />
        <circle cx="10" cy="30" r="3" fill={color} />
        <circle cx="30" cy="30" r="3" fill={color} />
        {/* Center node */}
        <circle cx="20" cy="20" r="3" fill={color} />
        {/* Connecting lines */}
        <line x1="20" y1="20" x2="10" y2="10"
              stroke={color} strokeWidth="1" opacity="0.4" />
        <line x1="20" y1="20" x2="30" y2="10"
              stroke={color} strokeWidth="1" opacity="0.4" />
        <line x1="20" y1="20" x2="10" y2="30"
              stroke={color} strokeWidth="1" opacity="0.4" />
        <line x1="20" y1="20" x2="30" y2="30"
              stroke={color} strokeWidth="1" opacity="0.4" />
      </svg>
      {showWordmark && (
        <span
          style={{
            fontSize: wordmarkSize,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          terminal
        </span>
      )}
    </div>
  );
}
