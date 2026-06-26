import Link from "next/link";
import { AuthParticles } from "@/components/effects/auth-particles";
import ForgotPasswordForm from "./forgot-password-form";

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
          Gib deine E-Mail-Adresse ein — wir schicken dir einen Link zum
          Zurücksetzen deines Passworts.
        </p>

        <ForgotPasswordForm />

        <Link href="/login" className="login-link">
          ← Zurück zur Anmeldung
        </Link>
      </div>
    </main>
  );
}
