import { LoginForm } from "./login-form";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  // If already logged in, send to /admin (or "next" if provided)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    redirect(next || "/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">terminalv2</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to manage brand portal content
          </p>
        </div>

        <LoginForm nextPath={next} initialError={error} />

        <p className="text-center text-xs text-gray-500">
          airtuerk Service GmbH — internal use only
        </p>
      </div>
    </main>
  );
}