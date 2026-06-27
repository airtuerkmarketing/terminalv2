import type { ReactNode } from "react";
import {
  Files,
  GalleryVerticalEnd,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Presentation,
  Settings,
  Sparkles,
  User,
  UserCog,
  Users,
} from "lucide-react";

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
      return <LayoutDashboard aria-hidden />;
    case "duty-free":
      return <Sparkles aria-hidden />;
    case "airtuerk-service":
      // FALLBACK (pre-favicon) — restore by uncommenting:
      // return (
      //   <I>
      //     <circle cx="12" cy="12" r="3" />
      //     <circle cx="12" cy="12" r="9" />
      //   </I>
      // );
      return (
        <svg viewBox="0 0 159 159" fill="none" aria-hidden="true">
          <path fillRule="evenodd" clipRule="evenodd" d="M113.647 9H135.911L127.33 45.26H158.656L154.425 66.19L121.656 66.056C121.656 66.056 112.656 110.56 111.556 118.29C111.556 125.56 116.656 128.56 120.818 128.71C124.98 128.86 149.319 128.71 149.319 128.71L144.923 150.56H115.967C100.156 150.56 87.6562 138.06 87.6562 124.06C88.0008 116.9 97.6562 71.5601 97.6562 71.5601C99.1566 57.6101 65.1562 45.0001 65.1562 45.0001L105.156 45" fill="#ED1C24"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M74.2748 44.9766L19.2207 44.9769L15.1348 65.9401H69.4748C75.4848 65.9401 77.7648 70.56 77.7648 74.33C77.1548 77.9999 75.6548 81.1501 75.6548 81.1501H38.1848C17.8948 81.1501 0.15478 102.56 0.15478 119.37C-1.71531 136.06 13.7347 150.83 26.2847 150.83H84.1848C84.1848 150.83 88.9748 126.58 93.1548 104.99C96.1548 89.5201 98.8448 75.4301 99.2348 72.6201C100.965 60.0501 90.5148 44.9766 74.2748 44.9766ZM66.4748 129.71C66.4748 129.71 37.0202 130.06 33.6548 130.06C30.2893 130.06 22.2847 126.06 21.6948 117.38C21.1049 108.7 26.8948 102.53 35.1548 102.06C43.3948 101.54 71.1548 102.06 71.1548 102.06L65.6548 129.72L66.4748 129.71Z" fill="#17479E"/>
        </svg>
      );
    case "airtuerk-holidays":
      // FALLBACK (pre-favicon) — restore by uncommenting:
      // return (
      //   <I>
      //     <circle cx="12" cy="12" r="9" />
      //     <line x1="3" y1="12" x2="21" y2="12" />
      //   </I>
      // );
      return (
        <svg viewBox="0 0 163 156" fill="none" aria-hidden="true">
          <path d="M162.885 155.55H134.213L67.1094 0H95.8827L162.885 155.55Z" fill="#17479E"/>
          <path d="M131.971 33.4648L106.654 93.1822H56.4282L81.7447 33.4648H51.7513L0 155.545H29.8917L45.2443 119.429H95.5721L80.2196 155.545H110.213L161.964 33.4648H131.971Z" fill="#ED1C24"/>
        </svg>
      );
    case "atbeds":
      // FALLBACK (pre-favicon) — restore by uncommenting:
      // return (
      //   <I>
      //     <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16" />
      //     <path d="M2 21h20" />
      //     <path d="M9 7h6" />
      //     <path d="M9 11h6" />
      //     <path d="M9 15h6" />
      //   </I>
      // );
      return (
        <svg viewBox="0 0 310 310" fill="none" aria-hidden="true">
          <path d="M286.982 91.0512H223.328C210.525 91.0512 203.766 95.608 200.642 110.251L181.643 199.851C181.284 201.848 180.926 203.896 180.926 205.534C180.926 214.699 186.969 219.051 196.084 219.051H261.582C287.904 219.051 294.664 205.33 298.914 185.771C299.631 182.085 299.99 178.654 299.99 175.326C299.99 163.806 295.074 155.205 284.985 154.283V153.566C301.27 151.57 306.545 141.842 308.952 127.966C309.669 123.563 309.669 119.57 309.669 115.883C309.669 100.165 301.987 91 286.982 91V91.0512ZM274.18 182.29C271.414 195.09 265.781 199.851 253.132 199.851H214.929C209.245 199.851 207.043 198.776 207.043 194.936C207.043 193.81 207.248 192.376 207.606 190.738L213.291 164.062H262.299C270.902 164.062 275.102 167.544 275.102 175.224C275.102 177.221 274.743 179.627 274.18 182.341V182.29ZM284.012 127.966C281.298 140.766 276.894 144.811 266.089 144.811H217.439L222.765 119.365C224.25 112.043 226.605 110.2 233.928 110.2H273.258C281.657 110.2 285.139 113.682 285.139 120.082C285.139 122.078 284.576 125.406 284.012 127.966Z" fill="#ED1C24"/>
          <path d="M71.7969 105.336C78.5055 94.686 84.0874 91.0508 95.4561 91.0508C106.825 91.0508 111.178 94.4812 113.38 105.336L136.885 219.051H113.175L107.03 187.051H46.0893L26.3733 219.051H0L71.7969 105.336ZM55.7169 170.052H104.367L94.7904 118.545C94.4319 116.548 93.8686 113.323 92.281 113.323C90.6935 113.323 88.85 116.6 87.5697 118.545L55.7681 170.052H55.7169Z" fill="#17479E"/>
          <path d="M194.908 109.739C197.264 98.526 201.77 93.0988 209.349 91.0508H109.387C114.047 92.9964 116.915 96.7852 118.349 104.004L119.629 110.251H143.954L131.612 168.158L142.11 219.051H144.875L168.125 110.251H194.806L194.908 109.739Z" fill="#17479E"/>
        </svg>
      );
    case "service-center-antalya":
      // FALLBACK (pre-favicon) — restore by uncommenting:
      // return (
      //   <I>
      //     <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      //     <circle cx="12" cy="10" r="3" />
      //   </I>
      // );
      // Same at-glyph as airtuerk-service (shared brand mark).
      return (
        <svg viewBox="0 0 159 159" fill="none" aria-hidden="true">
          <path fillRule="evenodd" clipRule="evenodd" d="M113.647 9H135.911L127.33 45.26H158.656L154.425 66.19L121.656 66.056C121.656 66.056 112.656 110.56 111.556 118.29C111.556 125.56 116.656 128.56 120.818 128.71C124.98 128.86 149.319 128.71 149.319 128.71L144.923 150.56H115.967C100.156 150.56 87.6562 138.06 87.6562 124.06C88.0008 116.9 97.6562 71.5601 97.6562 71.5601C99.1566 57.6101 65.1562 45.0001 65.1562 45.0001L105.156 45" fill="#ED1C24"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M74.2748 44.9766L19.2207 44.9769L15.1348 65.9401H69.4748C75.4848 65.9401 77.7648 70.56 77.7648 74.33C77.1548 77.9999 75.6548 81.1501 75.6548 81.1501H38.1848C17.8948 81.1501 0.15478 102.56 0.15478 119.37C-1.71531 136.06 13.7347 150.83 26.2847 150.83H84.1848C84.1848 150.83 88.9748 126.58 93.1548 104.99C96.1548 89.5201 98.8448 75.4301 99.2348 72.6201C100.965 60.0501 90.5148 44.9766 74.2748 44.9766ZM66.4748 129.71C66.4748 129.71 37.0202 130.06 33.6548 130.06C30.2893 130.06 22.2847 126.06 21.6948 117.38C21.1049 108.7 26.8948 102.53 35.1548 102.06C43.3948 101.54 71.1548 102.06 71.1548 102.06L65.6548 129.72L66.4748 129.71Z" fill="#17479E"/>
        </svg>
      );
    case "ibe-product-suite":
      return <GalleryVerticalEnd aria-hidden />;
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
      return <LibraryBig aria-hidden />;
    case "document-library":
      return <Files aria-hidden />;
    case "team":
      return <Users aria-hidden />;
    case "users":
      return <Users aria-hidden />;
    case "presentation-hub":
      return <Presentation aria-hidden />;
    default:
      return (
        <I>
          <circle cx="12" cy="12" r="9" />
        </I>
      );
  }
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

export function SettingsIcon() {
  return <Settings aria-hidden />;
}

export function ProfileIcon() {
  return <User aria-hidden />;
}

export function UserCogIcon() {
  return <UserCog aria-hidden />;
}

export function LogoutIcon() {
  return <LogOut aria-hidden />;
}

export function MenuIcon() {
  return (
    <I>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </I>
  );
}
