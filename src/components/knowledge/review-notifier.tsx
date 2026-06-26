"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { fetchPendingCorrectionsCount } from "@/lib/rag/client";

const POLL_MS = 45_000;

/**
 * Always-mounted (super_admin only) pending-reviews indicator for the shell.
 * Polls the open-correction count, shows a pill when > 0, and toasts when a new
 * one arrives. Reuses the existing fetchPendingCorrectionsCount (RLS-scoped).
 * Mounted inside the user block so it lives wherever the shell does.
 */
export function ReviewNotifier() {
  const { toast } = useToast();
  const router = useRouter();
  const [count, setCount] = useState(0);
  const prev = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    async function tick() {
      const n = await fetchPendingCorrectionsCount();
      if (!alive) return;
      if (prev.current !== null && n > prev.current) {
        toast({
          variant: "warning",
          title: "Neue Wissens-Korrektur wartet",
          description: `${n} offene Review${n === 1 ? "" : "s"}`,
          duration: 8000,
          action: { label: "Öffnen", onClick: () => router.push("/admin/knowledge?tab=reviews") },
        });
      }
      prev.current = n;
      setCount(n);
    }
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [toast, router]);

  if (count <= 0) return null;
  return (
    <span
      className="um-review-pill"
      title={`${count} offene Review${count === 1 ? "" : "s"} — Wissensbasis`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        marginTop: 2,
        width: "fit-content",
        fontSize: "11px",
        fontWeight: 600,
        lineHeight: 1.4,
        color: "var(--warning)",
        background: "var(--warning-soft)",
        borderRadius: "999px",
        padding: "1px 8px",
      }}
    >
      ● {count} Review{count === 1 ? "" : "s"}
    </span>
  );
}
