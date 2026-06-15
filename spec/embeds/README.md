# spec/embeds — Preserved Webflow Embeds

Custom HTML, CSS, and JS extracted verbatim from the original
`airtuerk-terminal_webflow.zip` export. Total ~224 KB.

**These files are NOT runtime code.** They are reference material for Phase 6,
where they get ported 1:1 into React components.

For mapping to React components, port plans, and rationale:
see `../EMBEDS_INVENTORY.md` (one directory up).

For source page mappings:
see `../SOURCE_INVENTORY.md` §3.

For the decision to preserve these:
see `../DECISIONS.md` D-046.

## Files

| File | Purpose |
|---|---|
| `apix-page-embeds.html` | APIX Workflow + Global Network + PowerPoint embed |
| `apix-additional.css` | APIX support styles |
| `apix-additional.js` | APIX support scripts |
| `ibe-tools-showcase.html` | IBE Tools Showcase (full standalone HTML — becomes the `/ibe-product-suite` page body) |
| `jersey-customizer.html` | Jersey Customizer markup |
| `jersey-customizer-full.css` | Jersey Customizer styles |
| `jersey-customizer-full.js` | Jersey Customizer logic |
| `signature-generator.html` | Email signature form (used 4 times across brands) |
| `out-of-office-generator.html` | Out-of-Office message form |
| `color-strip-pattern.html` | Reference pattern for `color_palette` block (D-005) |
| `service-page-support.css` | Shared CSS for color/signature/OOO blocks |
| `service-page-support.js` | Shared JS for color/signature/OOO blocks |

## Do NOT modify these files in place

If a port-time fix is needed, write it in the React component, not here.
These files stay frozen at the Webflow export point so we can always go back
and compare against the original behavior.
