import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "./login-form";
import { Particles } from "@/components/effects/particles";
import { TerminalMark } from "@/components/brand/terminal-mark";

type SearchParams = Promise<{ next?: string; error?: string }>;

export const metadata = {
  title: "Anmelden — terminal",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { next, error } = await searchParams;

  // Eingeloggte User redirecten
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    redirect(next || "/");
  }

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
      {/* Particles Background */}
      <Particles
        className="absolute inset-0 z-0"
        quantity={350}
        ease={50}
        color="#000000"
        size={0.8}
        refresh={false}
      />

      {/* Login-Karte */}
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
      }}>
        {/* Brand-Header */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
          textAlign: "center",
        }}>
          <TerminalMark size={48} showWordmark={true} wordmarkSize={32} />
          <p style={{
            fontSize: "0.875rem",
            color: "#666",
            margin: 0,
          }}>
            Internes Brand- und Knowledge-Hub
          </p>
        </div>

        {/* Form */}
        <LoginForm next={next} initialError={error} />

        {/* Footer */}
        <p style={{
          fontSize: "0.75rem",
          color: "#999",
          textAlign: "center",
          margin: 0,
        }}>
          airtuerk Service GmbH · Frankfurt
        </p>
      </div>
    </main>
  );
}
