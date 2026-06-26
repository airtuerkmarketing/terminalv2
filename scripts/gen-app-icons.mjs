// Generates the raster app-icons that can't be pure SVG, from the terminal
// A-mark (images/terminal_logo). Re-run whenever the brand mark changes:
//   node scripts/gen-app-icons.mjs
//
// Why raster at all (the in-app logos stay SVG):
//   • apple-touch-icon  — iOS Safari does NOT render SVG touch icons → PNG.
//   • favicon.ico       — root /favicon.ico fallback for legacy / non-SVG UAs.
//   • OG image          — Slack/Teams/Twitter do NOT render SVG og:image → PNG.
//
// All three are the white mark centred on the brand-dark plate (#0E0E10) so they
// stay legible on any home-screen wallpaper, tab bar, or unfurl card. The bare
// adaptive mark lives in public/icon.svg for modern browser tabs.

import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PLATE = "#0E0E10";
const MARK = "#ffffff";

// The mark from images/terminal_logo/250X250_white.svg — perfectly centred in
// its 250×250 box (bbox centre = 125,125), so it scales into any square cleanly.
const MARK_POLYS = [
  "2.42 12.76 83.91 153.92 110.67 107.93 56.03 12.76 2.42 12.76",
  "82.55 37.18 108.56 83.34 221.05 83.34 247.58 37.18 82.55 37.18",
  "132.43 95.02 186.03 95.02 104.07 237.24 77.24 190.95 132.43 95.02",
].map((p) => `<polygon fill="${MARK}" points="${p}"/>`).join("");

// A square badge: rounded plate + the mark inset by `insetFrac` on every side.
function badgeSvg({ size, radius, insetFrac }) {
  const inset = Math.round(size * insetFrac);
  const inner = size - inset * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${PLATE}"/>
  <svg x="${inset}" y="${inset}" width="${inner}" height="${inner}" viewBox="0 0 250 250">${MARK_POLYS}</svg>
</svg>`;
}

const png = (opts) =>
  sharp(Buffer.from(badgeSvg(opts))).resize(opts.size, opts.size).png().toBuffer();

// Minimal ICO container wrapping one PNG per size (PNG-in-ICO, all modern UAs).
function encodeIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const dir = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...dir, ...images.map((i) => i.data)]);
}

async function main() {
  // apple-touch-icon: full-bleed plate (iOS applies its own superellipse mask).
  const apple = await png({ size: 180, radius: 0, insetFrac: 0.17 });
  await writeFile(resolve(ROOT, "public/apple-touch-icon.png"), apple);

  // OG / Twitter card thumbnail — rounded badge, PNG so it actually unfurls.
  const og = await png({ size: 250, radius: 44, insetFrac: 0.17 });
  await writeFile(resolve(ROOT, "public/logos/terminal/icon-250.png"), og);

  // favicon.ico — 16/32/48, rounded, slightly tighter inset so the small marks read.
  const sizes = [16, 32, 48];
  const ico = encodeIco(
    await Promise.all(
      sizes.map(async (size) => ({
        size,
        data: await png({ size, radius: Math.round(size * 0.19), insetFrac: 0.12 }),
      }))
    )
  );
  await writeFile(resolve(ROOT, "public/favicon.ico"), ico);

  console.log("✓ apple-touch-icon.png   180×180", apple.length, "bytes");
  console.log("✓ icon-250.png (OG)      250×250", og.length, "bytes");
  console.log("✓ favicon.ico            16/32/48", ico.length, "bytes");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
