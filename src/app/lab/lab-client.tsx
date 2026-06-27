"use client";

import { useEffect, useState } from "react";
import "@/styles/duty-free.css";
import TeamSection from "@/components/duty-free/ui/team";
import TeamSectionAdapted from "@/components/duty-free/ui/team.adapted";

type Theme = "ios18-light" | "ios18-dark";

// Side-by-side raw-vs-adapted mounter for the §7 fidelity diff. The repo's root
// layout already sets data-theme="ios18-light" on <html>; this only toggles it so
// both light and dark screenshots can be captured.
export default function LabClient() {
  const [theme, setTheme] = useState<Theme>("ios18-light");

  useEffect(() => {
    const html = document.documentElement;
    const prev = html.getAttribute("data-theme");
    html.setAttribute("data-theme", theme);
    return () => {
      if (prev) html.setAttribute("data-theme", prev);
    };
  }, [theme]);

  return (
    <div
      className="df-page"
      style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text-1)" }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "12px 24px",
          background: "var(--surface)",
          borderBottom: "1px solid var(--hairline)",
        }}
      >
        <strong>Duty Free · Lab</strong>
        <span className="df-label">component: team</span>
        <button
          type="button"
          onClick={() =>
            setTheme((t) => (t === "ios18-light" ? "ios18-dark" : "ios18-light"))
          }
          style={{
            marginLeft: "auto",
            padding: "6px 12px",
            border: "1px solid var(--df-hairline)",
            background: "var(--df-accent-soft)",
            color: "var(--df-accent)",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          theme: {theme}
        </button>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 0 }}>
        <section style={{ borderBottom: "2px dashed var(--hairline)" }}>
          <div
            className="df-label"
            style={{ padding: "16px 24px 0", color: "var(--text-3)" }}
          >
            RAW — vendored verbatim (meschacirung/team)
          </div>
          <TeamSection />
        </section>
        <section>
          <div
            className="df-label"
            style={{ padding: "16px 24px 0", color: "var(--df-accent)" }}
          >
            ADAPTED — §7 token swaps (bg-background→bg-surface · text-muted-foreground→text-text-2 · border→border-hairline)
          </div>
          <TeamSectionAdapted />
        </section>
      </div>
    </div>
  );
}
