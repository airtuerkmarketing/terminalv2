import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Particles } from "@/components/effects/particles";
import { TerminalMark } from "@/components/brand/terminal-mark";
import UpdatePasswordForm from "./update-password-form";

type SearchParams = Promise<{
  type?: "force" | "recovery";
  error?: string;
}>;

export const metadata = {
  title: "Passwort ändern — terminal",
};

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { type, error } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const heading =
    type === "force" ? "Bitte ändere dein Passwort" :
    type === "recovery" ? "Neues Passwort setzen" :
    "Passwort ändern";

  const subtitle =
    type === "force"
      ? "Aus Sicherheitsgründen musst du beim ersten Login dein Passwort ändern."
      : type === "recovery"
      ? "Setze ein neues Passwort für deinen Account."
      : "Wähle ein neues Passwort.";

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
      }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
          textAlign: "center",
        }}>
          <TerminalMark size={40} />
          <div>
            <h1 style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              margin: "0 0 0.5rem",
            }}>
              {heading}
            </h1>
            <p style={{
              color: "#666",
              fontSize: "0.875rem",
              lineHeight: 1.5,
              margin: 0,
            }}>
              {subtitle}
            </p>
          </div>
        </div>

        <UpdatePasswordForm type={type} error={error} />
      </div>
    </main>
  );
}
