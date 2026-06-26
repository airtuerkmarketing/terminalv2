"use client";

import { useId } from "react";
import type { FileKind } from "@/lib/documents-constants";

/**
 * Free-standing SVG document object per file type (116×146), matching the
 * free-standing 3D folder. A sheet with a folded corner + a type marker pill
 * bottom-left; text types show grey lines, images show a photo field. The
 * drop-shadow filter + the image gradient are namespaced via useId so multiple
 * objects on one page don't share/clobber ids.
 */

const MARKER: Record<FileKind, { label: string; color: string; width: number }> = {
  pdf:   { label: "PDF",  color: "#D8352A", width: 42 },
  word:  { label: "DOCX", color: "#185FA5", width: 48 },
  excel: { label: "XLS",  color: "#3B6D11", width: 42 },
  ppt:   { label: "PPT",  color: "#BA7517", width: 42 },
  txt:   { label: "TXT",  color: "#6B7280", width: 42 },
  zip:   { label: "ZIP",  color: "#6B7280", width: 42 },
  file:  { label: "FILE", color: "#6B7280", width: 46 },
  image: { label: "IMG",  color: "#7C3AED", width: 42 },
};

export function FileObject({ kind, imageUrl }: { kind: FileKind; imageUrl?: string }) {
  const uid = useId().replace(/:/g, "");
  const shadow = `fo-shadow-${uid}`;
  const photo = `fo-photo-${uid}`;
  const m = MARKER[kind];
  const markerX = 20 + (m.width - 42) / -2; // keep the pill left-anchored at x=20
  const isImage = kind === "image";

  return (
    <svg viewBox="0 0 116 146" className="fo-svg" aria-hidden="true">
      <defs>
        <filter id={shadow} x="-20%" y="-12%" width="140%" height="130%">
          <feDropShadow dx="0" dy="6" stdDeviation="4.5" floodColor="rgba(0,0,0,0.14)" />
        </filter>
        {isImage && (
          <linearGradient id={photo} x1="18" y1="44" x2="98" y2="118" gradientUnits="userSpaceOnUse">
            <stop stopColor="#C9D6E8" />
            <stop offset="1" stopColor="#E8D5D0" />
          </linearGradient>
        )}
      </defs>

      <g filter={`url(#${shadow})`}>
        {/* Sheet + folded corner (all types). */}
        <path d="M14 6h62l26 26v108a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6V12a6 6 0 0 1 6-6z" fill="#fff" stroke="#ECECEC" />
        <path d="M76 6l26 26H82a6 6 0 0 1-6-6V6z" fill="#EFEFEF" />
      </g>

      {isImage ? (
        <>
          {/* Photo field placeholder (a real <image> can replace this gradient
              once imageUrl handling lands — kept as a gradient for now). */}
          <rect x="18" y="44" width="80" height="74" rx="6" fill={`url(#${photo})`} />
          <circle cx="40" cy="64" r="7" fill="#fff" opacity="0.7" />
          <polygon points="26,114 54,82 74,114" fill="#fff" opacity="0.55" />
          <polygon points="60,114 82,90 98,114" fill="#fff" opacity="0.55" />
        </>
      ) : (
        <g stroke="#E6E6E6" strokeWidth="4" strokeLinecap="round">
          <line x1="24" y1="58" x2="92" y2="58" />
          <line x1="24" y1="72" x2="92" y2="72" />
          <line x1="24" y1="86" x2="74" y2="86" />
          <line x1="24" y1="100" x2="92" y2="100" />
        </g>
      )}

      {/* Type marker pill, bottom-left. */}
      <rect x={markerX} y="116" width={m.width} height="18" rx="5" fill={m.color} />
      <text
        x={markerX + m.width / 2}
        y="125"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="10"
        fontWeight="600"
        fontFamily="inherit"
        fill="#fff"
      >
        {m.label}
      </text>
    </svg>
  );
}
