# Hybrid Processing Sprint Plan

Step-by-step implementation plan to enable PDF operations **beyond the 6 MB Netlify upload limit** by routing large jobs to **local (browser) processing**, while keeping the existing server path for smaller jobs and as fallback.

Pairs with:

- [PROCESSING_ARCHITECTURE.md](PROCESSING_ARCHITECTURE.md) (design reference)
- [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) (code conventions)
- [DESIGN_GUIDE.md](DESIGN_GUIDE.md) (UI copy and patterns)

**Status:** Sprints 0–5 implemented. Sprint 6 backlog remains (compare-3 presets, user prefs, router tuning).

---

## 1. Goal

| Today | Target |
|-------|--------|
| Merge/image-to-PDF **total > 6 MB** → button disabled, job blocked | **Local processing** runs in the browser; user can complete the job |
| All merge/compress/image-to-PDF → server only | **Router** picks `local` or `server` per job |
| User unaware where processing runs | Badge: **"On your device"** / **"On server"** + short reason |

**Primary success criterion (Sprint 3):** Merge **5 × 2 MB PDFs (10 MB total)** completes on desktop without uploading to Netlify.

**Out of scope for initial sprints (defer):**

- Compress compare-all-3-presets UI (separate sprint backlog)
- User preference toggle (Auto / Local / Server)
- Chunked uploads / blob storage
- Python / Ghostscript service

---

## 2. Policy change (must adopt before coding)

`PROCESSING_ARCHITECTURE.md` §5.1 currently says `> 6 MB` → **reject both paths**. **Replace with:**

| Condition | Route |
|-----------|--------|
| `totalBytes > MAX_SERVER_UPLOAD_BYTES` (6 MB) | **Local only** (server ineligible) |
| `totalBytes ≤ 6 MB` | Router chooses local or server (Auto) |
| Local fails (OOM, timeout) and `≤ 6 MB` | Offer **server fallback** once |
| Local fails and `> 6 MB` | No server fallback; show **split files** guidance |

Add to `lib/constants.ts`:

```ts
/** Max upload for Netlify API routes (unchanged). */
export const MAX_SERVER_UPLOAD_BYTES = 6 * 1024 * 1024;

/** Alias kept for backward compatibility during migration. */
export const MAX_UPLOAD_BYTES = MAX_SERVER_UPLOAD_BYTES;

/** Soft warning when local jobs may be slow (optional, tune after your testing). */
export const LOCAL_SIZE_WARN_BYTES = 15 * 1024 * 1024;
```

Server validation in `proxy.ts` and API routes **stays at 6 MB**. Only the **client** stops blocking large jobs when local is selected.

---

## 3. Target module layout

Follow [DEVELOPER_GUIDE.md §2](DEVELOPER_GUIDE.md#2-project-structure). Update the tree in the same PR as each sprint.

```
lib/processing/
├── types.ts                 # ProcessingMode, RoutingDecision, MergeResult, …
├── preflight.ts             # page count, MIME list, encryption check, totals
├── router.ts                # decide(context) → local | server | local-only
├── orchestrator.ts          # processMerge(), processImageToPdf(), processCompress()
├── errors.ts                # LocalProcessingError, isOomError(), …
├── local/
│   ├── merge.ts             # browser merge (pdf-lib + canvas for images)
│   ├── image-to-pdf.ts      # browser images → PDF
│   └── compress.ts          # browser compress (canvas JPEG re-encode) [Sprint 5]
├── server/
│   ├── merge.ts             # fetch POST /api/merge
│   ├── image-to-pdf.ts      # fetch POST /api/image-to-pdf
│   └── compress.ts          # fetch POST /api/compress
└── worker/
    ├── client.ts            # postMessage wrapper, progress, timeout
    └── merge.worker.ts      # Worker entry (Sprint 1); add more workers later

components/
├── processing-badge.tsx     # "On your device" / "On server"
└── processing-fallback.tsx  # Optional retry UI after failure [Sprint 6]

public/workers/
└── merge.worker.mjs         # Built or copied worker bundle (see Sprint 1)
```

**Rules from DEVELOPER_GUIDE:**

- UI calls **`orchestrator` only**, not `/api/*` or workers directly.
- **`lib/services/*`** stays server-only; do not import `sharp` in client/worker code.
- Named exports everywhere except Next.js pages.
- **`catch (err)`** + `console.error` on client and server.
- User-facing strings: **no em dashes** (§15 / DESIGN_GUIDE §4.5).

---

## 4. Routing rules (v1 defaults)

Ship these defaults; tune after your testing.

### Hard rules

| Operation | Condition | Mode |
|-----------|-----------|------|
| PDF → image | always | `local` |
| Merge page edit | always | `local` (unchanged) |
| Any | `totalBytes > MAX_SERVER_UPLOAD_BYTES` | **`local`** (server not allowed) |
| Image → PDF | JPEG, PNG only (current product) | `local` if browser can decode |
| Image → PDF | HEIC/TIFF/AVIF | `server` only if `≤ 6 MB`; else error with guidance |

### Soft rules (`totalBytes ≤ 6 MB`)

| Signal | Prefer |
|--------|--------|
| Desktop, `deviceMemory ≥ 4` or unknown | `local` |
| Mobile | `local-first` for merge/image-to-PDF; `server` for compress (optional Sprint 5) |
| User agent low memory (`deviceMemory < 4`) | `server` when eligible |

**v1 simplification:** For `≤ 6 MB`, default **`local-first`** on merge and image-to-PDF; **`server-first`** on compress until local compress ships (Sprint 5).

---

## 5. Sprints

Each sprint ends with **`npm run build`** passing and **DEVELOPER_GUIDE.md** tree updated if new files were added.

---

### Sprint 0 — Foundation (no user-visible change)

**Objective:** Types, router, preflight; wire router in dev-only logging.

**Tasks**

1. Add `lib/processing/types.ts` with `ProcessingMode`, `RoutingDecision`, `RoutingContext`, `MergeResult`, `ImageToPdfResult`, `CompressResult`.
2. Add `lib/processing/preflight.ts`:
   - `summarizeFiles(files: File[])` → `{ totalBytes, mimeTypes, fileCount }`
   - `preflightPdf(file: File)` → `{ pageCount?, encrypted? }` (lazy, pdf-lib load)
3. Add `lib/processing/router.ts` with `decide(context)` implementing §4 rules.
4. Rename/document `MAX_SERVER_UPLOAD_BYTES` in `lib/constants.ts` (keep `MAX_UPLOAD_BYTES` alias).
5. Unit-test `router.ts` with table-driven cases (optional but recommended): 10 MB merge → local-only; 3 MB merge desktop → local-first; 7 MB → local-only + server ineligible.

**Acceptance**

- [ ] Router returns `local` with reason string for 10 MB merge.
- [ ] No tool behavior changes yet.
- [ ] `PROCESSING_ARCHITECTURE.md` §5.1 updated to match §2 of this doc.

**Files touched:** `lib/constants.ts`, `lib/processing/*`, `PROCESSING_ARCHITECTURE.md`

---

### Sprint 1 — Local merge + Worker infrastructure

**Objective:** Merge combine step runs in browser; proves Worker pipeline.

**Tasks**

1. Add `lib/processing/local/merge.ts`:
   - Port logic from `lib/services/pdf-merger.ts`
   - PDF: `PDFDocument.load` + `copyPages`
   - Images: `createImageBitmap` → canvas → JPEG → `embedJpg` (no `sharp`)
   - Accept same MIMEs as merge UI: PDF, JPEG, PNG
2. Add Worker:
   - `lib/processing/worker/merge.worker.ts` (or `public/workers/merge.worker.mjs`)
   - Messages: `{ type: 'merge', files: ArrayBuffer[] }` → `{ type: 'done', pdf: Uint8Array }` / `{ type: 'error', message }`
   - `lib/processing/worker/client.ts`: `runMergeInWorker(files, onProgress)` with 120s timeout
3. Add `lib/processing/local/merge.ts` orchestration entry used by worker (keep worker file thin).
4. Manual test in browser console or temporary dev page (optional); you will do full QA later.

**Acceptance**

- [ ] Worker merges 2+ PDFs under 6 MB locally without API call.
- [ ] Worker merges 10 MB total (your 5×2 MB case) on desktop in manual test.
- [ ] Main thread stays responsive during merge.

**Files touched:** `lib/processing/local/merge.ts`, `lib/processing/worker/*`, `public/workers/` (if used), `next.config.ts` only if worker URL needs config

**DEVELOPER_GUIDE note:** Worker is browser-only; mark files with comment `/** Browser / Worker only */`. Do not import from `lib/services/`.

---

### Sprint 2 — Orchestrator + merge client integration

**Objective:** Merge tool uses orchestrator; large jobs no longer blocked.

**Tasks**

1. Add `lib/processing/server/merge.ts` — extract existing `fetch` logic from `merge-client.tsx`.
2. Add `lib/processing/orchestrator.ts` — `processMerge(files: File[])`:
   - preflight → router → local worker OR server fetch
   - Returns `{ blob, mode, reason }`
   - On local error + `≤ 6 MB`: throw typed error for fallback UI (Sprint 6)
3. Add `components/processing-badge.tsx` — shows mode + reason after job starts/completes.
4. Refactor `app/(tools)/merge/merge-client.tsx`:
   - Remove `overLimit` disable on **Merge files** when router says local-only
   - Update `SizeWarning` copy: over 6 MB → **"Over 6 MB server limit. This job will run on your device."**
   - Replace direct `fetch(API_ROUTES.merge)` with `processMerge`
   - Keep page grid + `reorderPdfPages` unchanged
5. Toast on success: include mode in dev or badge only (DESIGN_GUIDE: keep toasts short).

**Acceptance**

- [ ] 10 MB merge: button enabled, badge says **On your device**, no `/api/merge` request.
- [ ] 3 MB merge: works via local or server per router (either OK if one path succeeds).
- [ ] Existing 3-step merge flow (upload → page grid → download) unchanged.

**Files touched:** `merge-client.tsx`, `orchestrator.ts`, `processing-badge.tsx`, `size-warning.tsx` (copy only)

---

### Sprint 3 — Local image-to-PDF + shared size UX

**Objective:** Image-to-PDF also works over 6 MB total; consistent warnings across tools.

**Tasks**

1. Add `lib/processing/local/image-to-pdf.ts` (same image pipeline as local merge).
2. Add worker **or** run on main thread for small image sets first; promote to worker if UI freezes (your testing will decide).
3. Add `lib/processing/server/image-to-pdf.ts` + `processImageToPdf()` in orchestrator.
4. Refactor `app/(tools)/image-to-pdf/image-to-pdf-client.tsx` like merge.
5. Extract shared `components/upload-size-notice.tsx` (wraps `SizeWarning` + router reason) used by merge + image-to-PDF.

**Acceptance**

- [ ] 8 MB total images → converts locally, no API call.
- [ ] ≤ 6 MB still works (local or server).
- [ ] Drop zone hints updated: mention device processing for large jobs.

**Files touched:** `image-to-pdf-client.tsx`, `lib/processing/local/image-to-pdf.ts`, shared notice component

---

### Sprint 4 — Local compress (single preset)

**Objective:** Compress works locally for files **> 6 MB**; server kept for ≤ 6 MB fallback.

**Tasks**

1. Add `lib/processing/local/compress.ts`:
   - Port strategy from `lib/services/pdf-compressor.ts` using canvas JPEG re-encode for DCT/JPX streams
   - Import qualities from `QUALITY_PRESETS` only (no magic numbers)
2. Worker recommended (compress is CPU-heavy).
3. Add `processCompress(file, preset)` to orchestrator.
4. Refactor `app/(tools)/compress/compress-client.tsx`:
   - Remove single-file 6 MB hard block when local-only
   - Show badge + before/after sizes (existing UI)
   - Server fallback on local failure if `file.size ≤ 6 MB`

**Acceptance**

- [ ] 8 MB PDF compresses locally at medium preset (manual desktop test).
- [ ] 2 MB PDF still works on server path when router chooses server.
- [ ] User sees honest copy if savings are minimal (text-heavy PDF).

**Files touched:** `compress-client.tsx`, `lib/processing/local/compress.ts`, `orchestrator.ts`

---

### Sprint 5 — Fallback UX + docs + architecture surfaces

**Objective:** Production-ready errors, landing/trust copy, architecture modal accuracy.

**Tasks**

1. Add `lib/processing/errors.ts` + `components/processing-fallback.tsx`:
   - Local OOM/timeout → "Try on server" only if ≤ 6 MB
   - Local fail + > 6 MB → "Try fewer or smaller files"
2. Update `components/landing-trust-section.tsx` guidelines:
   - 6 MB = server limit, not app limit
   - Large jobs run on device
3. Update `components/architecture-modal.tsx` diagram (hybrid router, two paths).
4. Update `DEVELOPER_GUIDE.md` §1 stack + §2 tree + processing section.
5. Mark `PROCESSING_ARCHITECTURE.md` status banner: **partially implemented**.

**Acceptance**

- [ ] Failure paths show one clear next step (no silent fail).
- [ ] Docs match runtime behavior.

---

### Sprint 6 — Backlog (after your testing feedback)

Pick based on your test results. Not required for > 6 MB goal.

| Item | Purpose |
|------|---------|
| Compress compare (3 presets, local + optional `/api/compress/compare` ZIP) | UX from original architecture doc |
| User preference: Auto / Local / Server (`localStorage`) | Power users |
| `use-file-processor.ts` → fold into orchestrator or delete dead hook | DRY cleanup |
| Mobile-specific router tuning | If phones fail often on 10 MB merge |
| `LOCAL_SIZE_WARN_BYTES` soft cap UI | Warn at 15 MB without blocking |

---

## 6. UI copy (DESIGN_GUIDE compliant)

| Context | Copy |
|---------|------|
| Over 6 MB staged | "Over 6 MB server limit. This job will run on your device." |
| Processing badge (local) | "On your device" |
| Processing badge (server) | "On server" |
| Local success toast | "Done. Downloading…" (unchanged) |
| Local fail, > 6 MB | "This file is too large for your browser. Try fewer or smaller files." |
| Local fail, ≤ 6 MB | "Processing on your device failed. Try on the server?" |
| Server fail, ≤ 6 MB | "Server processing failed. Try on your device?" |

No em dashes. Use periods and colons per DESIGN_GUIDE §4.5.

---

## 7. What stays unchanged

| Piece | Why |
|-------|-----|
| `proxy.ts` 6 MB guard | Still protects Netlify |
| `lib/services/*` + API routes | Server fallback path |
| PDF → image tool | Already local; optional router registration only |
| Merge page grid (`pdf-client.ts`) | Already local |
| `FileDropzone` per-file `maxSize` | Can stay at 6 MB per file **or** raise per-file cap in Sprint 3 (e.g. 50 MB per file, total unrestricted locally). **Recommend:** raise per-file limit to `LOCAL_SIZE_WARN_BYTES` or remove per-file max for merge/image tools only. |

**Open choice for you:** Per-file dropzone limit of 6 MB blocks five 2 MB files only if each file is OK but **each** must pass dropzone `maxSize`. Today `maxSize = MAX_UPLOAD_BYTES` per file in `FileDropzone`, so **5 × 2 MB already passes** dropzone; only **total** was blocked. Document confirms: issue is **total size check**, not per-file. No dropzone change required for 5×2 MB case.

---

## 8. Testing checklist (for you, post-implementation)

Run on **desktop Chrome**, **desktop Safari**, **mobile Safari**, **mobile Chrome**.

| # | Case | Expected |
|---|------|----------|
| 1 | Merge 5 × 2 MB PDFs | Local, completes, page grid works |
| 2 | Merge 2 × 3 MB | Local |
| 3 | Merge 1 × 2 MB | Local or server, completes |
| 4 | Image-to-PDF 10 MB total | Local |
| 5 | Compress 8 MB PDF | Local |
| 6 | Compress 2 MB scan PDF | Server or local, meaningful savings |
| 7 | PDF → image 6 MB | Still local, ZIP downloads |
| 8 | Merge 20 MB+ on phone | May fail with split-files message |

Report back: device, browser, file sizes, mode shown, error message. We tune router in Sprint 6.

---

## 9. Risk register

| Risk | Mitigation |
|------|------------|
| iOS OOM on large local merge | Worker + sequential image embed; honest error copy |
| Local compress quality poor | Badge + keep server for ≤ 6 MB |
| Worker bundle size / path wrong | Mirror `pdf.worker.min.mjs` pattern in `public/workers/` |
| Two pipelines drift | Server services remain source of truth; port intentionally |
| Main thread jank | Move heavy work to Worker in Sprint 1 |

---

## 10. Sprint order summary

```
Sprint 0  Foundation (router, types, constants)
    ↓
Sprint 1  Local merge + Worker
    ↓
Sprint 2  Orchestrator + merge UI  ← primary >6 MB win
    ↓
Sprint 3  Local image-to-PDF
    ↓
Sprint 4  Local compress
    ↓
Sprint 5  Fallback UX + docs
    ↓
Sprint 6  Backlog (compare-3, prefs, tuning)
```

**Minimum viable for your stated goal:** complete through **Sprint 2** (merge over 6 MB). Sprints 3–4 extend the same pattern to other server tools.

---

## 11. Decisions locked in this plan (override PROCESSING_ARCHITECTURE §15)

| Question | Decision for v1 |
|----------|-----------------|
| > 6 MB | **Local only**, not reject |
| Compare ZIP / 3 presets | **Defer** to Sprint 6 backlog |
| User setting Auto/Local/Server | **Defer** to Sprint 6 |
| Worker bundling | **`public/workers/*.mjs`** + dynamic `new Worker(url)` (same as pdfjs) |
| Keep `/api/compress` single-preset | **Yes**, as server fallback |
| Auto threshold | **local-first** merge/image-to-PDF; **server-first** compress until Sprint 4 |

Change any row above before we start coding.

---

## 12. After you read this

Reply with:

1. **Go / no-go** on the sprint order.
2. Any changes to §11 decisions.
3. Whether to start at **Sprint 0** or jump to **Sprint 0 + 1** in one pass.

Implementation only begins after your call.

---

*Created: hybrid processing sprint plan for Pdfer. Testing owned by product owner; engineering delivers sprints 0–5.*
