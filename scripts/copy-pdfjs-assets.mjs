/**
 * Copy the runtime assets pdf.js fetches on demand into `public/pdfjs/`.
 *
 * Without these, pages render with missing glyphs and undecodable images:
 * - standard_fonts: the standard 14 fonts (Helvetica, Times, Courier and their
 *   bold/italic variants) for PDFs that reference but do not embed them.
 * - cmaps: character maps for CID-encoded text.
 * - wasm: the JBIG2, OpenJPEG and QCMS decoders used by scanned documents.
 * - iccs: ICC colour profiles.
 *
 * Copying keeps them version-locked to the installed pdfjs-dist.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = path.join(root, "node_modules/pdfjs-dist");
const target = path.join(root, "public/pdfjs");

const DIRECTORIES = ["standard_fonts", "cmaps", "wasm", "iccs"];
const FILES = [["build/pdf.worker.min.mjs", "pdf.worker.min.mjs"]];

await fs.rm(target, { recursive: true, force: true });
await fs.mkdir(target, { recursive: true });

for (const dir of DIRECTORIES) {
  await fs.cp(path.join(source, dir), path.join(target, dir), {
    recursive: true,
  });
}

for (const [from, to] of FILES) {
  await fs.copyFile(path.join(source, from), path.join(target, to));
}

const { version } = JSON.parse(
  await fs.readFile(path.join(source, "package.json"), "utf8")
);
console.log(`pdfjs assets: copied v${version} to public/pdfjs`);
