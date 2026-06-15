# spec/mockups — Design Reference Mockups

Final approved HTML mockups used as the visual reference for Phase 4 implementation.

## Files

### v3-01-dashboard.html
**Approved on:** 2026-06-15 (Phase 3.5)
**Status:** Canonical design reference for Phase 4

Demonstrates:
- iOS 18 Liquid Glass design system (see `../DESIGN_SYSTEM.md`)
- Final sidebar structure with three sections + IBE expandable
- Collapsible sidebar (252px ↔ 64px)
- Toggleable orbs (on for Dashboard)
- Light/dark theme toggle (Quantum Blue accent)
- Brand cards layout (7 brands, brand-specific mark colors)
- Three document download styles side-by-side:
  - Option 1: List rows
  - Option 2: Preview cards (DEFAULT)
  - Option 3: Image + outline button

## Phase 4 usage

The inline `<style>` block in v3-01-dashboard.html is the source of truth
for design tokens. Phase 4 ports it to `src/styles/theme.css`.

The HTML structure shows the intended component breakdown — Phase 4 builds
the React equivalents:
- `<AppShell />` with `<Sidebar />` + `<Topbar />` + `<Ambient />`
- `<BrandCard />` for the dashboard grid
- Three document-download renderers for `document_list` block

## Do NOT use as production code

These files are static HTML for visual reference. The real implementation
lives in `src/` and uses React Server Components + the block renderer.
