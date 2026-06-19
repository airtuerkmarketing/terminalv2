import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "../login/actions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  // Fetch the user's profile (incl. role)
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, role, full_name")
    .eq("id", user.id)
    .single();

  // admin OR super_admin may reach the admin shell (mirrors public.is_admin()).
  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    redirect("/login?error=Not%20authorized");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">terminalv2 admin</h2>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600">{profile.email}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              {profile.role}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-sm text-gray-600 underline-offset-4 hover:underline"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}