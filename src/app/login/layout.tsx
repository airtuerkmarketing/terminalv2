import "@/styles/login.css";

// Wraps /login, /login/forgot-password and /login/update-password so the
// Liquid Glass auth styles load for the whole group.
export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
