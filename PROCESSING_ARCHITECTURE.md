# Pdfer — Processing Architecture (Hybrid Local / Server)

> **Status: hybrid routing implemented** for merge, compress, and image-to-PDF via `lib/processing/orchestrator.ts`. **Edit PDF** (`/edit-pdf`), PDF-to-image, and merge page editing are browser-only. Image-to-PDF supports **native** or **fit-to-page** layout (`lib/image-pdf-layout.ts`). Merge and image-to-PDF accept JPEG, PNG, WebP, and HEIC (HEIC uses `heic2any` locally when over 6 MB). Compare-all-presets and user preference toggles remain backlog (Sprint 6).

This document describes the planned **hybrid processing model** for Pdfer: when work runs in the user's browser vs on Netlify serverless functions, how the app chooses between them, and how compress preview (all three quality presets with sizes before download) fits in.

Read this before implementation. It pairs with [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) (code structure) and [DESIGN_GUIDE.md](DESIGN_GUIDE.md) (UI patterns).

---

## 1. Goals and non-goals

### Goals

1. **Informed compress decisions** — Users see original size and outcome size for **low / medium / high** before committing to a download.
2. **Public-scale reliability** — Avoid Netlify timeouts, response-size limits, and CPU abuse when traffic grows.
3. **Privacy by default** — Prefer local processing so files never leave the device unless necessary.
4. **Graceful degradation** — If local processing fails (memory, format, timeout), offer a clear server fallback (or the reverse when server fails).
5. **Transparent routing** — User always knows *where* processing happened (local vs server) and *why*.

### Non-goals (for initial hybrid release)

- No user accounts, sessions, or stored files on server.
- No Python / Ghostscript microservice (future option only).
- No guaranteed identical bytes between local and server output (canvas JPEG ≠ sharp mozjpeg; close enough for utility use).
- No automatic silent retry on *both* paths for every request (avoid 2× cost/latency).

---

## 2. Current state (baseline)

| Tool | Processing location | Libraries | API route |
|------|---------------------|-----------|-----------|
| Merge — combine files | **Server** | `pdf-lib`, `sharp` | `POST /api/merge` |
| Merge — reorder / remove / rotate pages | **Local** | `pdf-lib` (`lib/pdf-client.ts`) | — |
| Edit PDF — reorder / remove / rotate | **Local** | `pdf-lib`, `pdfjs-dist` (thumbs) | — |
| Compress — single preset | **Hybrid** | `pdf-lib`, `sharp` / worker | `POST /api/compress` |
| Image → PDF | **Hybrid** | `pdf-lib`, `sharp` / worker, layout options | `POST /api/image-to-pdf` |
| PDF → image (ZIP) | **Local** | `pdfjs-dist`, `jszip` | — |

### Current constraints

| Constraint | Value | Affects |
|------------|-------|---------|
| Netlify request body limit | **6 MB** | All server uploads (`proxy.ts`, API routes) |
| Netlify function timeout | ~**10–26 s** (tier-dependent) | Heavy compress / merge |
| Server response size | ~**6 MB** practical cap | Returning multiple PDFs in one response |
| Browser memory | Device-dependent | Large PDFs, triple compress locally |

### Why server exists today

**`sharp`** is Node-only. It handles EXIF rotation, format conversion (HEIC, WebP, etc.), and JPEG recompression. **`pdf-lib`** runs in both browser and Node; the server is not required for PDF structure work alone.

---

## 3. Target architecture overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        Tool UI (React)                           │
│  merge · compress · image-to-pdf · pdf-to-image                  │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│              ProcessingOrchestrator (client)                     │
│  1. Preflight (metadata, size, MIME, device hints)               │
│  2. ProcessingRouter.decide() → local | server | local-first   │
│  3. Show badge + reason to user                                  │
└──────────────┬─────────────────────────────┬─────────────────────┘
               │                             │
               ▼                             ▼
┌──────────────────────────┐   ┌──────────────────────────────────┐
│   Local pipeline         │   │   Server pipeline                │
│   Web Worker (preferred) │   │   POST /api/* (Netlify)          │
│   pdf-lib, pdfjs, canvas │   │   pdf-lib, sharp                 │
└──────────────┬───────────┘   └────────────────┬─────────────────┘
               │                                 │
               └────────────┬────────────────────┘
                            ▼
              Unified result types (same shape for UI)
```

### Design principles

1. **One orchestrator per tool** — UI never calls `/api/*` or workers directly; it calls `processMerge()`, `processCompressCompare()`, etc.
2. **Same result contract** — Local and server return identical TypeScript types so cards, progress, and download logic are shared.
3. **Router is pure** — `decide(context) → { mode, reason, warnings }` with no side effects; easy to unit test.
4. **Workers for heavy work** — Merge, compress, and image→PDF on local path run off the main thread.
5. **Fail once, fallback once** — Local failure → offer server retry (if eligible); server failure → offer local retry (if eligible).

---

## 4. Processing modes

| Mode | Description |
|------|-------------|
| `local` | All work in browser (Web Worker). File never uploaded. |
| `server` | Upload to Netlify function; `sharp` available. |
| `local-first` | Try local; on specific errors (OOM, timeout, unsupported), prompt server fallback. |
| `server-first` | Rare; e.g. HEIC-only batch where server is clearly better (optional). |

User preference (stored in `localStorage`) can force `local`, `server`, or `auto` (default).

---

## 5. Routing decision logic

### 5.1 Hard rules (no scoring)

These override the score matrix.

| Operation | Condition | Route |
|-----------|-----------|-------|
| PDF → image | Always | **local** |
| Merge — page reorder/remove | Always | **local** (already after merge blob exists) |
| Any | `totalBytes > MAX_SERVER_UPLOAD_BYTES` (6 MB) | **local only** (server ineligible) |
| Any | `totalBytes ≤ 6 MB` | Router chooses local or server (Auto) |
| Any | Local fails and `≤ 6 MB` | Offer **server fallback** once |
| Any | Local fails and `> 6 MB` | No server fallback; show **split files** guidance |
| Any | User pref `always-local` | **local** (fail with message if impossible) *(deferred: Sprint 6)* |
| Any | User pref `always-server` | **server** (fail if over limit) *(deferred: Sprint 6)* |
| Image → PDF | MIME ∈ `{jpeg, png}` | **local** if browser can decode |
| Image → PDF | MIME ∈ `{heic, tiff, avif}` | **server** only if `≤ 6 MB`; else error with guidance |

### 5.2 Soft scoring (when hard rules don't apply)

Build a numeric **server score**. Higher → prefer server.

```ts
type RoutingContext = {
  operation: "merge" | "compress" | "compress-compare" | "image-to-pdf";
  totalBytes: number;
  fileCount: number;
  pageCount?: number;           // from preflight
  embeddedImageRatio?: number;    // 0–1, image bytes / file size
  mimeTypes: string[];
  deviceMemoryGb?: number;        // navigator.deviceMemory
  hardwareConcurrency?: number;
  isMobile: boolean;
  userPreference: "auto" | "local" | "server";
};

// Example weights (tune with real metrics)
function scoreServer(ctx: RoutingContext): number {
  let score = 0;

  if (ctx.totalBytes > 4 * 1024 * 1024) score += 2;
  else if (ctx.totalBytes > 2 * 1024 * 1024) score += 1;

  if (ctx.pageCount && ctx.pageCount > 40) score += 1;
  if (ctx.fileCount > 10) score += 1;

  if (ctx.deviceMemoryGb !== undefined && ctx.deviceMemoryGb < 4) score += 2;
  if (ctx.isMobile) score += 1;

  // Exotic formats in merge/image tools
  if (ctx.mimeTypes.some((m) => /heic|tiff|avif/.test(m))) score += 2;

  // Text-heavy PDF: compression barely helps; prefer local (privacy, no upload)
  if (ctx.operation.startsWith("compress") && ctx.embeddedImageRatio !== undefined) {
    if (ctx.embeddedImageRatio < 0.1) score -= 2;
  }

  if (ctx.userPreference === "server") score += 3;
  if (ctx.userPreference === "local") score -= 3;

  return score;
}

// Threshold: score >= 3 → server, else local (with local-first fallback enabled)
```

**Default threshold:** `score >= 3` → `server`, else `local` with `local-first` fallback.

### 5.3 Preflight (before routing)

Cheap inspection run on the client immediately after file drop:

| Signal | How | Used for |
|--------|-----|----------|
| File size / count | `File` API | Hard cap, scoring |
| MIME types | `file.type` | Hard rules |
| Page count | `pdf-lib` or `pdfjs` load metadata | Scoring, UX copy |
| Embedded image ratio | Parse PDF, sum image stream lengths / file size | Compress UX (“limited savings”), scoring |
| Encryption | `pdf-lib` load | Early error |

Preflight must complete in **< 500 ms** for typical files so routing feels instant.

---

## 6. Per-operation design

### 6.1 Compress (primary product improvement)

#### User story

After dropping a PDF, user sees **three cards** (Small file / Balanced / Best quality), each showing:

- Compressed size (exact after processing)
- % saved vs original
- Optional note: “Mostly text — limited compression”

User selects one card → download that PDF (no second compression pass).

#### Pipelines

**Local (`compress-compare` in Worker)**

1. Load PDF once with `pdf-lib`.
2. For each preset (`low` 40, `medium` 65, `high` 85 JPEG quality):
   - Clone document state or reapply image re-encode pass.
   - Re-encode embedded JPEG/JPX streams via **canvas** (`decode → canvas → toBlob('image/jpeg', q)`).
   - Save to `Uint8Array`; record byte length.
3. Post progress messages: `{ preset, bytes, progress }`.
4. Return `{ originalSize, presets: { low, medium, high: { blob, size, savingsPercent } } }`.

**Server (`POST /api/compress/compare`)**

1. Accept single PDF (multipart).
2. Load once; run `compressPdf` three times (existing `lib/services/pdf-compressor.ts`) or refactor to shared inner loop.
3. Return either:
   - **Option A (preferred):** ZIP containing `low.pdf`, `medium.pdf`, `high.pdf` + `manifest.json` with sizes.
   - **Option B:** JSON sizes only + separate download endpoint (requires re-compress or server-side cache — **avoid** for stateless design).

**Option A** matches stateless Netlify and lets the client show exact sizes and hold blobs for instant download.

#### Routing for compress

| Profile | Typical route |
|---------|----------------|
| Desktop, ≤ 3 MB, image-heavy | **local** |
| Desktop, 3–6 MB | **local-first** (warn) or **server** if `deviceMemory < 4` |
| Mobile, ≤ 2 MB | **local** with progress |
| Mobile, > 2 MB | **server** |
| Text-only PDF (`embeddedImageRatio < 0.1`) | **local**; show honest “minimal savings” copy; still run compare but set expectations |

#### Timeout / memory guards (local)

- Worker wall-clock timeout (e.g. 60 s); on timeout → offer server.
- Catch OOM / allocation errors → offer server.
- Cap concurrent preset work (sequential presets if memory pressure detected).

---

### 6.2 Merge (combine files)

#### Current

Server merges files → local page grid for reorder/remove.

#### Target

**Local-first merge** in Worker:

1. For each file in order: PDF → `copyPages`; image → canvas normalize → `embedJpg` → page.
2. Output merged `Blob`.
3. Existing `PageGrid` + `reorderPdfPages` unchanged (already local).

**Server fallback** when:

- Total size > 4 MB and mobile, or
- HEIC/TIFF in file list and browser decode fails preflight, or
- Local merge throws.

#### Routing

| Profile | Route |
|---------|-------|
| ≤ 3 MB, JPEG/PNG/PDF only | **local** |
| HEIC/TIFF present | **server** or **local-first** if `createImageBitmap` succeeds |
| > 5 MB | **server** on low-memory devices; **local-first** on desktop |

---

### 6.3 Image → PDF

#### Target

**Default local** for JPEG, PNG, WebP using Worker + `pdf-lib` + canvas (EXIF via browser / `createImageBitmap`).

**Server** only for formats `sharp` handles and browser cannot (HEIC, some TIFF).

Same sortable file list UX; processing moves from API call to orchestrator.

---

### 6.4 PDF → image

**Always local** — no change. Already uses `pdfjs-dist` + JSZip. Router returns `local` with no upload.

---

## 7. Unified result types

Shared between local and server so UI components stay dumb.

```ts
type ProcessingMode = "local" | "server";
type QualityPreset = "low" | "medium" | "high";

type RoutingDecision = {
  mode: ProcessingMode;
  reason: string;           // Human-readable, shown in UI badge
  warnings: string[];       // e.g. "Mostly text — expect minimal compression"
};

type CompressPresetResult = {
  preset: QualityPreset;
  label: string;
  sizeBytes: number;
  savingsPercent: number;
  blob: Blob;
};

type CompressCompareResult = {
  originalSizeBytes: number;
  pageCount: number;
  embeddedImageRatio: number;
  presets: CompressPresetResult[];
  mode: ProcessingMode;
};

type MergeResult = {
  blob: Blob;
  mode: ProcessingMode;
};

type ImageToPdfResult = {
  blob: Blob;
  mode: ProcessingMode;
};
```

---

## 8. API changes (server path)

### New endpoints

| Route | Purpose |
|-------|---------|
| `POST /api/compress/compare` | One PDF in → ZIP out (3 PDFs + manifest) |
| `POST /api/merge` | Keep; unchanged until local merge ships |
| `POST /api/image-to-pdf` | Keep as fallback |

### Deprecation path

When local merge and image→PDF are stable:

- API routes remain as **fallback only** (not removed immediately).
- Document in UI: “Server processing used as fallback.”

### `manifest.json` (inside compare ZIP)

```json
{
  "originalSizeBytes": 2457600,
  "pageCount": 12,
  "presets": {
    "low":    { "sizeBytes": 890000, "savingsPercent": 64 },
    "medium": { "sizeBytes": 1200000, "savingsPercent": 51 },
    "high":   { "sizeBytes": 1800000, "savingsPercent": 27 }
  }
}
```

---

## 9. Client module layout (proposed)

```
lib/
├── processing/
│   ├── router.ts              # decide(context) → RoutingDecision
│   ├── preflight.ts           # PDF metadata, image ratio, page count
│   ├── orchestrator.ts        # processCompressCompare(), processMerge(), …
│   ├── types.ts               # Unified result types
│   ├── local/
│   │   ├── worker.ts          # Worker entry (or workers/compress.worker.ts)
│   │   ├── compress.ts        # Triple-preset compare (canvas JPEG)
│   │   ├── merge.ts           # pdf-lib merge + image embed
│   │   └── image-to-pdf.ts
│   └── server/
│       ├── compress-compare.ts  # fetch /api/compress/compare
│       ├── merge.ts
│       └── image-to-pdf.ts
├── pdf-client.ts              # Existing: reorderPdfPages, removePages
├── pdf-export.ts              # Existing: PDF → image ZIP
├── services/                  # Existing server-only (sharp) — unchanged
└── constants.ts               # MAX_UPLOAD_BYTES, QUALITY_PRESETS, …

workers/                       # Optional separate bundle targets
├── compress.worker.ts
└── merge.worker.ts
```

UI imports only from `orchestrator.ts`, never from `/api/*` or workers directly.

---

## 10. UX and transparency

### Processing badge

Show on every tool while working and on result:

| Mode | Badge | Subtext example |
|------|-------|-----------------|
| Local | **On your device** | “Your file is not uploaded.” |
| Server | **On server** | “Uploaded for processing — not stored.” |

### Compress-specific UI

```
Original · 2.4 MB · 12 pages · 8 embedded images

┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Small file      │ │ Balanced ✓      │ │ Best quality    │
│ 820 KB  −66%    │ │ 1.1 MB  −54%    │ │ 1.4 MB  −42%    │
│ [Download]      │ │ [Download]      │ │ [Download]      │
└─────────────────┘ └─────────────────┘ └─────────────────┘

Processing on your device · Done
```

States per card: `pending` → `processing` → `ready` | `failed`.

If text-heavy: banner — “This PDF is mostly text. Compression may save less than 10%.”

### Settings (optional, Phase 4)

Footer or settings popover:

- Processing: **Auto** | Always on device | Always on server

---

## 11. Fallback and error handling

```
try local (if routed local or local-first)
  → success: return result
  → failure: classify error
       OOM | timeout | unsupported format → offer server retry
       corrupt PDF → show error, no retry
try server (if routed server or user accepts fallback)
  → success: return result
  → failure: offer local retry if eligible, else show error
```

| Error | User message | Retry |
|-------|--------------|-------|
| Local timeout | “This file is large for your browser.” | Server |
| Local OOM | Same | Server |
| Server 413 | “File too large — 6 MB limit.” | None |
| Server timeout | “Server processing timed out.” | Local (desktop only) |
| Encrypted PDF | “Password-protected PDFs are not supported.” | None |
| Text-only, no savings | “Already optimized — sizes may barely change.” | None (still show compare) |

Always log `{ operation, mode, fileSize, error }` to console; optional anonymous telemetry later.

---

## 12. Security and public launch

| Topic | Approach |
|-------|----------|
| **Privacy copy** | Default local; server only when needed; never stored |
| **Rate limiting** | Server routes: IP-based limit (e.g. 20 req / hour / IP) via Netlify edge or middleware |
| **Abuse** | 6 MB cap; consider CAPTCHA on server if abused |
| **CORS** | Same-origin only for API |
| **No persistence** | No S3, no temp files on server beyond request lifetime |
| **User trust** | Badge + link to short privacy note on compress/merge |

---

## 13. Performance expectations (rough)

| Scenario | Local (desktop) | Server |
|----------|-----------------|--------|
| 1 MB, 10 pages, image-heavy, 3 presets | 5–15 s | 8–20 s |
| 5 MB, 30 pages, scan PDF, 3 presets | 20–60 s (risk OOM) | 15–25 s (timeout risk) |
| Text-only 2 MB | 2–5 s (minimal change) | 3–8 s |

Triple preset is **~3×** single compress CPU. Sequential preset execution in Worker reduces peak memory vs parallel.

---

## 14. Phased implementation plan

### Phase 0 — Documentation and types (no behavior change)

- [ ] Add `lib/processing/types.ts` and `router.ts` (decision only, logged to console).
- [ ] Add preflight helper (page count, image ratio).
- [ ] Update landing trust copy to mention hybrid model (when shipped).

### Phase 1 — Compress compare (highest user value)

- [ ] Local Worker: triple-preset compress + unified result type.
- [ ] Server: `POST /api/compress/compare` → ZIP + manifest.
- [ ] New compress UI: three cards with sizes, routing badge, fallback.
- [ ] Keep old single-preset API temporarily or remove after parity.

### Phase 2 — Local merge + image→PDF

- [ ] Worker merge pipeline; orchestrator routes merge.
- [ ] Worker image→PDF for JPEG/PNG/WebP.
- [ ] Server fallback wired in orchestrator.

### Phase 3 — Remove hot-path server dependency

- [ ] Default all tools to local on desktop.
- [ ] Server = fallback only; monitor error rates.

### Phase 4 — Polish

- [ ] User preference: Auto / Local / Server.
- [ ] Optional lightweight analytics (route chosen, success/fail, no file content).
- [ ] Tune score weights from real data.

---

## 15. Open decisions (for you to choose before build)

1. **Compare ZIP vs three parallel API calls** — ZIP recommended (one upload, one download).
2. **Auto server threshold** — Is `score >= 3` acceptable, or prefer local until 4 MB always?
3. **Mobile default** — Always server for compress > 2 MB, or always try local-first?
4. **User setting in v1** — Ship without preference toggle first?
5. **Keep `/api/compress` single-preset** — Remove or keep for simpler clients?
6. **Worker bundling** — Next.js `worker` loader vs separate `public/*.worker.js` (pdf.worker pattern).
7. **Trust section on homepage** — Update “processed on server” to “processed on your device by default” when Phase 1 ships.

---

## 16. Success metrics

| Metric | Target |
|--------|--------|
| Compress compare success rate | > 95% on files < 3 MB |
| Server fallback rate | < 30% of compress jobs (most stay local) |
| Server timeout rate | < 2% |
| Local OOM + successful server fallback | > 80% of OOM cases recover |
| User sees size before download | 100% on successful compare |

---

## 17. Summary

Pdfer should move from **server-only processing** to a **hybrid model**:

- **Router** chooses local vs server using operation, size, PDF content, device hints, and user preference.
- **Compress** becomes **compare-all-three-then-pick** with exact sizes on both paths.
- **Local** handles most traffic (privacy, scale); **Netlify** handles heavy or exotic cases.
- **One orchestrator and one result shape** keep the UI simple and testable.

After you read this, decide:

1. Which **phase** to start with (recommended: **Phase 1 — compress compare**).
2. Answers to **Section 15** open decisions.
3. Whether to update **DEVELOPER_GUIDE.md** stack section (hybrid, not server-only) when implementation begins.

---

*Last updated: planning draft — not yet implemented.*
