"use client";

import { useToast } from "@/components/ui/toast";

// "Or sign in with" → OneLogin. The app has no SSO/SAML integration (Supabase
// email+password only), so this is a decorative placeholder: it matches the
// design but surfaces a "coming soon" toast instead of attempting a sign-in.
// The "onelogin" wordmark is the CSS-text logo (font stack per the brand spec;
// falls back to the app's Inter where Gilroy/Montserrat aren't available).
export default function SsoButton() {
  const { toast } = useToast();

  return (
    <button
      type="button"
      className="auth-sso"
      onClick={() =>
        toast({
          title: "Single sign-on is coming soon",
          description:
            "OneLogin isn’t connected yet — sign in with your email and password for now.",
          variant: "info",
        })
      }
    >
      <span className="auth-sso-logo">onelogin</span>
    </button>
  );
}
