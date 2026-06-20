"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { fileKind, fileKindLabel } from "@/lib/documents-constants";

/**
 * 3D animated folder card (adapted from 21st.dev jatin-yadav05/3d-folder — D-055+).
 * Ported structure + overshoot animation; remapped to project tokens (neutral /
 * Quantum-tinted folder, NOT orange — chrome stays Quantum-only per D-036). The
 * fan-out peeks at the folder's real top files (image thumbs via the signed-URL
 * route, type badges otherwise). The whole card is a link into the folder; the
 * original ImageLightbox gallery is intentionally dropped (wrong pattern for
 * mixed documents + avoids set-state-in-effect churn). The overshoot hover is a
 * documented exception to the calm-hover rule, scoped to THIS component only,
 * and is frozen under prefers-reduced-motion.
 */

export interface FolderPreviewFile {
  id: string;
  title: string;
  extension: string;
  isImage: boolean;
}

export interface FolderCard3DProps {
  name: string;
  href: string;
  isPublic: boolean;
  fileCount: number;
  previewFiles: FolderPreviewFile[];
  className?: string;
}

const EASE = "cubic-bezier(0.34, 1.56, 0.64, 1)";

// prefers-reduced-motion mirror (useSyncExternalStore — no setState-in-effect).
function subscribeRM(cb: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function getRM() {
  return typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}
function useReducedMotion() {
  return useSyncExternalStore(subscribeRM, getRM, () => false);
}

export function FolderCard3D({
  name,
  href,
  isPublic,
  fileCount,
  previewFiles,
  className,
}: FolderCard3DProps) {
  const [hovered, setHovered] = useState(false);
  const reduced = useReducedMotion();
  const tiles = previewFiles.slice(0, 3);
  // Degrade: 0 files → folder stays closed (no fan-out); reduced-motion → static.
  const open = hovered && tiles.length > 0 && !reduced;
  const tr = (s: string) => (reduced ? "none" : s);

  return (
    <Link
      href={href}
      aria-label={`${name}, ${fileCount} ${fileCount === 1 ? "file" : "files"}`}
      className={cn(
        "dl-folder-card group relative flex flex-col items-center justify-start no-underline",
        "p-6 rounded-[var(--radius-xl)] cursor-pointer",
        "bg-surface border border-hairline text-text-1",
        "shadow-[var(--shadow-rest)] hover:shadow-[var(--shadow-hover)] hover:border-accent-border",
        className
      )}
      style={{ perspective: "1000px", minHeight: "300px" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      {/* Quantum hover glow */}
      <div
        className="absolute inset-0 rounded-[var(--radius-xl)] pointer-events-none"
        style={{
          background: "radial-gradient(circle at 50% 70%, var(--accent) 0%, transparent 70%)",
          opacity: open ? 0.08 : 0,
          transition: tr("opacity 500ms ease"),
        }}
      />

      {/* Private cue — Torch lock, top-right (admins only ever see private folders) */}
      {!isPublic && (
        <span
          className="absolute top-3 right-3 z-40 inline-grid place-items-center"
          style={{ color: "var(--torch)" }}
          aria-label="Private"
          title="Private"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </span>
      )}

      {/* 3D folder stage */}
      <div className="relative flex items-center justify-center my-2" style={{ height: "160px", width: "200px" }}>
        {/* back panel */}
        <div
          className="absolute w-32 h-24 rounded-lg bg-surface-strong border border-hairline"
          style={{
            transformOrigin: "bottom center",
            transform: open ? "rotateX(-15deg)" : "rotateX(0deg)",
            transition: tr(`transform 500ms ${EASE}`),
            zIndex: 10,
            boxShadow: "var(--shadow-rest)",
          }}
        />
        {/* tab */}
        <div
          className="absolute w-12 h-4 rounded-t-md bg-surface-strong border border-b-0 border-hairline"
          style={{
            top: "calc(50% - 48px - 12px)",
            left: "calc(50% - 64px + 16px)",
            transformOrigin: "bottom center",
            transform: open ? "rotateX(-25deg) translateY(-2px)" : "rotateX(0deg)",
            transition: tr(`transform 500ms ${EASE}`),
            zIndex: 10,
          }}
        />

        {/* file peek tiles */}
        <div className="absolute" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 20 }}>
          {tiles.map((f, i) => (
            <PeekTile key={f.id} file={f} index={i} open={open} reduced={reduced} />
          ))}
        </div>

        {/* front flap (Quantum-soft tint) */}
        <div
          className="absolute w-32 h-24 rounded-lg border border-hairline"
          style={{
            top: "calc(50% - 48px + 4px)",
            background: "var(--accent-soft)",
            transformOrigin: "bottom center",
            transform: open ? "rotateX(25deg) translateY(8px)" : "rotateX(0deg)",
            transition: tr(`transform 500ms ${EASE}`),
            zIndex: 30,
            boxShadow: "var(--shadow-hover)",
          }}
        />
        {/* shine */}
        <div
          className="absolute w-32 h-24 rounded-lg overflow-hidden pointer-events-none"
          style={{
            top: "calc(50% - 48px + 4px)",
            background: "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 50%)",
            transformOrigin: "bottom center",
            transform: open ? "rotateX(25deg) translateY(8px)" : "rotateX(0deg)",
            transition: tr(`transform 500ms ${EASE}`),
            zIndex: 31,
          }}
        />
      </div>

      <h3
        className="text-base font-semibold text-text-1 mt-2"
        style={{ transform: open ? "translateY(4px)" : "translateY(0)", transition: tr("transform 300ms ease") }}
      >
        {name}
      </h3>
      <p
        className="text-sm text-text-3"
        style={{ opacity: open ? 0.7 : 1, transition: tr("opacity 300ms ease") }}
      >
        {fileCount} {fileCount === 1 ? "file" : "files"}
      </p>
    </Link>
  );
}

function PeekTile({
  file,
  index,
  open,
  reduced,
}: {
  file: FolderPreviewFile;
  index: number;
  open: boolean;
  reduced: boolean;
}) {
  const rotations = [-12, 0, 12];
  const translations = [-55, 0, 55];
  const kind = fileKind(file.extension);

  return (
    <div
      className="absolute w-20 h-28 rounded-lg overflow-hidden bg-surface-strong border border-hairline pointer-events-none"
      style={{
        left: "-40px",
        top: "-56px",
        zIndex: 10 - index,
        transform: open
          ? `translateY(-90px) translateX(${translations[index]}px) rotate(${rotations[index]}deg) scale(1)`
          : "translateY(0px) translateX(0px) rotate(0deg) scale(0.5)",
        opacity: open ? 1 : 0,
        transition: reduced ? "none" : `all 600ms ${EASE} ${index * 80}ms`,
        boxShadow: "var(--shadow-hover)",
      }}
    >
      {file.isImage ? (
        /* eslint-disable-next-line @next/next/no-img-element -- gated signed-URL via the serving route */
        <img src={`/api/library/file/${file.id}`} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-surface-muted">
          <span className={cn("dl-ft sm", `ft-${kind}`)} aria-hidden="true">
            {fileKindLabel(file.extension)}
          </span>
        </div>
      )}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent)" }}
      />
      <p
        className="absolute bottom-1 left-1.5 right-1.5 truncate"
        style={{ fontSize: "10px", fontWeight: 600, color: "#fff" }}
      >
        {file.title}
      </p>
    </div>
  );
}
