import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sanitizeNext } from "@/lib/auth";
import LoginForm from "./login-form";
import AuthBrand from "./auth-brand";
import SsoButton from "./sso-button";
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
    redirect(sanitizeNext(next) ?? "/");
  }

  return (
    <main className="login-page">
      <AuthParticles />

      <div className="auth-split">
        {/* Brand panel — State A logo lockup + Compare-style hover tagline reveal */}
        <AuthBrand />

        {/* Form panel */}
        <section className="auth-form-panel">
          <h1 className="auth-heading">Welcome Back!</h1>

          <LoginForm next={next} initialError={error} />

          <div className="auth-divider">
            <span>Or sign in with</span>
          </div>

          <SsoButton />

          <p className="auth-footer">Powered by airtuerk Service GmbH</p>
        </section>
      </div>
    </main>
  );
}
