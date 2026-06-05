import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // MuPDF ships a ~10 MB WASM binary it loads from disk at runtime. Keep it
  // external so Next doesn't try to bundle/transform it; it's required from
  // node_modules as-is (and shipped to Netlify via netlify.toml included_files).
  serverExternalPackages: ["mupdf"],

  // The service worker must never be cached (so updates ship immediately) and
  // must be served as JavaScript on Netlify Edge.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
