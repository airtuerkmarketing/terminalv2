"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePasswordAction } from "./actions";
import PasswordInput from "@/components/ui/password-input";

export default function UpdatePasswordForm({
  type,
  error: initialError,
}: {
  type?: "force" | "recovery" | "welcome";
  error?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [success, setSuccess] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);

    const pw = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    if (pw.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (pw !== confirm) {
      setError("The passwords do not match.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await updatePasswordAction(formData);

        if (!result) {
          setError("No response from the server. Please try again.");
          return;
        }

        if (result.error) {
          setError(result.error);
          return;
        }

        if (result.success) {
          setSuccess(true);
          router.refresh();
          // Kurze Pause damit User die Bestätigung sieht +
          // refresh durchläuft bevor Layout-Gate neu evaluiert
          await new Promise(resolve => setTimeout(resolve, 800));
          router.push("/");
          return;
        }

        setError("Unexpected response. Please sign out and sign in again.");
      } catch (e) {
        console.error("Submit error:", e);
        setError(
          e instanceof Error
            ? `Error: ${e.message}`
            : "Unknown error while saving."
        );
      }
    });
  }

  return (
    <form action={handleSubmit} className="login-form">
      <div className="login-field">
        <label htmlFor="password" className="login-label">New password</label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isPending || success}
          className="login-input"
        />
        <p className="login-hint">At least 8 characters</p>
      </div>

      <div className="login-field">
        <label htmlFor="confirm" className="login-label">Repeat password</label>
        <PasswordInput
          id="confirm"
          name="confirm"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isPending || success}
          className="login-input"
        />
      </div>

      {error && (
        <div className="login-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="login-success">
          ✓ Password saved! You are being redirected…
        </div>
      )}

      <button type="submit" disabled={isPending || success} className="login-submit">
        {success ? "Success" : isPending ? "Saving..." : "Save password"}
      </button>
    </form>
  );
}
