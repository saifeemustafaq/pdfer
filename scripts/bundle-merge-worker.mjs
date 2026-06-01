import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

await esbuild.build({
  entryPoints: [path.join(root, "lib/processing/worker/merge.worker.ts")],
  outfile: path.join(root, "public/workers/merge.worker.mjs"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2020",
  alias: {
    "@": root,
  },
  logLevel: "info",
});
