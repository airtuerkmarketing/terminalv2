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
    <form
      action={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <div>
        <label
          htmlFor="password"
          style={{
            display: "block",
            marginBottom: "0.375rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#333",
          }}
        >
          Neues Passwort
        </label>
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
          style={{
            width: "100%",
            padding: "0.625rem 0.875rem",
            border: "1px solid #d1d5db",
            borderRadius: "0.5rem",
            fontSize: "0.95rem",
            transition: "border-color 0.15s",
            outline: "none",
          }}
        />
        <p style={{
          fontSize: "0.75rem",
          color: "#888",
          marginTop: "0.375rem",
        }}>
          Mindestens 12 Zeichen
        </p>
      </div>

      <div>
        <label
          htmlFor="confirm"
          style={{
            display: "block",
            marginBottom: "0.375rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#333",
          }}
        >
          Passwort wiederholen
        </label>
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
          style={{
            width: "100%",
            padding: "0.625rem 0.875rem",
            border: "1px solid #d1d5db",
            borderRadius: "0.5rem",
            fontSize: "0.95rem",
            transition: "border-color 0.15s",
            outline: "none",
          }}
        />
      </div>

      {error && (
        <div style={{
          padding: "0.75rem 0.875rem",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "0.5rem",
          color: "#991b1b",
          fontSize: "0.875rem",
          lineHeight: 1.4,
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: "0.75rem 0.875rem",
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "0.5rem",
          color: "#166534",
          fontSize: "0.875rem",
          fontWeight: 500,
          textAlign: "center",
        }}>
          ✓ Passwort gespeichert! Du wirst weitergeleitet…
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || success}
        style={{
          padding: "0.75rem 1rem",
          background: success ? "#10b981" : isPending ? "#666" : "#000",
          color: "white",
          border: "none",
          borderRadius: "0.5rem",
          fontSize: "0.95rem",
          fontWeight: 500,
          cursor: (isPending || success) ? "not-allowed" : "pointer",
          transition: "background 0.15s",
          marginTop: "0.5rem",
        }}
      >
        {success ? "Erfolgreich" : isPending ? "Wird gespeichert..." : "Passwort speichern"}
      </button>
    </form>
  );
}
