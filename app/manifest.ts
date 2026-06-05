import type { MetadataRoute } from "next";

// Brand colors mirror the --primary / --background tokens in app/globals.css.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pdfer",
    short_name: "Pdfer",
    description:
      "Free PDF tools that respect your privacy. Merge, split, compress, convert, edit, and unlock PDFs.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: "#C15F3C",
    background_color: "#FAFAF7",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
