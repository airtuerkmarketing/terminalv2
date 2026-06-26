import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthParticles } from "@/components/effects/auth-particles";
import UpdatePasswordForm from "./update-password-form";

type SearchParams = Promise<{
  type?: "force" | "recovery" | "welcome";
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
    type === "welcome" ? "Willkommen bei terminal" :
    type === "force" ? "Bitte ändere dein Passwort" :
    type === "recovery" ? "Neues Passwort setzen" :
    "Passwort ändern";

  const subtitle =
    type === "welcome"
      ? "Lege jetzt dein persönliches Passwort fest, um dein Konto zu aktivieren."
      : type === "force"
      ? "Aus Sicherheitsgründen musst du beim ersten Login dein Passwort ändern."
      : type === "recovery"
      ? "Setze ein neues Passwort für deinen Account."
      : "Wähle ein neues Passwort.";

  return (
    <main className="login-page">
      <AuthParticles />

      <div className="login-card">
        <div className="login-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/terminal/wordmark.svg" alt="terminal" className="login-wordmark" />
        </div>

        <h1 className="login-title">{heading}</h1>
        <p className="login-subtitle">{subtitle}</p>

        <UpdatePasswordForm type={type} error={error} />
      </div>
    </main>
  );
}
