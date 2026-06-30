"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Text input with a show/hide toggle (eye icon) so users can reveal what they
 * typed. Drop-in for a password `<input>`: pass the same className/props you'd
 * give the input (id, name, value, onChange, minLength, disabled, …). The `type`
 * is controlled internally by the toggle, so don't pass it.
 */
export default function PasswordInput({
  className,
  style,
  disabled,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);

  return (
    <div style={{ position: "relative", display: "block", width: "100%" }}>
      <input
        {...props}
        disabled={disabled}
        type={show ? "text" : "password"}
        className={className}
        style={{ ...style, paddingRight: 44 }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        disabled={disabled}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        tabIndex={-1}
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 6,
          background: "none",
          border: "none",
          cursor: disabled ? "default" : "pointer",
          color: "#6b7280",
          lineHeight: 0,
        }}
      >
        {show ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
      </button>
    </div>
  );
}
