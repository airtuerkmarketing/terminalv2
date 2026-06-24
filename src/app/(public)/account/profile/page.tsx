import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/auth";

export const metadata: Metadata = { title: "Profil" };

/**
 * Placeholder for the self-service profile page. Lives in the (public) route group
 * so it renders inside the main glass shell. The real form (wired to
 * updateOwnProfileAction) is implemented in AP 4 — this only gates anon access so
 * the route exists for the action alongside it.
 */
export default async function AccountProfilePage() {
  const identity = await getIdentity();
  if (!identity) redirect("/login");

  return (
    <div className="p-8">
      <h1 className="text-2xl">Profil</h1>
      <p style={{ color: "var(--text-2)" }}>UI-Implementierung folgt in AP 4.</p>
    </div>
  );
}
