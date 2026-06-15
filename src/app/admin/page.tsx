import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Just to confirm everything's wired correctly: pull some stats
  const [brandsRes, pagesRes, assetsRes, documentsRes] = await Promise.all([
    supabase.from("brands").select("*", { count: "exact", head: true }),
    supabase.from("pages").select("*", { count: "exact", head: true }),
    supabase.from("assets").select("*", { count: "exact", head: true }),
    supabase.from("documents").select("*", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Brands", value: brandsRes.count ?? "?" },
    { label: "Pages", value: pagesRes.count ?? "?" },
    { label: "Assets", value: assetsRes.count ?? "?" },
    { label: "Documents", value: documentsRes.count ?? "?" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-2 text-sm text-gray-600">
        Welcome back. This is the placeholder admin shell — full CMS UI ships in Phase 5.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-gray-200 bg-white p-5"
          >
            <div className="text-xs uppercase tracking-wide text-gray-500">
              {stat.label}
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
        <p>Phase 4 + 5 build the public frontend and CMS UI on top of this shell.</p>
      </div>
    </div>
  );
}