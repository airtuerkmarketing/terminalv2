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
    <form action={onSubmit} className="auth-form">
      <input type="hidden" name="next" value={next || "/"} />

      <div className="auth-field">
        <label htmlFor="email" className="auth-label">E-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={isPending}
          className="auth-input"
          placeholder="Enter your e-mail"
        />
      </div>

      <div className="auth-field">
        <label htmlFor="password" className="auth-label">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={isPending}
          className="auth-input"
          placeholder="Enter your password"
        />
      </div>

      <div className="auth-row">
        {/* Cosmetic — Supabase sessions persist regardless; matches the design. */}
        <label className="auth-remember">
          <input type="checkbox" name="remember" className="auth-checkbox" disabled={isPending} />
          <span>Remember me</span>
        </label>
        <Link href="/login/forgot-password" className="auth-forgot">
          Forgot Password
        </Link>
      </div>

      {error && (
        <div className="login-error" role="alert">
          {error}
        </div>
      )}

      <button type="submit" disabled={isPending} className="auth-submit">
        {isPending ? "Signing in…" : "Login"}
      </button>
    </form>
  );
}
