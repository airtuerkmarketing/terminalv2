"use client";

import { useState, useTransition } from "react";
import { requestPasswordResetAction } from "../actions";

export default function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await requestPasswordResetAction(formData);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="login-success" role="status">
        ✓ Falls ein Konto mit dieser Adresse existiert, haben wir dir einen Link zum
        Zurücksetzen geschickt. Bitte prüfe dein Postfach.
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="login-form">
      <div className="login-field">
        <label htmlFor="email" className="login-label">E-Mail</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={isPending}
          className="login-input"
          placeholder="name@airtuerk.de"
        />
      </div>

      {error && (
        <div className="login-error" role="alert">
          {error}
        </div>
      )}

      <button type="submit" disabled={isPending} className="login-submit">
        {isPending ? "Wird gesendet…" : "Link zum Zurücksetzen senden"}
      </button>
    </form>
  );
}
