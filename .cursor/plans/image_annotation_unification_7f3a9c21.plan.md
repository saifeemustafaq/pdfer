---
name: Unify Add Image with Sign & Annotate
overview: Rebuild the "Add image" tab so images behave like Sign & annotate objects — free stamp placement, direct manipulation (drag/resize/rotate/delete), a contextual toolbar, and multiple independent images per document. Retire the SignatureSpec-based scope/numeric model and fold images into the shared annotation engine as a new `image` annotation type backed by an image registry.
todos:
  - id: model-image-type
    content: Add ImageAnnotation type + createAnnotation("image") + clamp handling in lib/pdf-annotations.ts
    status: pending
  - id: export-image
    content: Teach applyAnnotations to embed/draw image annotations (rotation + aspect) via an image registry param
    status: pending
  - id: model-tests
    content: Unit tests for image annotation defaults + export drawing (locked/free aspect, rotated)
    status: pending
  - id: overlay-image
    content: Add image render branch + locked/free resize to components/annotation-overlay.tsx
    status: pending
  - id: toolbar-image
    content: Add image controls (aspect-lock toggle, replace picture) to components/annotation-toolbar.tsx
    status: pending
  - id: preview-filter
    content: Add `types` filter + imageUrls + onReplaceImage props to components/pdf-annotation-preview.tsx
    status: pending
  - id: panel-rewrite
    content: Rewrite components/pdf-image-options-panel.tsx to upload+auto-place, image tray, add-to-page; drop scope/numeric/enable
    status: pending
  - id: client-state
    content: Rewrite image state in edit-pdf-client.tsx (image registry, image annotations, image page index, handlers, per-tab type filter)
    status: pending
  - id: wire-export
    content: Thread image registry through pdf-edit-export.ts; drop applySignatures image path + image spec remap
    status: pending
  - id: cleanup-verify
    content: Retire SignatureDraggableOverlay image usage, update copy/hints, run tsc + lint + vitest + build
    status: pending
isProject: false
---

# Unify "Add Image" with "Sign & Annotate"

## Goals

- Images are placed by **stamping**, not by choosing page scopes.
- Each placed image is an **independent object**: select, drag, resize, rotate, delete — identical chrome to text/shapes/signature.
- Support **multiple different images** in one document, each re-stampable.
- **Auto-place** one instance when a picture is uploaded; re-stamp via an image tray ("Add to page").
- Contextual toolbar for a selected image: **Delete + Rotation** (generic), **Aspect-lock toggle**, **Replace picture** (per-instance).
- Keep a **separate "Add image" tab**, but powered by the same annotation engine (filtered to `image` objects).

## Non-goals

- Opacity control (explicitly deferred).
- Background removal / trimming (Add image stays "as-is").
- Cropping.
- Changing the Sign & annotate tab's own behavior.

## Confirmed decisions (from discussion)

| Decision | Choice |
| --- | --- |
| Multiplicity | Multiple different images (image registry) |
| Placement flow | Auto-place on upload + "Add to page" for more |
| Location | Keep separate tab, shared engine, filtered by type |
| Toolbar | Delete + Rotation + Aspect-lock toggle + Replace |
| Enable checkbox | Dropped (image exports when instances exist) |
| Replace semantics | Per-instance (new registry entry, other copies untouched) |
| Aspect lock default | ON (matches today's image behavior) |
| Image tab preview page | Independent of Sign tab |

---

## Current state (what we're replacing)

- **Model:** `SignatureSpec` (page scope all/range/selected, per-page placement, one placement per page) in `lib/pdf-form-sign.ts`. A single image only.
- **Panel:** `components/pdf-image-options-panel.tsx` — enable checkbox, upload, `SignaturePageScopePanel`, copy-to-all, and numeric fields (Preview page, Width %, Horizontal %, From bottom %, Rotation).
- **Preview:** `components/pdf-image-preview.tsx` + `components/signature-draggable-overlay.tsx` — one draggable/resizable/rotatable overlay per active page.
- **Export:** `lib/pdf-edit-export.ts` calls `applySignatures(...)` with a (possibly remapped) `SignatureSpec`.

## Target architecture

```
edit-pdf-client
├── annotations: Annotation[]          # signature/text/shape/IMAGE all here
├── imageStore: Record<id,{bytes,aspect}>   # NEW registry (bytes off the annotation)
│
├── Sign tab   → PdfAnnotationPreview types=[signature,text,rect,ellipse,line]
└── Image tab  → PdfAnnotationPreview types=[image] + imageUrls + onReplaceImage
                 PdfImageOptionsPanel  (upload / tray / add-to-page)

export: exportEditedPdfFull → applyAnnotations(pdf, annotations, signaturePng, imageStoreBytes)
```

Images live in the **same `annotations` array**, so they inherit page-edit remapping (`remapAnnotationsForPageEdit`) and unified export for free. Bytes live in a **separate registry** keyed by `imageId` so multiple stamped copies share one blob and annotation objects stay light/serializable.

---

## Data model (`lib/pdf-annotations.ts`)

```ts
export type ImageAnnotation = AnnotationBox & {
  type: "image";
  imageId: string;      // key into the image registry
  lockAspect: boolean;  // true = width drives height (default)
};

export type Annotation =
  | SignatureAnnotation
  | TextAnnotation
  | ShapeAnnotation
  | ImageAnnotation;      // add to union

export type AnnotationType = ... | "image";
```

- `createAnnotation` gains an `image` case. Inputs reuse `signatureAspect` (→ imageAspect) + `pageAspect`, plus a required `imageId`. Defaults: `width: 0.3`, `height = width * aspect * pageAspect`, `lockAspect: true`, staggered `x/y`, `rotation: 0`.
- `clampAnnotationBox` already generic — no branch needed (image obeys the same min width/height + bounds).
- Registry type helper (exported for reuse): `export type ImageRegistry = Record<string, Uint8Array>;`

### Export engine

`applyAnnotations(pdfBlob, annotations, signaturePng, images?: ImageRegistry)`:

- Embed images lazily, cached per `imageId` (like the font cache).
- `drawImageAnnotation(page, embedded, a)`:
  - `drawWidth = pageWidth * a.width`.
  - `drawHeight = a.lockAspect ? drawWidth * (img.height/img.width) : pageHeight * a.height`.
  - Rotation reuses the existing center-rotate helpers (`pdfPhiRad` + `rotatePoint`) already used by signature/shape drawing.
- Skip an image annotation if its `imageId` is missing from the registry (defensive).

---

## Interaction layer

### `components/annotation-overlay.tsx`
- `AnnotationContent`: add an `image` branch rendering `<img src={imageUrls[a.imageId]}>` absolutely filling the box (`h-full w-full object-fill` when unlocked, natural when locked — locked box already matches aspect).
- Resize in `handlePointerMove`:
  - `image` + `lockAspect` → same path as `signature` (preserve ratio; width drives height).
  - `image` + free → same path as text/shape (independent width/height).
- Needs access to `imageUrls` map → add prop threaded from preview.

### `components/annotation-toolbar.tsx`
- New image branch:
  - Label "Image".
  - **Aspect lock** toggle (`Lock`/`Unlock` lucide icon) → `onChange({...a, lockAspect: !a.lockAspect})`. When switching **to** locked, normalize `height` from current width + image aspect (pass aspect in, or recompute in client on toggle).
  - **Replace** button (`ImageUp`/`Upload` icon) → `onReplaceImage(a.id)`.
  - Rotation + Delete already generic.

### `components/pdf-annotation-preview.tsx`
- New props:
  - `types?: AnnotationType[]` — filter which annotations render/select (default: all). Sign tab and Image tab pass disjoint sets.
  - `imageUrls?: Record<string,string>` — passed to each `AnnotationOverlay`.
  - `onReplaceImage?: (id: string) => void` — passed to `AnnotationToolbar`.
- `pageAnnotations` filtered by `types`. Selection/keyboard/background-catcher unchanged otherwise.

---

## Add-image panel (`components/pdf-image-options-panel.tsx` — rewrite)

Remove: enable checkbox, `SignaturePageScopePanel`, copy-to-all, all numeric fields, preset (already gone), rotation field.

New surface:
- **Upload image** button → `onUploadImage(file)` (auto-places one instance on the current image-tab page + selects it).
- **Image tray**: thumbnails of each distinct picture in the registry; each row has an **"Add to page"** action → `onAddImageToPage(imageId)` stamps another instance on the current page. Optional per-row remove-from-document (prunes registry entry + its instances) — nice-to-have.
- Short hint mirroring the annotate copy ("Drag to move, corner to resize, handle to rotate; use the toolbar to replace or lock aspect.").

Panel props (new):
```ts
type Props = {
  images: { id: string; url: string }[];   // tray
  activePageIndex: number;
  onUploadImage: (file: File) => void;
  onAddImageToPage: (imageId: string) => void;
  onRemoveImage?: (imageId: string) => void; // optional
};
```

---

## Client state (`app/(tools)/edit-pdf/edit-pdf-client.tsx`)

Remove: `imageSpec`, `imageEnabled`, `DEFAULT_IMAGE_SPEC`, `effectiveImageSpec`, `effectiveImagePageIndex` (spec-based), image branch of `remapSignatureSpecForPageEdit`.

Add:
- `imageStore: Record<string,{bytes:Uint8Array; aspect:number}>`.
- `imagePageIndex` (+ `effectiveImagePageIndex` via `firstKeptPage`/`removedPages`, mirroring sign).
- `imageUrls` memo: `id → bytesToDataUrl(bytes)`.
- `imageTray` memo: distinct `{id,url}` for the panel.

Handlers:
- `handleUploadImage(file)`: `fileToImagePng` → read aspect (`pngAspectRatio`) → new `imageId` → store bytes+aspect → `createAnnotation({type:"image", imageId, signatureAspect:aspect, pageAspect, pageIndex:effectiveImagePageIndex, existingOnPage})` → append + select.
- `handleAddImageToPage(imageId)`: same create+append using existing store aspect (no upload).
- `handleReplaceImage(id)`: open file picker → `fileToImagePng` → new `imageId` + store entry → `updateAnnotation(id,{imageId})` and, if locked, recompute `height` from new aspect.
- Aspect-toggle normalization handled in `handleChangeAnnotation` or a dedicated handler.

Previews:
- Sign tab: `PdfAnnotationPreview types={["signature","text","rect","ellipse","line"]}` (unchanged behavior).
- Image tab: `PdfAnnotationPreview types={["image"]} imageUrls={imageUrls} onReplaceImage={handleReplaceImage} activePageIndex={effectiveImagePageIndex} onActivePageChange={setImagePageIndex}` + `PdfImageOptionsPanel` in the sidebar.

---

## Export wiring (`lib/pdf-edit-export.ts`)

- `EditExportOptions`: drop `imageEnabled/imagePng/imageSpec`; add `images?: ImageRegistry` (bytes only).
- Remove the `applySignatures` image block and its `remapSignatureSpecForPageEdit` call.
- Pass `images` into `applyAnnotations(...)`. Image annotations already flow through `remapAnnotationsForPageEdit`.

---

## Phases & sprints

### Phase 1 — Foundation (model + export)  ➜ todos: `model-image-type`, `export-image`, `model-tests`
Sprint 1.1: `ImageAnnotation` type, union/`AnnotationType`, `createAnnotation` image case, `ImageRegistry` type.
Sprint 1.2: `drawImageAnnotation` + registry param on `applyAnnotations` (lazy embed cache, rotation, locked/free aspect).
Sprint 1.3: Vitest — defaults (`lockAspect` true, rotation 0), export draws for locked/free/rotated + missing-registry no-throw.
**Exit:** `vitest` green, `tsc` clean. No UI wired yet (safe, additive).

### Phase 2 — Interactive canvas parity  ➜ todos: `overlay-image`, `toolbar-image`, `preview-filter`
Sprint 2.1: overlay image render + resize branches; thread `imageUrls`.
Sprint 2.2: toolbar image controls (aspect toggle, replace); thread `onReplaceImage`.
Sprint 2.3: preview `types` filter + prop plumbing.
**Exit:** `tsc`/lint clean; Sign tab visually unchanged when passing its `types`.

### Phase 3 — Panel rewrite  ➜ todo: `panel-rewrite`
Sprint 3.1: strip scope/numeric/enable; build upload + tray + add-to-page.
**Exit:** panel compiles against new props (temporarily unused until Phase 4).

### Phase 4 — Client + export integration  ➜ todos: `client-state`, `wire-export`
Sprint 4.1: image registry + page-index state + memos + handlers.
Sprint 4.2: swap Image tab preview/panel to the new components; per-tab `types`.
Sprint 4.3: `pdf-edit-export` registry threading; remove spec image path.
**Exit:** end-to-end place → drag/resize/rotate/replace → export produces correct PDF; page-remove/reorder repositions images.

### Phase 5 — Cleanup & verification  ➜ todo: `cleanup-verify`
Sprint 5.1: retire `SignatureDraggableOverlay`/`pdf-image-preview` image usage (leave `pdf-form-sign` lib + tests intact to avoid churn); update hints/metadata copy.
Sprint 5.2: `tsc --noEmit`, ESLint on touched files, `vitest run`, `npm run build`.

---

## Edge cases

- **Aspect toggle → locked:** recompute `height` from image aspect so the box snaps to true proportions.
- **Replace with different aspect:** if locked, recompute height; keep top-left-ish anchor (clamp keeps on-page).
- **Deleting the last instance of an image:** keep the registry entry so the tray can re-add (unless user removes it from the tray).
- **Page removed in Pages tab:** image annotations on removed pages are dropped by `remapAnnotationsForPageEdit` (already handled); image-tab navigation skips removed pages via `resolveKeptPage`/`firstKeptPage`.
- **Very small / off-aspect images:** obey existing `ANNOTATION_WIDTH_MIN/HEIGHT_MIN` clamps.
- **Selection sharing:** `selectedAnnotationId` is shared across tabs; switching tabs with a filtered preview simply won't render a non-matching selection (harmless).

## Testing

- Unit (`lib/pdf-annotations.test.ts`): image defaults; export size grows for locked/free/rotated; missing registry entry skipped without throwing.
- Manual matrix: upload auto-places; tray "Add to page"; multiple distinct images; drag/resize (locked vs free)/rotate/delete; replace per-instance; multi-page stamping; page removal remap; export fidelity vs preview.

## Risks & mitigations

- **Preview/export drift** (locked vs free aspect): share the exact aspect math between overlay and `drawImageAnnotation`; cover with tests.
- **Registry lifecycle leaks:** prune on document clear (`handleClear`/`handleDrop` reset `imageStore`).
- **Scope creep from `SignatureSpec` removal:** keep `pdf-form-sign.ts` functions + tests; only remove *usage* in the image path to limit blast radius.

## Files to create / modify

- `lib/pdf-annotations.ts` — modify (type, factory, export engine)
- `lib/pdf-annotations.test.ts` — modify (image tests)
- `components/annotation-overlay.tsx` — modify (image render + resize)
- `components/annotation-toolbar.tsx` — modify (image controls)
- `components/pdf-annotation-preview.tsx` — modify (types filter, imageUrls, onReplaceImage)
- `components/pdf-image-options-panel.tsx` — rewrite (upload/tray/add-to-page)
- `lib/pdf-edit-export.ts` — modify (registry param; drop spec image path)
- `app/(tools)/edit-pdf/edit-pdf-client.tsx` — modify (registry/state/handlers/wiring)
- `components/pdf-image-preview.tsx` — retire (replaced by PdfAnnotationPreview)
- `components/signature-draggable-overlay.tsx` — retire from image path (kept if referenced elsewhere; currently only image)
- `lib/pdf-form-sign.ts` / `lib/image-overlay.ts` — leave lib intact; remove only now-dead image wiring as needed
