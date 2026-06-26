import Link from "next/link";
import { AuthParticles } from "@/components/effects/auth-particles";
import ForgotPasswordForm from "./forgot-password-form";

export const metadata = {
  title: "Forgot password — terminal",
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

        <h1 className="login-title">Forgot password</h1>
        <p className="login-subtitle">
          Enter your email address — we&apos;ll send you a link to reset
          your password.
        </p>

        <ForgotPasswordForm />

        <Link href="/login" className="login-link">
          ← Back to sign in
        </Link>
      </div>
    </main>
  );
}
