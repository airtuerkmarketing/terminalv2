import Link from "next/link";

export const metadata = {
  title: "Passwort vergessen — terminalv2",
};

export default function ForgotPasswordPage() {
  return (
    <main style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      padding: "2rem",
      gap: "1.5rem",
      maxWidth: "32rem",
      margin: "0 auto",
      textAlign: "center"
    }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
        Passwort vergessen
      </h1>
      <p style={{ color: "#666", lineHeight: 1.6 }}>
        Diese Funktion wird gerade eingerichtet.
        Bitte kontaktiere kurz <strong>bdemir@airtuerk.de</strong> —
        du bekommst dein Passwort innerhalb weniger Minuten zurückgesetzt.
      </p>
      <Link
        href="/login"
        style={{
          color: "#0066cc",
          textDecoration: "underline"
        }}
      >
        Zurück zur Anmeldung
      </Link>
    </main>
  );
}
