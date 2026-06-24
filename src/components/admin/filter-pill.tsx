"use client";

/**
 * A toggle filter pill (on/off). Active state is tinted with the accent. Used for
 * the boolean filters in the User-Management toolbar ("Nur Privat-E-Mail",
 * "Ohne Foto").
 */
export function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`uap-fpill${active ? " is-active" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
