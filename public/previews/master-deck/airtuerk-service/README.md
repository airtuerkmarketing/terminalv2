# Master-deck preview covers

Static, convention-based cover images for master-deck PDFs. Rendered by the
tilted preview-card variant in `src/components/blocks/document-list.tsx`.

## Convention

For a PDF served at `…/master-deck/<brand>/<file>.pdf`, the cover is expected at:

    /previews/master-deck/<brand>/<file>.preview.png

A cover only renders as a tilted card if its path is also listed in the
`KNOWN_PREVIEWS` allowlist in `document-list.tsx` (temporary until a
`previewImageUrl` schema field exists).

## Pending assets

Both paths are already enabled in `KNOWN_PREVIEWS`; drop the PNGs here (≤300 KB
preferred) and commit them. Until then the cards show a broken image (accepted
as a transition):

- `airtuerk_Master_DE.preview.png` — DE master-deck cover.
- `airtuerk_Master_EN.preview.png` — EN master-deck cover.
