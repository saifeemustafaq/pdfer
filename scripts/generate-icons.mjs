import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PUBLIC_DIR = path.join(root, "public");

// Brand colors (mirrors --primary / --background tokens in app/globals.css).
const PRIMARY = "#C15F3C";
const LIGHT = "#FAFAF7";

/**
 * White "P" wordmark drawn from primitives on a 512x512 grid. Built from
 * shapes (not text) so rasterization is font-independent and deterministic
 * across local macOS and the Netlify Linux build.
 */
function pMark() {
  return `
    <circle cx="248" cy="196" r="104" fill="${LIGHT}"/>
    <circle cx="264" cy="196" r="48" fill="${PRIMARY}"/>
    <rect x="156" y="118" width="64" height="278" rx="12" fill="${LIGHT}"/>
  `;
}

function buildSvg(size, { maskable }) {
  // Maskable icons are full-bleed (Android masks them to various shapes), so
  // the mark is scaled into the central safe zone. Standard icons use a circle.
  const background = maskable
    ? `<rect width="512" height="512" fill="${PRIMARY}"/>`
    : `<circle cx="256" cy="256" r="256" fill="${PRIMARY}"/>`;
  const scale = maskable ? 0.78 : 1;
  const offset = (512 * (1 - scale)) / 2;

  return `<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    ${background}
    <g transform="translate(${offset} ${offset}) scale(${scale})">${pMark()}</g>
  </svg>`;
}

const targets = [
  { name: "icon-192.png", size: 192, maskable: false },
  { name: "icon-512.png", size: 512, maskable: false },
  { name: "icon-512-maskable.png", size: 512, maskable: true },
];

for (const target of targets) {
  const svg = buildSvg(target.size, { maskable: target.maskable });
  const outPath = path.join(PUBLIC_DIR, target.name);
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log(`generated ${target.name}`);
}
