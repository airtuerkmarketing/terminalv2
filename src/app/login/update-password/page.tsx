import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthParticles } from "@/components/effects/auth-particles";
import UpdatePasswordForm from "./update-password-form";

type SearchParams = Promise<{
  type?: "force" | "recovery" | "welcome";
  error?: string;
}>;

export const metadata = {
  title: "Change password — terminal",
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
    type === "welcome" ? "Welcome to terminal" :
    type === "force" ? "Please change your password" :
    type === "recovery" ? "Set a new password" :
    "Change password";

  const subtitle =
    type === "welcome"
      ? "Set your personal password now to activate your account."
      : type === "force"
      ? "For security reasons, you must change your password on first login."
      : type === "recovery"
      ? "Set a new password for your account."
      : "Choose a new password.";

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
