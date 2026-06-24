"use client";

import { useEffect, useRef, type ChangeEvent } from "react";
import "./checkbox.css";

/**
 * Liquid-glass styled checkbox. Controlled — the parent owns `checked`.
 *
 * `indeterminate` is a DOM-only property (there is no HTML attribute for it), so
 * it is applied imperatively via a ref; it only shows while the box is not fully
 * checked (the partial-selection state of a select-all). Pass `label` for an
 * inline visible label, or `aria-label` when the control stands alone (e.g. the
 * select-all in a table header).
 */
export function Checkbox({
  checked,
  onChange,
  indeterminate = false,
  label,
  disabled = false,
  "aria-label": ariaLabel,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  indeterminate?: boolean;
  label?: string;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);

  const input = (
    <input
      ref={ref}
      type="checkbox"
      className="ui-checkbox-input"
      checked={checked}
      disabled={disabled}
      aria-label={label ? undefined : ariaLabel}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.checked)}
    />
  );

  const cls = `ui-checkbox${label ? " ui-checkbox--labeled" : ""}${
    disabled ? " is-disabled" : ""
  }${className ? ` ${className}` : ""}`;

  // Labeled → a <label> so a click anywhere on the text toggles natively.
  // Unlabeled → a <span> wrapper; the visually-hidden input overlays the box.
  if (label) {
    return (
      <label className={cls}>
        {input}
        <span className="ui-checkbox-box" aria-hidden="true" />
        <span className="ui-checkbox-label">{label}</span>
      </label>
    );
  }
  return (
    <span className={cls}>
      {input}
      <span className="ui-checkbox-box" aria-hidden="true" />
    </span>
  );
}
