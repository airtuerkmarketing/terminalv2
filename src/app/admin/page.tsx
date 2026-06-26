import { redirect } from "next/navigation";

// /admin has no surface of its own — the real admin lives in the (public) glass
// shell at /admin/users (and /admin/knowledge). Send the bare path there; the
// target's own super_admin gate stays authoritative, and this route's layout
// still gates anon → /login. SWEEP-008 / Welle A.
// (The Phase-0 placeholder stats dashboard that used to render here is superseded.)
export default function AdminIndex() {
  redirect("/admin/users");
}
