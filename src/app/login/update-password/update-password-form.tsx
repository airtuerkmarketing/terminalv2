"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePasswordAction } from "./actions";

export default function UpdatePasswordForm({
  type,
  error: initialError,
}: {
  type?: "force" | "recovery";
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

    if (pw.length < 12) {
      setError("Passwort muss mindestens 12 Zeichen lang sein.");
      return;
    }

    if (pw !== confirm) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await updatePasswordAction(formData);

        if (!result) {
          setError("Keine Antwort vom Server. Bitte erneut versuchen.");
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

        setError("Unerwartete Antwort. Bitte logge dich aus und wieder ein.");
      } catch (e) {
        console.error("Submit error:", e);
        setError(
          e instanceof Error
            ? `Fehler: ${e.message}`
            : "Unbekannter Fehler beim Speichern."
        );
      }
    });
  }

  return (
    <form action={handleSubmit} className="login-form">
      <div className="login-field">
        <label htmlFor="password" className="login-label">Neues Passwort</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isPending || success}
          className="login-input"
        />
        <p className="login-hint">Mindestens 12 Zeichen</p>
      </div>

      <div className="login-field">
        <label htmlFor="confirm" className="login-label">Passwort wiederholen</label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
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
          ✓ Passwort gespeichert! Du wirst weitergeleitet…
        </div>
      )}

      <button type="submit" disabled={isPending || success} className="login-submit">
        {success ? "Erfolgreich" : isPending ? "Wird gespeichert..." : "Passwort speichern"}
      </button>
    </form>
  );
}
