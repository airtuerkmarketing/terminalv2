import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/auth";
import { getOwnProfile } from "@/lib/users";
import ProfileForm from "./profile-form";
import ActivateProfile from "./activate-profile";
import "@/styles/account-profile.css";

export const metadata: Metadata = { title: "Profile" };

/**
 * Self-service profile (AP 3). Lives in the (public) route group so it renders in
 * the glass shell and inherits the login + force-password gates. getOwnProfile is
 * RLS-scoped to the viewer's own team_member; a not-yet-linked account (e.g. dev@)
 * gets the activation card instead of the form.
 */
export default async function AccountProfilePage() {
  const identity = await getIdentity();
  if (!identity) redirect("/login");

  const profile = await getOwnProfile();

  return (
    <div className="acp-page">
      {profile ? (
        <ProfileForm profile={profile} />
      ) : (
        <ActivateProfile name={identity.fullName ?? identity.email ?? "your account"} />
      )}
    </div>
  );
}
