import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getIdentity } from "@/lib/auth";
import { getAllTeamMembers } from "@/lib/users";
import { createClient } from "@/lib/supabase/server";
import { UserAdminPanel } from "@/components/admin/user-admin-panel";

export const metadata: Metadata = { title: "User-Management" };

// Lives in the (public) route group so it renders inside the main glass shell
// (sidebar + topbar), NOT the bare top-level /admin dashboard. Access is gated
// here at the page (the public layout itself does not gate).
type PageProps = {
  searchParams: Promise<{
    q?: string;
    dept?: string;
    status?: string;
    privateOnly?: string;
    noPhoto?: string;
  }>;
};

/** Distinct, sorted department values for the filter dropdown (RLS-scoped read). */
async function getDepartments(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_members")
    .select("department")
    .not("department", "is", null);
  const set = new Set<string>();
  for (const r of (data ?? []) as { department: string | null }[]) {
    if (r.department) set.add(r.department);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  // super_admin ONLY. notFound() (404) rather than redirect so the route's
  // existence isn't revealed to admins/users who shouldn't see it.
  const identity = await getIdentity();
  if (!identity || !identity.isSuperAdmin) notFound();

  const sp = await searchParams;
  const [{ teamMembers, totalCount }, departments] = await Promise.all([
    getAllTeamMembers(),
    getDepartments(),
  ]);

  return (
    <UserAdminPanel
      teamMembers={teamMembers}
      totalCount={totalCount}
      departments={departments}
      initialFilters={{
        q: sp.q,
        departments: sp.dept ? sp.dept.split(",").filter(Boolean) : [],
        statuses: sp.status ? sp.status.split(",").filter(Boolean) : [],
        privateOnly: sp.privateOnly === "1",
        noPhoto: sp.noPhoto === "1",
      }}
      currentUserId={identity.userId}
    />
  );
}
