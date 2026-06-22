import Link from "next/link";
import { Particles } from "@/components/effects/particles";
import { TerminalMark } from "@/components/brand/terminal-mark";

export const metadata = {
  title: "Passwort vergessen — terminal",
};

export default function ForgotPasswordPage() {
  return (
    <main style={{
      position: "relative",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem 1rem",
      background: "#fafafa",
      overflow: "hidden",
    }}>
      <Particles
        className="absolute inset-0 z-0"
        quantity={350}
        ease={50}
        color="#000000"
        size={0.8}
        refresh={false}
      />

      <div style={{
        position: "relative",
        zIndex: 1,
        background: "#ffffff",
        borderRadius: "16px",
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)",
        padding: "2.5rem",
        width: "100%",
        maxWidth: "420px",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        textAlign: "center",
      }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <TerminalMark size={40} />
        </div>

        <div>
          <h1 style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            margin: "0 0 0.75rem",
          }}>
            Passwort vergessen
          </h1>
          <p style={{
            color: "#666",
            lineHeight: 1.5,
            fontSize: "0.9rem",
            margin: 0,
          }}>
            Diese Funktion wird gerade eingerichtet.
            Bitte kontaktiere kurz <strong>bdemir@airtuerk.de</strong> —
            du bekommst dein Passwort innerhalb weniger Minuten zurückgesetzt.
          </p>
        </div>

        <Link
          href="/login"
          style={{
            color: "#666",
            textDecoration: "none",
            fontSize: "0.875rem",
            padding: "0.5rem",
          }}
        >
          ← Zurück zur Anmeldung
        </Link>
      </div>
    </main>
  );
}
