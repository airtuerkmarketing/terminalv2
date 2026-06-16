import type { ReactNode } from "react";

/**
 * Inline SVG icons ported verbatim from spec/mockups/v3-01-dashboard.html.
 * Kept inline (rather than an icon library) to match the mockup exactly and
 * avoid a runtime dependency. Sizing/colour come from the shell.css classes
 * (currentColor + width/height on the parent selectors).
 */
function I({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Nav-item icon, keyed by brand/page slug (see ARCHITECTURE.md §3). */
export function NavIcon({ name }: { name: string }) {
  switch (name) {
    case "dashboard":
      return (
        <I>
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </I>
      );
    case "airtuerk-service":
      return (
        <I>
          <circle cx="12" cy="12" r="3" />
          <circle cx="12" cy="12" r="9" />
        </I>
      );
    case "airtuerk-holidays":
      return (
        <I>
          <circle cx="12" cy="12" r="9" />
          <line x1="3" y1="12" x2="21" y2="12" />
        </I>
      );
    case "atbeds":
      return (
        <I>
          <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16" />
          <path d="M2 21h20" />
          <path d="M9 7h6" />
          <path d="M9 11h6" />
          <path d="M9 15h6" />
        </I>
      );
    case "service-center-antalya":
      return (
        <I>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </I>
      );
    case "ibe-product-suite":
      return (
        <I>
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </I>
      );
    case "internal-branding":
      return (
        <I>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </I>
      );
    case "airtuerk-apix":
      return (
        <I>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </I>
      );
    case "multicheck":
      return (
        <I>
          <polyline points="20 6 9 17 4 12" />
        </I>
      );
    case "cockpit":
      return (
        <I>
          <path d="M4 17l6-6 4 4 8-8" />
        </I>
      );
    case "mytransfer":
      return (
        <I>
          <polyline points="9 18 15 12 9 6" />
        </I>
      );
    case "mybooking":
      return (
        <I>
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </I>
      );
    case "rentalcar":
      return (
        <I>
          <circle cx="12" cy="12" r="10" />
        </I>
      );
    case "mystats":
      return (
        <I>
          <line x1="12" y1="20" x2="12" y2="10" />
          <line x1="18" y1="20" x2="18" y2="4" />
          <line x1="6" y1="20" x2="6" y2="16" />
        </I>
      );
    case "asset-library":
      return (
        <I>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </I>
      );
    case "document-library":
      return (
        <I>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </I>
      );
    case "team":
      return (
        <I>
          <circle cx="9" cy="7" r="4" />
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        </I>
      );
    case "presentation-hub":
      return (
        <I>
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </I>
      );
    default:
      return (
        <I>
          <circle cx="12" cy="12" r="9" />
        </I>
      );
  }
}

/** Sidebar collapse chevron (rotates 180° via CSS when collapsed). */
export function CollapseIcon() {
  return (
    <I>
      <polyline points="15 18 9 12 15 6" />
    </I>
  );
}

/** Expand chevron for the IBE section (rotates 90° via CSS when open). */
export function ChevronIcon() {
  return (
    <I>
      <polyline points="9 18 15 12 9 6" />
    </I>
  );
}

export function SearchIcon() {
  return (
    <I>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </I>
  );
}

export function ExternalIcon() {
  return (
    <I>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </I>
  );
}

export function SunIcon() {
  return (
    <I>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </I>
  );
}

export function MoonIcon() {
  return (
    <I>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </I>
  );
}

export function OrbsIcon() {
  return (
    <I>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
    </I>
  );
}
