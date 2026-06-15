# Mockups — terminalv2 v3 (iOS 18 Liquid Glass)

These are the **approved v3 design references** for Phase 4. All three share one
token system (the inline `<style>` block is identical across files — copy values
verbatim into `src/styles/theme.css`).

| File | Page type | Shows |
|---|---|---|
| `v3-01-dashboard.html` | Landing / Dashboard | Brand card grid, sidebar, orbs, 3 document download styles |
| `v3-02-brand-detail.html` | Brand detail page | Hero, logo download, color palette (hover-expand), typography specimen, preview-card documents |
| `v3-03-asset-library.html` | Asset Library | Search toolbar, filter chips, view toggle, grouped asset grid (logos + photography) |

## Design rules enforced in all three

- **Quantum Blue** (`--accent` = `#0A82DF` light / `#0A9EFF` dark) is the ONLY UI accent.
  Active nav items, focus states, hover icons, filter chips — all Quantum Blue.
- **Torch Red** (`#ED1C24`) appears ONLY in brand content: the airtuerk logo itself,
  the brand color palette, and PDF file-type indicators. NEVER in UI chrome.
- **Glass surfaces**: `backdrop-filter: saturate(180%) blur(18px)` (sidebar `blur(24px)`).
- **Card hover**: background + shadow change only. NO bouncy `translateY`.
- **Orbs**: toggleable. Default ON for dashboard, OFF for detail/library pages.
- **Themes**: `data-theme="ios18-light"` (default) and `ios18-dark`. Every token has both.

## How to use in Phase 4

1. Open each file in a browser to see the target.
2. Toggle the Theme and Orbs buttons (top right) to verify dark mode + ambient.
3. Copy CSS custom property VALUES verbatim — do not round or reinterpret.
4. After building each React component, compare side-by-side against the matching mockup.

These are static HTML. The React/Tailwind build must reproduce them visually; a
side-by-side visual diff is the Phase 4 exit criterion.
