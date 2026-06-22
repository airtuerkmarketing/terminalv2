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
      setError(null);
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
          // Wichtig: refresh ZUERST damit getIdentity() das neue
          // metadata holt, dann push damit Layout-Gate korrekt läuft
          router.refresh();
          setSuccess(true);
          // Kurz warten damit refresh durchlaufen kann
          await new Promise(resolve => setTimeout(resolve, 100));
          router.push("/");
          return;
        }

        // Sollte nie passieren, aber falls doch:
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
        width: "100%",
      }}
    >
      <div>
        <label
          htmlFor="password"
          style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.9rem" }}
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
          style={{
            width: "100%",
            padding: "0.5rem 0.75rem",
            border: "1px solid #ccc",
            borderRadius: "0.375rem",
            fontSize: "1rem",
          }}
        />
        <p style={{ fontSize: "0.75rem", color: "#666", marginTop: "0.25rem" }}>
          Mindestens 12 Zeichen
        </p>
      </div>

      <div>
        <label
          htmlFor="confirm"
          style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.9rem" }}
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
          style={{
            width: "100%",
            padding: "0.5rem 0.75rem",
            border: "1px solid #ccc",
            borderRadius: "0.375rem",
            fontSize: "1rem",
          }}
        />
      </div>

      {success && (
        <div style={{
          padding: "0.75rem",
          background: "#efe",
          border: "1px solid #cfc",
          borderRadius: "0.375rem",
          color: "#060",
          fontSize: "0.875rem",
        }}>
          ✓ Passwort gespeichert! Du wirst weitergeleitet…
        </div>
      )}

      {error && (
        <div style={{
          padding: "0.75rem",
          background: "#fee",
          border: "1px solid #fcc",
          borderRadius: "0.375rem",
          color: "#c00",
          fontSize: "0.875rem",
        }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        style={{
          padding: "0.75rem 1.5rem",
          background: isPending ? "#999" : "#000",
          color: "white",
          border: "none",
          borderRadius: "0.375rem",
          fontSize: "1rem",
          fontWeight: 500,
          cursor: isPending ? "not-allowed" : "pointer",
        }}
      >
        {isPending ? "Passwort wird gesetzt..." : "Passwort speichern"}
      </button>
    </form>
  );
}
