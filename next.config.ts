import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // MuPDF ships a ~10 MB WASM binary it loads from disk at runtime. Keep it
  // external so Next doesn't try to bundle/transform it; it's required from
  // node_modules as-is (and shipped to Netlify via netlify.toml included_files).
  serverExternalPackages: ["mupdf"],
};

export default nextConfig;
