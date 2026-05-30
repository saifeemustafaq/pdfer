# Pdfer — Developer Guide

Baseline rules for structure, reuse, and conventions. Follow these unless there's a clear reason to deviate.

---

## 1. Tech stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16 |
| Language | TypeScript (strict mode) | 5 |
| UI | shadcn/ui (base-nova style) + Tailwind CSS | v4 |
| Icons | Lucide React | — |
| Toasts | Sonner | — |
| Theming | `next-themes` (light/dark) | — |
| Font (sans) | Inter (via `next/font/google`) | — |
| PDF operations | `pdf-lib` | — |
| Image normalisation | `sharp` | — |
| File upload UX | `react-dropzone` | — |
| Deployment | Netlify (API routes → Serverless Functions via `@netlify/plugin-nextjs`) | — |

### No database, no auth

Pdfer is a **stateless tool** — there is no user account, no session, and no database. Every operation is a self-contained request: files come in, a processed file comes back. Do not introduce a database or auth layer unless the product fundamentally changes direction.

### Why pure JavaScript (not Python)

All three operations — merge, compress, and image-to-PDF — are handled entirely in Node.js:

- **pdf-lib** handles merging PDFs, embedding JPEG/PNG images as pages, and rewriting PDF structure for compression.
- **sharp** normalises images before embedding (format conversion, EXIF stripping, quality downsampling).
- **No Python microservice.** A separate Python backend (e.g. Render + PyMuPDF) would mean separate deploys, CORS config, cold starts, and no Netlify-native hosting. The JS approach achieves 60–80% size reduction on scan-heavy PDFs — the primary use case — without the operational overhead. If print-quality ghostscript-level compression becomes necessary, a Python microservice can be added in a future sprint without touching the frontend.

---

## 2. Project structure

```
pdfer/
├── app/
│   ├── (marketing)/
│   │   └── page.tsx                    # Landing page — feature cards linking to each tool
│   ├── (tools)/
│   │   ├── layout.tsx                  # Tool shell: top nav (desktop) + bottom tab bar (mobile)
│   │   ├── merge/
│   │   │   ├── page.tsx                # Merge tool: drag PDFs + images, reorder, export
│   │   │   ├── loading.tsx             # Merge skeleton
│   │   │   └── error.tsx               # Merge error boundary
│   │   ├── compress/
│   │   │   ├── page.tsx                # Compress tool: upload PDF, pick quality, download
│   │   │   ├── loading.tsx             # Compress skeleton
│   │   │   └── error.tsx               # Compress error boundary
│   │   └── image-to-pdf/
│   │       ├── page.tsx                # Image-to-PDF tool: upload 1–N images, export as PDF
│   │       ├── loading.tsx             # Image-to-PDF skeleton
│   │       └── error.tsx               # Image-to-PDF error boundary
│   ├── api/
│   │   ├── merge/route.ts              # POST multipart: PDFs + images → merged PDF
│   │   ├── compress/route.ts           # POST multipart: PDF + quality setting → compressed PDF
│   │   └── image-to-pdf/route.ts       # POST multipart: 1–N images → PDF
│   ├── layout.tsx                      # Root layout (fonts, ThemeProvider, Toaster)
│   ├── error.tsx                       # Root error boundary
│   └── globals.css                     # Tailwind v4 + shadcn theme tokens
├── components/
│   ├── ui/                             # shadcn-generated UI primitives (do not modify)
│   ├── top-nav.tsx                     # Desktop navigation bar (Home / Merge / Compress / Image to PDF)
│   ├── mobile-tab-bar.tsx              # Bottom tab bar for mobile (mirrors top nav)
│   ├── file-dropzone.tsx               # react-dropzone wrapper: accepts PDF and/or images, configurable
│   ├── file-list.tsx                   # Drag-to-reorder list of staged files (used by merge + image-to-pdf)
│   ├── quality-slider.tsx              # Compression quality picker (Low / Medium / High)
│   └── download-button.tsx             # Download trigger for processed file blobs
├── hooks/
│   └── use-file-processor.ts           # Generic hook: manages upload state, calls API, returns blob URL
├── lib/
│   ├── utils.ts                        # cn() helper (clsx + tailwind-merge)
│   ├── constants.ts                    # MAX_UPLOAD_BYTES, ACCEPTED_PDF_TYPES, ACCEPTED_IMAGE_TYPES, QUALITY_PRESETS
│   ├── services/
│   │   ├── pdf-merger.ts               # pdf-lib: merge N PDFs and/or images into one PDF
│   │   ├── pdf-compressor.ts           # pdf-lib + sharp: re-encode embedded images at target quality
│   │   └── image-to-pdf.ts             # pdf-lib + sharp: normalise images and write as PDF pages
│   └── file-utils.ts                   # MIME type guards, buffer helpers, filename sanitisation
├── types/
│   └── index.ts                        # Shared TypeScript types (QualityPreset, FileEntry, ProcessResult)
├── proxy.ts                            # Request guard (Next.js 16 convention) — size + MIME validation
├── components.json                     # shadcn configuration
├── netlify.toml                        # Netlify build config + plugin declaration
├── tsconfig.json
├── package.json
└── .env.example                        # Template for any future environment variables
```

### Grouping philosophy

- **Group by domain** (`lib/services/` for PDF operations) rather than only by type.
- **Co-locate** related code. Types, helpers, and sub-components that belong to one feature live with that feature.
- **Don't extract to shared** unless there are **2+ distinct consumers**.

### Keeping the structure diagram current

When you add a new file that introduces a new route, service, or utility module, **update this tree** in the same change. The structure diagram is the first thing a contributor reads — if it's stale, it's useless.

---

## 3. Structure & components

- **One component/feature per file** — Each component or feature lives in its own file. No dumping unrelated UI or logic into a single file.
- **Clear ownership** — Every file has a single, nameable responsibility. Ask: "What is this file's job?"
- **UI components** — Use shadcn/ui as the primary component library. Add components via `npx shadcn@latest add <name>`; customize in `components/ui/`.
- **Do not modify shadcn-generated files** in `components/ui/`. If you need custom behavior, wrap the shadcn component in a new file outside `components/ui/`.

---

## 4. DRY (Don't Repeat Yourself)

- **Reuse first** — Before adding new code, check for existing components, hooks, or utilities you can reuse.
- **Shared code** — Extract only when used by **2+ distinct modules**. If used by one module, keep it in that module.
- **Watch for duplication across API routes.** If `/api/merge` and `/api/compress` both implement the same multipart parsing or size validation, extract it into `lib/file-utils.ts` immediately.
- All three tools (merge, compress, image-to-pdf) share a file-upload interaction. The `FileDropzone` and `FileList` components must be general enough to serve all three — do not fork them per tool.

---

## 5. File size (LOC)

- **Target:** Most source files **<= 300 lines**.
- **LOC is a signal, not the goal** — Going over 300 is allowed when it improves cohesion or readability.
- **Do not split only to hit 300** if the result is worse: more files to open, duplicated types, circular deps, or pass-through wrappers.
- **Heuristic:** If you need to open **3+ files** to understand one flow, you probably split too much.
- **Exception:** shadcn-generated files in `components/ui/` (e.g. `sidebar.tsx`, `chart.tsx`) may exceed 300 lines. Do not refactor them.

---

## 6. When to split a file

Split only when there's a **real boundary**:

- Different responsibilities (e.g. merging logic vs. compression logic vs. image normalisation).
- Stable interfaces (e.g. service vs. API route).
- Reusable component with a clear owner.
- Domain sub-area you can name clearly (e.g. page assembly vs. image downsampling).

Every new file must answer: **"What is its single responsibility?"**

---

## 7. Helpers & shared code

- **Prefer vertical slices over generic helpers** — Avoid `utils/helpers/common/misc` only to move lines out.
- A helper is valid only if it's either:
  - **Domain-specific** (e.g. `lib/file-utils.ts` for MIME guards and buffer helpers), or
  - **Truly general** and used by **2+ distinct modules**.
- **Single consumer** → keep it co-located (same folder or same file).

---

## 8. Naming conventions

| Category | Convention | Examples |
|----------|-----------|----------|
| Files | kebab-case | `pdf-merger.ts`, `image-to-pdf.ts`, `quality-slider.tsx` |
| Components | PascalCase | `FileDropzone`, `MobileTabBar`, `QualitySlider` |
| Functions / variables | camelCase | `mergeFiles`, `compressPdf`, `buildPdfFromImages` |
| Types / interfaces | PascalCase | `FileEntry`, `QualityPreset`, `ProcessResult` |
| Constants | UPPER_SNAKE_CASE | `MAX_UPLOAD_BYTES`, `ACCEPTED_IMAGE_TYPES`, `QUALITY_PRESETS` |

- **Be consistent within a group.** If every service file is named `pdf-<operation>.ts`, new additions must follow the same pattern.

---

## 9. TypeScript & type safety

- **Strict mode is on** (`strict: true` in `tsconfig.json`). Do not weaken it.
- **Avoid `any`** — Use `unknown` and narrow with type guards or assertions. If `any` is truly unavoidable, add an `// eslint-disable` comment with a justification.
- **Prefer `type` over `interface`** unless you need declaration merging. Be consistent within a file.
- **Shared types** live in `types/`. Feature-specific types can be co-located with the feature.

### Type assertion discipline

Do not cast multipart form values or parsed buffers with `as`. Validate at the boundary before using.

```ts
// Bad — trusts raw FormData blindly
const quality = formData.get("quality") as QualityPreset;

// Good — validates before using
const raw = formData.get("quality");
if (!isQualityPreset(raw)) {
  return NextResponse.json({ error: "Invalid quality preset" }, { status: 400 });
}
```

### Explicit return types on service functions

Service functions in `lib/services/` that return `Buffer` or processed file data should have **explicit return type annotations** — especially async ones. This makes the contract obvious without reading the implementation.

---

## 10. Imports

- **Use `@/` for cross-directory imports.** The path alias `@/*` maps to the project root.

  ```ts
  // Good
  import { Button } from "@/components/ui/button";
  import { MAX_UPLOAD_BYTES } from "@/lib/constants";

  // Bad
  import { MAX_UPLOAD_BYTES } from "../../lib/constants";
  ```

- **Relative imports** are fine for files in the **same directory** (e.g. `./types`, `./helpers`).
- **React imports** — Use direct named imports: `import { useState, useCallback } from "react"`. Do not modify shadcn-generated files.
- **`import type`** — Use `import type` when importing only types to keep runtime bundles clean.
- **Limit import sprawl** — If a file has **> ~15 imports** after a refactor, reconsider the structure.

---

## 11. Next.js 16 conventions

This project uses **Next.js 16**, which has breaking changes from earlier versions. Always read the relevant guide in `node_modules/next/dist/docs/` before writing any code.

### Request guard: `proxy.ts`

Next.js 16 replaces `middleware.ts` with `proxy.ts` at the project root. In Pdfer (no auth), `proxy.ts` is used for **request-level validation**:

- Reject API requests that exceed `MAX_UPLOAD_BYTES` before they reach the route handler.
- Allow all page routes and static assets through unconditionally.

**Do not create a `middleware.ts` file.** It is deprecated in Next.js 16.

### Route groups

- `(marketing)` — The landing page. No tool chrome (nav, tab bar).
- `(tools)` — The three tool pages. Shares the `layout.tsx` with persistent navigation.

### API routes

- Use the App Router `route.ts` convention with named `POST` exports.
- No auth check needed (stateless tool). Jump straight to input validation.

### Server components vs. client components

- **Default to server components.** Only add `"use client"` when you need browser APIs, drag-and-drop state, or React hooks (`useState`, `useEffect`, etc.).
- The tool pages (`/merge`, `/compress`, `/image-to-pdf`) are inherently interactive — they will be client components. The landing page and layout shells should be server components.

---

## 12. API route conventions

Every API route handler **must** follow this structure:

```ts
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    // ... validate inputs ...
    // ... call lib/services/ function ...
    return new NextResponse(resultBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${outputName}"`,
      },
    });
  } catch (err) {
    console.error("POST /api/<route> failed:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

### Mandatory rules

1. **Top-level try/catch** — Every exported handler must have a try/catch wrapping the **entire** body.

2. **`catch (err)`** — Always name the catch parameter `err`. Never use an anonymous `catch { }` block except for intentional swallowing, and even then add a comment explaining why.

3. **`console.error` in every catch** — Always log with enough context to identify the route. Include the route path in the log message.

4. **Error shape: `{ error: string }`** — Every error response must use this shape.

   ```ts
   // Bad
   return NextResponse.json({ message: "File too large" }, { status: 413 });

   // Good
   return NextResponse.json({ error: "File exceeds the 50 MB limit" }, { status: 413 });
   ```

5. **No business logic in routes** — Routes orchestrate (parse FormData, validate, call service, return response). PDF manipulation belongs in `lib/services/`. If a route is doing more than ~10 lines of domain logic, move it out.

6. **Validate inputs first** — Check file presence, MIME type, file size, and required parameters before calling any service.

### Binary responses

API routes return binary PDF data directly via `new NextResponse(buffer, { headers: { ... } })`. Do not base64-encode the output — it doubles the payload size for no benefit when the client receives it via `fetch` → `response.blob()`.

---

## 13. File processing conventions

### Service functions

Each operation lives in its own file under `lib/services/`:

| Service | File | Inputs | Output |
|---------|------|--------|--------|
| Merge | `pdf-merger.ts` | `FileEntry[]` (PDFs and/or images) | `Buffer` (PDF) |
| Compress | `pdf-compressor.ts` | `Buffer` (PDF) + `QualityPreset` | `Buffer` (PDF) |
| Image-to-PDF | `image-to-pdf.ts` | `Buffer[]` (images) + ordering | `Buffer` (PDF) |

All service functions must be **pure** with respect to the filesystem — they accept and return `Buffer`, never file paths, never stream side effects.

### Image normalisation with `sharp`

Before embedding any image into a PDF via pdf-lib, always pass it through `sharp`:

```ts
import sharp from "sharp";

const normalised = await sharp(imageBuffer)
  .rotate()              // honour EXIF orientation
  .toFormat("jpeg", { quality: targetQuality })
  .toBuffer();
```

Do this in `lib/services/image-to-pdf.ts` and `lib/services/pdf-compressor.ts`. Never embed raw user-uploaded image bytes directly — EXIF rotation bugs and oversized PNG inputs are the two most common failure modes.

### Compression strategy

`pdf-compressor.ts` achieves size reduction by:

1. Parsing the PDF with `pdf-lib`.
2. Extracting embedded image XObjects.
3. Re-encoding each image with `sharp` at the target JPEG quality.
4. Re-embedding the downsampled images.
5. Saving with `pdf-lib`'s `useObjectStreams: true` option.

The `QualityPreset` maps to concrete `sharp` JPEG quality values defined in `lib/constants.ts`:

```ts
export const QUALITY_PRESETS = {
  low:    { label: "Small file",   jpegQuality: 40 },
  medium: { label: "Balanced",     jpegQuality: 65 },
  high:   { label: "Best quality", jpegQuality: 85 },
} as const;

export type QualityPreset = keyof typeof QUALITY_PRESETS;
```

Never hardcode `40`, `65`, or `85` in service files — always import from `lib/constants.ts`.

### File size limits

The upload cap is defined **once** in `lib/constants.ts` as `MAX_UPLOAD_BYTES` and used in:

- `proxy.ts` (request-level rejection)
- `FileDropzone` component (client-side rejection before upload)
- API route handlers (server-side validation)

Do not duplicate this value.

---

## 14. Error handling

### Server-side

- **Catch variable:** Always name it `err`.
- **Always log:** `console.error` in every catch block in API routes, with the route name as context.
- **Anonymous `catch { }`** — Only acceptable when the error is genuinely irrelevant (e.g. an optional cleanup step). Add a comment: `// Intentionally silent — cleanup failure is non-critical`.

### Client-side

- **Every `fetch` call must handle errors.** After a fetch, check `response.ok` and surface failures via `toast.error(...)` from Sonner.
- **Never silently swallow fetch failures.** The user submitted files — they must know if processing failed.
- **Name the catch variable and log on the client too.** The same rule that applies to API handlers applies to client `try`/`catch`:

  ```ts
  // Bad — variable dropped, no log
  } catch {
    toast.error("Processing failed — please try again");
  }

  // Good
  } catch (err) {
    console.error("POST /api/merge failed:", err);
    toast.error("Processing failed — please try again");
  }
  ```

- **Full fetch pattern:**

  ```ts
  // Bad — user sees nothing on failure
  const res = await fetch("/api/compress", { method: "POST", body: formData });
  const blob = await res.blob();

  // Good
  const res = await fetch("/api/compress", { method: "POST", body: formData });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    toast.error(body.error ?? "Something went wrong");
    return;
  }
  const blob = await res.blob();
  ```

---

## 15. UI & design conventions

- **shadcn/ui is the design system.** Use shadcn components for all standard UI patterns. Do not build custom versions of things shadcn already provides.
- **Icons** — Use **Lucide React only**. Do not use emoji in the UI, copy, or code.
- **Mobile-first** — The app targets both desktop and mobile. Every page must be usable on a phone screen without horizontal scrolling.
- **Navigation pattern:**
  - **Desktop:** persistent horizontal `TopNav` with links to all three tools.
  - **Mobile:** fixed bottom `MobileTabBar` with icon + label for each tool (mirrors the top nav). The tab bar must not obscure page content — account for its height in the tool page layout.
- **Dark mode** — Supported via CSS variables and `next-themes`. The theme tokens are defined in `app/globals.css` using the `oklch` color space. `ThemeProvider` from `next-themes` **must** be mounted in the root `app/layout.tsx`.
- **Loading states** — Every tool route segment must have a `loading.tsx` with shadcn `Skeleton` components.
- **Error states** — Every tool route segment must have an `error.tsx` boundary. The root `app/` must also have a catch-all `error.tsx`.
- **Toasts** — Use Sonner for all user feedback (success, errors, oversized file warnings). The `<Toaster />` is mounted in root `layout.tsx`.
- **Progress feedback** — File processing (especially compression on large PDFs) can take several seconds. Show a loading spinner or progress indicator while the API request is in flight. Never leave the user staring at a frozen button.

---

## 16. Styling approach

- **Tailwind CSS v4** — No `tailwind.config.ts`. Configuration is done via `@theme inline` in `app/globals.css`.
- **shadcn tokens** — All design tokens (colors, radii) are CSS custom properties defined in `globals.css` with light/dark variants. Do not hardcode color values in component code.
- **`cn()` for conditional classes** — Always use `cn()` from `@/lib/utils` for conditional or dynamic class composition. Do not use template literal string interpolation for conditional Tailwind classes.

  ```tsx
  // Bad
  <div className={`border-2 ${isDragging ? "border-primary" : "border-muted"}`}>

  // Good
  <div className={cn("border-2", isDragging ? "border-primary" : "border-muted")}>
  ```

- **Inline styles** — Avoid. Use Tailwind utility classes exclusively. The only exceptions are shadcn-generated files that use inline `style` for CSS variable bridging.

---

## 17. Constants & magic values

- **No magic numbers or strings in business logic.** If a literal value appears in more than one place, or carries domain meaning, extract it into a named constant.
- **Co-locate or centralize** — Single-module constants live at the top of that file. Shared constants go in `lib/constants.ts`.

### Shared constants must be imported, not duplicated

```ts
// Bad — duplicated magic number
// In proxy.ts:
const MAX_BYTES = 50 * 1024 * 1024;
// In components/file-dropzone.tsx:
if (file.size > 50 * 1024 * 1024) { ... }

// Good — single source of truth
// In lib/constants.ts:
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
// Imported everywhere that needs it.
```

### Named constant candidates

Any of these appearing as bare literals should be extracted:

- File size limit (`MAX_UPLOAD_BYTES`)
- JPEG quality values for each preset (`QUALITY_PRESETS`)
- Accepted MIME type lists (`ACCEPTED_PDF_TYPES`, `ACCEPTED_IMAGE_TYPES`)
- Output filename templates
- API route paths (if referenced from multiple client files)

### Environment variables

This project has no required environment variables at launch. If any are added (e.g. a rate-limiting token, a future AI enhancement), they must be:

1. Added to `.env.local` (not committed).
2. Documented in `.env.example` with a placeholder value.

---

## 18. Services & business logic

- **All PDF/image logic lives in `lib/services/`.** Route handlers orchestrate — they do not manipulate buffers, call `pdf-lib`, or invoke `sharp` directly.
- **Pure functions preferred** — Service functions accept buffers and return buffers. No I/O, no side effects, deterministic output.
- **sharp is always the image layer.** Never pass raw image bytes to `pdf-lib` without normalising through `sharp` first. This handles EXIF rotation, format conversion, and quality reduction in one step.

### Processing pipeline for each tool

**Merge (`/api/merge`):**

```
FormData (files[]) → validate MIMEs + sizes → pdf-merger.ts
  → for each file: if PDF, load with pdf-lib; if image, sharp-normalise + embed
  → assemble pages in user-defined order
  → save PDF → return Buffer
```

**Compress (`/api/compress`):**

```
FormData (file, quality) → validate MIME + size + preset → pdf-compressor.ts
  → load PDF with pdf-lib
  → find embedded image XObjects
  → for each image: decode → sharp re-encode at preset JPEG quality
  → re-embed downsampled images
  → save with useObjectStreams: true → return Buffer
```

**Image-to-PDF (`/api/image-to-pdf`):**

```
FormData (files[]) → validate MIMEs + sizes → image-to-pdf.ts
  → for each image: sharp normalise (rotate + toJpeg)
  → create new PDFDocument
  → for each image: embed as full-page
  → save PDF → return Buffer
```

---

## 19. Netlify deployment

- The project deploys to Netlify via `@netlify/plugin-nextjs`. API routes become Netlify Serverless Functions automatically.
- **`netlify.toml`** must declare the plugin and the build command:

  ```toml
  [build]
    command = "npm run build"
    publish = ".next"

  [[plugins]]
    package = "@netlify/plugin-nextjs"
  ```

- **Function size limit** — Netlify Serverless Functions have a 50 MB bundle size limit. `sharp` ships native binaries; verify the Netlify build pipeline resolves the correct Linux binary. If a deploy fails with a missing native module, consult the `sharp` [installation guide for AWS Lambda / Netlify](https://sharp.pixelplumbing.com/install#aws-lambda).
- **Request payload limit** — Netlify's default request body limit is 6 MB for Serverless Functions. To handle larger PDFs, the function must be configured as a [Netlify Background Function](https://docs.netlify.com/functions/background-functions/) or the `netlify.toml` must raise the body size limit. Document the chosen approach here when implemented.
- **No persistent storage** — Functions are stateless. Processed files are returned directly in the response. Do not write to the filesystem inside a function.

---

## 20. Client-side file handling

- **`react-dropzone`** is the sole file input mechanism. Do not use `<input type="file">` directly — all file selection goes through `FileDropzone`.
- **`FileDropzone`** accepts a `accept` prop (MIME type map), a `maxSize` prop (set to `MAX_UPLOAD_BYTES`), and an `onDrop` callback. The component is **not** tool-specific — configure it via props.
- **`FileList`** renders the list of staged files with drag-to-reorder (for merge and image-to-pdf). It emits an `onReorder` callback with the new ordered array. It is **not** tool-specific.
- **Download flow** — On successful API response, call `response.blob()`, create an object URL via `URL.createObjectURL`, and trigger a synthetic `<a download>` click. Release the object URL with `URL.revokeObjectURL` after the click fires.

  ```ts
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = outputFilename;
  a.click();
  URL.revokeObjectURL(url);
  ```

---

## 21. Exports

- **`export default`** — Only for Next.js pages, layouts, loading, and error files (required by the framework).
- **Named exports everywhere else** — Components, hooks, utilities, types, constants.

---

## Quick checklist

| Do | Don't |
|----|-------|
| One clear responsibility per file | Split only to hit 300 LOC |
| Reuse `FileDropzone` and `FileList` across all three tools | Fork per-tool copies of shared upload components |
| All PDF/image logic in `lib/services/` | Put `pdf-lib` or `sharp` calls inside route handlers or components |
| Always normalise images through `sharp` before embedding | Pass raw user-uploaded bytes directly to `pdf-lib` |
| Return binary PDF as `new NextResponse(buffer, { ... })` | Base64-encode PDF output in API responses |
| Define `MAX_UPLOAD_BYTES` and `QUALITY_PRESETS` once in `lib/constants.ts` | Duplicate size limits or quality values across files |
| Import constants with `@/lib/constants` everywhere they're needed | Hardcode `50 * 1024 * 1024` in multiple files |
| Follow naming conventions (kebab-case files, PascalCase types) | Invent new naming patterns per file |
| Use `@/` for cross-directory imports | Use deep relative paths (`../../..`) |
| Avoid `any`; use `unknown` + narrowing | Use `as SomeType` on raw FormData or parsed buffers |
| Validate MIME type + file size before calling any service | Trust client-provided file type without server-side checks |
| Use shadcn/ui and Lucide React for all UI | Use emoji or ad-hoc icon libraries |
| Wrap every API handler in top-level try/catch | Leave routes without error handling |
| Name catch variable `err`; always `console.error` | Use anonymous `catch { }` without logging |
| Name + log in client-side `catch (err)` blocks too | Use anonymous `catch {}` in React fetch handlers |
| Return `{ error: string }` for all API error responses | Use `{ message }` or `{ success: false }` shapes |
| Show a loading indicator while API calls are in flight | Leave users staring at a frozen submit button |
| Surface all fetch failures via `toast.error()` | Silently swallow failed network requests |
| Mount `ThemeProvider` in root layout | Rely on `useTheme()` without a provider |
| Add `loading.tsx` + `error.tsx` for every tool route segment | Skip loading/error states for tool pages |
| Use `proxy.ts` for request-level validation (Next.js 16) | Use `middleware.ts` (deprecated in Next.js 16) |
| Use named exports; `export default` only for pages | Default-export components or utilities |
| Use `cn()` for conditional Tailwind classes | Use template literal interpolation for class names |
| Keep `netlify.toml` and `.env.example` up to date | Deploy without documenting config requirements |
| Read `node_modules/next/dist/docs/` for Next.js 16 APIs | Assume Next.js conventions from older versions |

---

*Keep this guide open when making structure or refactor decisions.*
