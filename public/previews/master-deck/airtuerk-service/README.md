# Master-deck preview covers

Static, convention-based cover images for master-deck PDFs. Rendered by the
tilted preview-card variant in `src/components/blocks/document-list.tsx`.

## Convention

For a PDF served at `…/master-deck/<brand>/<file>.pdf`, the cover is expected at:

    /previews/master-deck/<brand>/<file>.preview.png

A cover only renders as a tilted card if its path is also listed in the
`KNOWN_PREVIEWS` allowlist in `document-list.tsx` (temporary until a
`previewImageUrl` schema field exists).

## Pending asset

`airtuerk_Master_DE.preview.png` — the DE master-deck cover. The path is already
enabled in `KNOWN_PREVIEWS`; drop the PNG here (≤300 KB preferred) and commit it.
Until then the DE card shows a broken image (accepted as a transition).
