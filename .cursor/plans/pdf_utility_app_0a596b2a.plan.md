---
name: PDF Utility App
overview: Build a complete PDF utility app (merge, compress, image-to-PDF) on top of the existing Next.js 16 + Tailwind v4 project, using pdf-lib + sharp for all processing, shadcn/ui for a polished mobile-first interface, and deploying to Netlify.
todos:
  - id: setup-shadcn
    content: Install all dependencies (pdf-lib, sharp, react-dropzone, dnd-kit, sonner) and initialise shadcn/ui with required components
    status: completed
  - id: scaffold-layout
    content: Build root layout with metadata, Toaster, and the Nav component (desktop top bar + mobile bottom tabs)
    status: completed
  - id: build-landing
    content: Build the home page with three feature cards linking to each tool
    status: completed
  - id: build-lib
    content: Implement lib/pdf.ts with mergePdfs, compressPdf, and imagesToPdf server-only functions
    status: completed
  - id: build-api-routes
    content: Implement the three API route handlers (merge, compress, image-to-pdf) that parse multipart form data and call lib/pdf.ts
    status: completed
  - id: build-merge-page
    content: "Build /merge page: file drop zone, sortable file list (PDFs + images), merge button, download"
    status: completed
  - id: build-compress-page
    content: "Build /compress page: single PDF drop, quality slider (3 presets), file size before/after display, download"
    status: completed
  - id: build-image-to-pdf-page
    content: "Build /image-to-pdf page: image drop zone, reorderable list, convert button, download"
    status: completed
  - id: netlify-config
    content: Add netlify.toml and install @netlify/plugin-nextjs for deployment
    status: completed
isProject: false
---

# PDF Utility App — Build Plan

## Stack Summary

- **Framework**: Next.js 16 App Router (existing)
- **Styling**: Tailwind v4 + shadcn/ui (to be initialised)
- **PDF processing**: `pdf-lib` (merge, create, optimise) + `sharp` (image normalisation + recompression)
- **UX**: `react-dropzone` (file upload), `@dnd-kit/sortable` (drag-to-reorder)
- **Notifications**: `sonner` (via shadcn)
- **Hosting**: Netlify (Next.js API routes → Netlify Functions automatically via `@netlify/plugin-nextjs`)

## File Structure

```
app/
  layout.tsx                ← root layout: nav + font + metadata
  page.tsx                  ← landing page with 3 feature cards
  merge/page.tsx            ← Merge tool page
  compress/page.tsx         ← Compress tool page
  image-to-pdf/page.tsx     ← Image-to-PDF tool page
  api/
    merge/route.ts          ← POST multipart → merged PDF blob
    compress/route.ts       ← POST multipart → compressed PDF blob
    image-to-pdf/route.ts   ← POST multipart → PDF blob

components/
  nav.tsx                   ← desktop top bar + mobile bottom tab bar
  file-drop-zone.tsx        ← reusable drag-drop upload area
  sortable-file-list.tsx    ← dnd-kit drag-to-reorder list
  tool-card.tsx             ← feature card on home page
  download-button.tsx       ← triggers blob download

lib/
  pdf.ts                    ← server-only: all pdf-lib + sharp logic
  utils.ts                  ← cn() and shared helpers

netlify.toml                ← Netlify build config
```

## Routes

```
/                 Home — 3 feature cards linking to each tool
/merge            Merge: drop PDFs + images, reorder, download
/compress         Compress: drop PDF, pick quality preset, download
/image-to-pdf     Convert: drop images, reorder, download as PDF
```

## Navigation

- **Desktop**: fixed top header with logo + 3 nav links
- **Mobile**: sticky bottom tab bar with icons (Home / Merge / Compress / Convert)
- Active route highlighted via `usePathname()`

## API Design

All three endpoints accept `multipart/form-data` via `POST` and return `application/pdf`.

```
POST /api/merge
  files[]: (PDF | JPEG | PNG)[]  → merged PDF

POST /api/compress
  file: PDF, quality: "low"|"medium"|"high"  → compressed PDF

POST /api/image-to-pdf
  images[]: (JPEG | PNG)[]  → PDF with one page per image
```

Processing lives entirely in `lib/pdf.ts` (server-only), keeping route handlers thin.

## Key Library Behaviours

- **Merge**: iterate `files[]`; for PDFs use `pdf-lib`'s `PDFDocument.load` + `copyPages`; for images use `embedJpg`/`embedPng` + `addPage` sized to the image dimensions.
- **Compress**: load PDF, extract all embedded image XObjects, recompress each with `sharp` at quality preset (low=40, medium=65, high=80), write back, save with `useObjectStreams: true`.
- **Image-to-PDF**: `sharp` normalises each image (strips EXIF, converts non-JPEG/PNG formats to JPEG), then embeds into a new `PDFDocument` with pages sized to each image.

## Netlify Constraints

Netlify Function request body limit is **6 MB**. The UI will show a clear warning when total upload size approaches 5 MB and block submission above 6 MB client-side.

## Dependencies to Install

```
pdf-lib sharp react-dropzone @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities sonner
```

Plus shadcn/ui initialisation (`npx shadcn@latest init`) and shadcn components: `button card badge progress separator slider toast`.

## Netlify Config (`netlify.toml`)

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```
