import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "./login-form";
import { AuthParticles } from "@/components/effects/auth-particles";

type SearchParams = Promise<{ next?: string; error?: string }>;

export const metadata = {
  title: "Sign in — terminal",
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
    <main className="login-page">
      <AuthParticles />

      <div className="login-card">
        <div className="login-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/terminal/wordmark.svg" alt="terminal" className="login-wordmark" />
        </div>

        <h1 className="login-title">Sign in</h1>
        <p className="login-subtitle">Internal brand and knowledge hub</p>

        <LoginForm next={next} initialError={error} />

        <p className="login-footer">airtuerk Service GmbH · Frankfurt</p>
      </div>
    </main>
  );
}
