import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UpdatePasswordForm from "./update-password-form";

type SearchParams = Promise<{
  type?: "force" | "recovery";
  error?: string;
}>;

export const metadata = {
  title: "Passwort ändern — terminalv2",
};

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { type, error } = await searchParams;

  // Auth-Check: User muss eingeloggt sein um Passwort zu ändern
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
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      padding: "2rem",
      gap: "1.5rem",
      maxWidth: "32rem",
      margin: "0 auto",
    }}>
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          {heading}
        </h1>
        <p style={{ color: "#666", fontSize: "0.9rem", lineHeight: 1.5 }}>
          {subtitle}
        </p>
      </div>

      <UpdatePasswordForm type={type} error={error} />
    </main>
  );
}
