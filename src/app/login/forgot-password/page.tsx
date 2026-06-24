import Link from "next/link";
import { AuthParticles } from "@/components/effects/auth-particles";

export const metadata = {
  title: "Passwort vergessen — terminal",
};

export default function ForgotPasswordPage() {
  return (
    <main className="login-page">
      <AuthParticles />

      <div className="login-card">
        <div className="login-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/terminal/wordmark.svg" alt="terminal" className="login-wordmark" />
        </div>

        <h1 className="login-title">Passwort vergessen</h1>
        <p className="login-subtitle">
          Diese Funktion wird gerade eingerichtet. Bitte kontaktiere kurz{" "}
          <strong>bdemir@airtuerk.de</strong> — du bekommst dein Passwort
          innerhalb weniger Minuten zurückgesetzt.
        </p>

        <Link href="/login" className="login-link">
          ← Zurück zur Anmeldung
        </Link>
      </div>
    </main>
  );
}
