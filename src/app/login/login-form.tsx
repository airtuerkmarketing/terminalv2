"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { loginAction } from "./actions";

export default function LoginForm({
  next,
  initialError,
}: {
  next?: string;
  initialError?: string;
}) {
  const [error, setError] = useState<string | undefined>(initialError);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = await loginAction(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form action={onSubmit} className="login-form">
      <input type="hidden" name="next" value={next || "/"} />

      <div className="login-field">
        <label htmlFor="email" className="login-label">Email</label>
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

      <div className="login-field">
        <label htmlFor="password" className="login-label">Passwort</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={isPending}
          className="login-input"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <div className="login-error" role="alert">
          {error}
        </div>
      )}

      <button type="submit" disabled={isPending} className="login-submit">
        {isPending ? "Wird angemeldet..." : "Anmelden"}
      </button>

      <Link href="/login/forgot-password" className="login-link">
        Passwort vergessen?
      </Link>
    </form>
  );
}
