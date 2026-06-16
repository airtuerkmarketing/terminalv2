/**
 * Fallback for an unknown block type or content that fails schema validation.
 * Renders a small note in development; nothing in production (never crashes).
 */
export function UnsupportedBlock({ type, reason }: { type: string; reason?: string }) {
  if (process.env.NODE_ENV === "production") return null;
  return (
    <div className="block-unsupported">
      Unsupported block: {type}
      {reason ? ` — ${reason}` : ""}
    </div>
  );
}
