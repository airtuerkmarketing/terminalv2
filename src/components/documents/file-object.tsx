"use client";

import { useId } from "react";
import type { FileKind } from "@/lib/documents-constants";

/**
 * Free-standing SVG document object per file type (124×168). The viewBox carries
 * extra room BELOW + around the sheet so the drop-shadow filter region and the
 * bottom-right marker pill are never clipped at the canvas edge (the sheet sits
 * with a margin on every side). A sheet with a folded corner + a type marker pill
 * bottom-right; text types show grey lines, images show a photo field. The
 * drop-shadow filter + the image gradient are namespaced via useId so multiple
 * objects on one page don't share/clobber ids.
 */

const MARKER: Record<FileKind, { label: string; color: string }> = {
  pdf:   { label: "PDF",  color: "#D8352A" },
  word:  { label: "DOCX", color: "#185FA5" },
  excel: { label: "XLS",  color: "#3B6D11" },
  ppt:   { label: "PPT",  color: "#BA7517" },
  txt:   { label: "TXT",  color: "#6B7280" },
  zip:   { label: "ZIP",  color: "#6B7280" },
  file:  { label: "FILE", color: "#6B7280" },
  image: { label: "IMG",  color: "#7C3AED" },
};

export function FileObject({ kind, imageUrl }: { kind: FileKind; imageUrl?: string }) {
  const uid = useId().replace(/:/g, "");
  const shadow = `fo-shadow-${uid}`;
  const photo = `fo-photo-${uid}`;
  const m = MARKER[kind];
  const isImage = kind === "image";

  return (
    <svg viewBox="0 0 124 168" className="fo-svg" aria-hidden="true">
      <defs>
        {/* Generous filter region (-20%/-12% origin, 140% box) so the dy=6 blurred
            shadow below + beside the sheet renders fully inside the canvas. */}
        <filter id={shadow} x="-20%" y="-12%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="4.5" floodColor="rgba(0,0,0,0.14)" />
        </filter>
        {isImage && (
          <linearGradient id={photo} x1="20" y1="46" x2="100" y2="120" gradientUnits="userSpaceOnUse">
            <stop stopColor="#C9D6E8" />
            <stop offset="1" stopColor="#E8D5D0" />
          </linearGradient>
        )}
      </defs>

      <g filter={`url(#${shadow})`}>
        {/* Sheet + folded corner (all types) — inset with margin on every side so
            the canvas never clips the edge or its shadow. */}
        <path d="M16 8h62l26 26v108a6 6 0 0 1-6 6H16a6 6 0 0 1-6-6V14a6 6 0 0 1 6-6z" fill="#fff" stroke="#ECECEC" />
        <path d="M78 8l26 26H84a6 6 0 0 1-6-6V8z" fill="#EFEFEF" />
      </g>

      {isImage ? (
        <>
          {/* Photo field placeholder (a real <image> can replace this gradient
              once imageUrl handling lands — kept as a gradient for now). */}
          <rect x="20" y="46" width="80" height="74" rx="6" fill={`url(#${photo})`} />
          <circle cx="42" cy="66" r="7" fill="#fff" opacity="0.7" />
          <polygon points="28,116 56,84 76,116" fill="#fff" opacity="0.55" />
          <polygon points="62,116 84,92 100,116" fill="#fff" opacity="0.55" />
        </>
      ) : (
        <g stroke="#EFEFEF" strokeWidth="4" strokeLinecap="round">
          <line x1="26" y1="56" x2="94" y2="56" />
          <line x1="26" y1="72" x2="94" y2="72" />
          <line x1="26" y1="88" x2="76" y2="88" />
        </g>
      )}

      {/* Type marker pill — prominent, bottom-right, fully inside the sheet. */}
      <rect x="46" y="116" width="52" height="22" rx="6" fill={m.color} />
      <text
        x="72"
        y="127"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="12"
        fontWeight="600"
        fontFamily="inherit"
        fill="#fff"
      >
        {m.label}
      </text>
    </svg>
  );
}
