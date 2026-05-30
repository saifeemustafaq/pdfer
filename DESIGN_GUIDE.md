# Pdfer — Design Guide

Baseline rules for visual language, component patterns, screen layouts, and motion across every Pdfer interface. Follow these unless there's a clear reason to deviate.

This guide pairs with [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md). The developer guide tells you **where code goes**. This one tells you **what it should look and sound like**.

Pdfer's design philosophy is **warm, calm, and frictionless** — inherited from Anthropic's Claude brand. Terracotta + cream surfaces, Inter body, generous whitespace, no harsh shadows. The tool is utilitarian but should feel considered, not clinical. A person uploading a PDF before a deadline shouldn't feel like they're in an enterprise dashboard.

---

## Part 1 — Visual system

### 1.1 Brand palette

The full token table (with OKLCH values) is the runtime source of truth in `app/globals.css`. Use this section for the *why*.

| Role | Light | Dark | Used for |
|------|-------|------|----------|
| Primary (Claude Orange) | `#C15F3C` / `oklch(0.597 0.135 39.87)` | `#E89272` / `oklch(0.72 0.105 42)` — lifted + desaturated | Primary CTAs, active nav, drag-over highlights, progress |
| Primary hover | `oklch(0.52 0.12 39.87)` (darker) | `oklch(0.76 0.10 42)` (lighter) | Hover/pressed states on primary |
| Background | `oklch(0.982 0.005 95.1)` (warm cream) | `oklch(0.19 0.008 78)` (warm dark brown) | Page background — never pure white or pure black |
| Card | `oklch(0.964 0.007 97.35)` | `oklch(0.26 0.010 80)` | Drop zones, file list panels, feature cards |
| Foreground | `oklch(0.344 0.027 95.72)` (warm dark) | `oklch(0.93 0.006 78)` (warm off-white) | All body text |
| Muted | `oklch(0.934 0.01 93.57)` | `oklch(0.28 0.011 81)` | Empty state backgrounds, drag-inactive zones |
| Muted foreground | `oklch(0.524 0.019 91.68)` | `oklch(0.72 0.015 88)` | File name metadata, size labels, captions |
| Border | `oklch(0.897 0.013 91.53)` | `oklch(0.38 0.012 82)` | Dropzone outlines, card edges, dividers |
| Ring | same as primary | same as primary | Focus ring on interactive elements |

**Rules**

- Always use design tokens (`bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`) — **never hardcode hex or OKLCH values in components**. All tokens are defined in `globals.css` and wired through `@theme inline`.
- Claude Orange is the single accent color. Do not introduce a second brand color.
- The warm cream/dark-brown background and warm neutrals are non-negotiable. Do not swap them for pure white, off-white, or cool-grey backgrounds.

### 1.2 Status colors

Limited, semantic, and quiet.

| Status | Light | Dark | Used for |
|--------|-------|------|----------|
| Success | `oklch(0.65 0.13 145)` (muted sage green) | `oklch(0.62 0.11 145)` | File processed successfully, download ready |
| Warning | `oklch(0.78 0.13 75)` (warm amber) | `oklch(0.75 0.11 75)` | File near size limit, lossy compression notice |
| Destructive | `oklch(0.541 0.148 28.51)` (terracotta red) | `oklch(0.62 0.13 28)` | Invalid file type, upload error, over limit |
| Info | `oklch(0.65 0.10 240)` (muted blue) | `oklch(0.68 0.09 240)` | Informational tips, compression ratio |

Status colors are **CSS variables** (`--success`, `--warning`, `--info`, `--destructive`) defined in `globals.css`. Use `text-success`, `bg-warning/10`, `border-destructive`, etc. — never raw hex.

**Drop zone states**

| State | Treatment |
|-------|-----------|
| Idle | `border-border`, `bg-card`, dashed outline |
| Hover / drag-over | `border-primary`, `bg-primary/5`, dashed outline thickens to 2px |
| Files staged | `border-border` (solid), `bg-card` — drop zone shrinks to a secondary add-more area |
| Processing | `border-primary/40`, `bg-primary/5`, progress bar in primary |
| Error | `border-destructive`, `bg-destructive/5` |

### 1.3 Typography

One family, everywhere. **Inter** is the typeface for all text. No serif, no second family, no display font.

| Role | Family | Weight | Notes |
|------|--------|--------|-------|
| Page title (h1) | Inter | 700 | Tool name, one per page |
| Section / card heading (h2–h3) | Inter | 600 | Feature card titles, panel headers |
| Body | Inter | 400 | Descriptions, helper text |
| UI / labels | Inter | 500 | Buttons, file names, badge text |
| Mono | System mono stack (no web font) | 400 | File sizes (e.g. `2.4 MB`), compression ratios |
| Numerals | Inter with `tabular-nums` | — | Before/after file sizes, progress percentages — always tabular |

- Load Inter via `next/font/google` with `display: "swap"`. Expose as `--font-inter` on `<html>`, wired to `--font-sans` and `--font-heading` in `globals.css`.
- **Inter is the only sans-serif.** Do not load Geist, system-ui-only stacks, or any other web font for body or headings.
- Do not hardcode `font-family` in CSS or inline styles. Use Tailwind utilities (`font-sans`, `font-mono`, `font-heading`) or the CSS variables.
- **Mono** uses the OS stack defined in `globals.css` — for file sizes, compression ratios, and numeric metadata only. Apply `font-mono tabular-nums` together on those values.

### 1.4 Type scale

| Token | Size / Line height | Use |
|-------|-------------------|-----|
| `text-3xl` | 30 / 36 | Page hero headline (landing) |
| `text-2xl` | 24 / 32 | Tool page title (h1) |
| `text-xl` | 20 / 28 | Feature card titles, section headings |
| `text-lg` | 18 / 28 | Lead descriptions |
| `text-base` | 16 / 24 | Body default |
| `text-sm` | 14 / 20 | File name, metadata, captions |
| `text-xs` | 12 / 16 | Badges, compression ratio chip, fine print |

Body copy is **never smaller than 14px** in the main UI. Fine print (Netlify 6 MB notice, format restrictions) is 12px in `text-muted-foreground`.

### 1.5 Spacing & layout

Standard Tailwind 4pt scale, hand-picked for cohesion:

- **Component internal padding**: `p-3` (12px) for compact chips/badges, `p-4` (16px) default, `p-6` (24px) for cards and drop zones.
- **Section spacing**: `gap-6` or `py-8` between page sections.
- **Page gutters**: `px-4` mobile, `md:px-6` tablet, `lg:px-8` desktop.
- **Max content width**: `max-w-2xl` (672px) for single-tool pages (compress, image-to-pdf), `max-w-3xl` (768px) for the merge page (wider file list). `max-w-5xl` for the landing page.
- **Stack rhythm**: prefer `space-y-*` and `gap-*` on flex/grid over per-element margins.

**Never use arbitrary values** (`p-[13px]`, `mt-[7px]`). If you find yourself reaching for one, the underlying spacing decision is wrong.

### 1.6 Radii, borders, elevation

- **Radii**: `rounded-md` (5px) for input fields and small chips, `rounded-lg` (8px) for buttons and file items, `rounded-xl` (11px) for cards and drop zones, `rounded-2xl` (14px) for page-level panels on mobile.
- **Borders**: 1px `border-border` for cards and drop zones. 2px `border-primary` for the active drag-over state (the only exception to 1px borders).
- **Elevation**: shadows are **minimal**. `shadow-sm` for popovers and tooltips only. No `shadow-lg`, no glow, no inner shadows. Separation comes from the warm cream-to-card tone shift and borders, not depth.
- **Dashed borders** are used exclusively for the idle drop zone state. Solid borders everywhere else.

### 1.7 Iconography

- **Lucide React only.** No emoji, no Font Awesome, no raw SVG paste-ins.
- Default size **16px** inline with text, **20px** in buttons and file list actions, **24px** in the nav bar.
- Icon stroke width stays at Lucide's default `2`.
- Color comes from the parent — use `text-foreground`, `text-muted-foreground`, `text-primary`. Never set a raw color on an icon.
- One icon per action. The drop zone has one upload icon; the file list has one remove icon per item.

**Icon vocabulary for this app**

| Context | Icon |
|---------|------|
| Upload / drop zone | `UploadCloud` |
| PDF file | `FileText` |
| Image file | `Image` |
| Remove file | `X` |
| Merge tool | `Combine` |
| Compress tool | `Minimize2` |
| Image-to-PDF tool | `Images` |
| Download | `Download` |
| Processing (spinner) | `Loader2` (animated) |
| Success | `CheckCircle2` |
| Error | `AlertCircle` |
| Home | `Home` |
| Drag handle | `GripVertical` |

### 1.8 Motion

- **Only one animation class in the codebase**: `animate-spin` on the `Loader2` processing spinner.
- Do not add entrance animations, slide-ins, or bounce transitions. The UI feels fast by being fast, not by animating.
- `prefers-reduced-motion` is respected automatically by Tailwind's `animate-spin`. No additional motion guards are needed unless custom animations are introduced.
- The drag-to-reorder list uses `@dnd-kit/sortable`. Let dnd-kit handle its own transition. Do not add additional CSS transitions to list items.

### 1.9 Light & dark mode

**These are the only two themes in this project:**

1. **Claude Orange Light** — `:root` in `globals.css`
2. **Claude Orange Dark** — `.dark` in `globals.css`

There is no neutral/cool-grey palette, no third accent theme, and no per-route theme switching beyond light ↔ dark. Every screen must look correct in both.

- **Both modes ship at the same fidelity.** Test both before shipping any UI change.
- **Light and dark are not 1:1 inversions.** Dark mode uses its own tuned token values — especially primary, surfaces, and borders — not the light values with inverted lightness.
- The theme toggle lives in the top-right of the nav bar on desktop. On mobile, it lives in a `…` overflow menu or is omitted (mobile users follow OS preference by default).
- Do not use `useTheme()` outside of the theme toggle component itself. All other styling is done via CSS tokens.

### 1.10 Dark theme contrast model

Dark-mode orange palettes fail accessibility when you copy the light-mode accent verbatim. Saturated `#C15F3C` on a warm dark brown background drops below WCAG AA for normal text and can look muddy on borders/icons. Material Design's dark-theme guidance and current WCAG 2.2 practice both recommend **desaturating and lifting accent colors** on dark surfaces while keeping the same hue family.

Pdfer applies that model as follows:

| Layer | Rule | Token targets |
|-------|------|---------------|
| Base surface | Warm dark brown, not `#000` | `--background` `oklch(0.19 …)` |
| Elevated surfaces | Each step +6–9% lightness (tonal elevation, not shadows) | `--card`, `--popover`, `--muted` |
| Body text | Warm off-white, not pure white (reduces halation) | `--foreground` `oklch(0.93 …)` |
| Secondary text | ≥ 4.5:1 against background | `--muted-foreground` `oklch(0.72 …)` |
| Primary accent | Same hue as light (`~42°`), lower chroma, higher L | `--primary` `oklch(0.72 0.105 42)` |
| Filled buttons | Cream text on `--primary` | `--primary-foreground` unchanged |
| Borders / inputs / focus | ≥ 3:1 against adjacent surface | `--border`, `--ring` |

**Primary orange — light vs dark**

| Mode | Token | Why |
|------|-------|-----|
| Light | `oklch(0.597 0.135 39.87)` (`#C15F3C`) | Brand terracotta on cream surfaces |
| Dark | `oklch(0.72 0.105 42)` (`~#E89272`) | Lifted terracotta — readable on brown surfaces, passes AA for large text and UI chrome |

Both read as Claude Orange. Dark mode is slightly lighter and less saturated so `text-primary`, `border-primary`, and focus rings remain visible without glowing or failing contrast.

**Where orange is allowed as text**

- **Light mode:** `text-primary` is fine for nav labels, icons, and metadata — not for long body paragraphs.
- **Dark mode:** same rule — use `text-primary` for accents and active states only; body copy stays `text-foreground` or `text-muted-foreground`.

**Contrast targets (WCAG 2.2 AA)**

| Element | Minimum ratio | Examples |
|---------|---------------|----------|
| Body text | 4.5:1 | File names, descriptions, toasts |
| Large text / bold UI labels | 3:1 | Page titles (`text-2xl+`), button labels |
| Non-text UI | 3:1 | Borders, icons, focus rings, progress bars |

When a color fails AA in one role, fix the token in `globals.css` — do not hardcode a one-off override in a component.

---

## Part 2 — Component patterns

shadcn/ui is the design system. Always prefer composing shadcn primitives over building from scratch.

### 2.1 Buttons

| Variant | When to use |
|---------|-------------|
| `default` (primary, Claude orange) | The single most important action: "Merge files", "Compress PDF", "Convert to PDF". **At most one per page view.** |
| `secondary` | Supporting actions: "Add more files". |
| `outline` | Tertiary or equal-weight actions: quality preset chips when not selected. |
| `ghost` | Inline actions in the file list: remove button (`X`) per file item. |
| `destructive` | Clearing all files ("Clear all"). Always preceded by a confirmation or made obviously reversible. |

Sizes (use wrappers in `components/app-button.tsx` — do not mix raw `size` props):

| Wrapper | Size | Use |
|---------|------|-----|
| `PrimaryActionButton` | `default` | One main CTA per tool view (Merge, Compress, Download) |
| `SecondaryActionButton` | `default`, outline | Back, compress another, start over |
| `DestructiveActionButton` | `default`, destructive | Clear all |
| `CardActionLink` | `default` | Home page tool card links |
| `IconTouchButton` | icon, 48×48 min | Remove file / remove page (X) |

Do not use `size="lg"` or `size="sm"` on tool pages — it breaks visual consistency.

**Loading state**: the primary action button shows a `Loader2` spinner and disables itself while the API call is in flight. Never leave the button enabled during processing — double-submissions will corrupt the output.

**No primary button without files**: the "Merge", "Compress", and "Convert" buttons are disabled (`disabled` attribute, not just visual opacity) when no files are staged.

**Paired actions** (e.g. Download + Compress another): always wrap in `ActionButtonGroup` from `components/action-button-group.tsx`. It lays buttons out in a horizontal row with `gap-3` and `flex-wrap` on narrow screens. Never place two action buttons as bare siblings — missing gap and misalignment are common layout bugs.

### 2.2 Drop zone

The drop zone is the most-used element in the app. It must feel immediately obvious and satisfying.

- **Idle**: `border-border border-dashed border-2 rounded-xl bg-card p-8`. Center-aligned `UploadCloud` icon (32px, `text-muted-foreground`) + label + `text-xs text-muted-foreground` format hint.
- **Drag-over**: `border-primary border-2 bg-primary/5`. The icon changes to `text-primary`.
- **After files are staged**: the drop zone collapses to a compact "Add more files" strip (`p-3`) above the file list. It does not disappear — the user should always be able to add more files without resetting the page.
- **Click target**: the entire drop zone card is clickable (opens the file picker). Do not show a separate "Browse" button — the card click is sufficient.

### 2.3 File list

The staged-file list shows one row per file. Each row:

- **Drag handle** (`GripVertical` icon, `text-muted-foreground`) — leftmost, only shown on lists that support reordering (merge, image-to-pdf).
- **File type icon** (`FileText` for PDF, `Image` for images) — 20px, `text-primary`.
- **File name** — `text-sm font-medium`, truncated with `truncate` if longer than the available width.
- **File size** — `text-xs text-muted-foreground tabular-nums`.
- **Remove button** — `ghost` `sm` button with `X` icon, right-aligned. Removes the file from the list without confirmation (it's immediately reversible by re-adding the file).

The list uses `@dnd-kit/sortable` for reordering on the merge and image-to-pdf pages. The compress page shows a single file only (no reordering).

### 2.4 Quality presets (compress page)

Three choices, presented as a button group, not a slider:

| Preset | Label | Description | JPEG quality |
|--------|-------|-------------|-------------|
| `low` | Small file | Aggressive compression — best for email attachments | 40 |
| `medium` | Balanced | Good quality with meaningful size reduction | 65 |
| `high` | Best quality | Minimal compression — preserves detail | 85 |

- Default selection: `medium`.
- Selected state: `default` (orange background). Unselected: `outline`.
- The description line appears below the preset label in `text-xs text-muted-foreground`.
- After compression completes, show before/after file size in `tabular-nums text-sm` with the reduction percentage in a `bg-success/10 text-success` badge.

### 2.5 Progress & processing state

File processing can take several seconds on large PDFs. The UI must not look frozen.

- Replace the primary button with a disabled spinner button (text changes to "Processing…").
- Show a `Progress` bar (shadcn) below the drop zone, animated from 0 → 90% while the API call is in flight, then jumping to 100% on success. Fake progress is acceptable here — it signals liveness.
- On success: progress bar turns `bg-success`, button changes to "Download ready" with a `CheckCircle2` icon, and the download is triggered automatically after a 300ms delay.
- On failure: progress bar disappears, the drop zone re-enables, and a `toast.error()` surfaces the error.

### 2.6 Download

- Trigger automatically on success (300ms delay gives the user a moment to see the success state before the browser dialog opens).
- Output filename conventions:
  - Merge: `merged.pdf`
  - Compress: `compressed-{original-filename}.pdf`
  - Image-to-PDF: `converted.pdf`
- Always trigger via the synthetic anchor pattern (see [DEVELOPER_GUIDE.md §20](DEVELOPER_GUIDE.md#20-client-side-file-handling)).
- Show a `Download` button as a fallback in case the auto-trigger is blocked by the browser.

### 2.7 Navigation

**Desktop — top nav bar**

- Height: `h-14` (56px). Background: `bg-background/80` with `backdrop-blur-sm`. Bottom border: `border-b border-border`.
- Left: logo + app name ("Pdfer") in `font-semibold`. Clicking navigates to `/`.
- Center (or right of logo): three nav links — Merge, Compress, Image to PDF.
- Right: theme toggle (`Sun`/`Moon` icon button, `ghost`).
- Active link: `text-primary font-medium`. Inactive: `text-muted-foreground`. No underline indicator — color alone distinguishes the active state.

**Mobile — bottom tab bar**

- Height: `h-16` (64px). Fixed to the bottom of the viewport (`fixed bottom-0 inset-x-0`). Background: `bg-background/90 backdrop-blur-sm`. Top border: `border-t border-border`.
- Four tabs: Home (`Home`), Merge (`Combine`), Compress (`Minimize2`), Convert (`Images`).
- Each tab: icon centered above label, `text-xs`. Active tab: `text-primary`. Inactive: `text-muted-foreground`.
- The tab bar adds `pb-16` safe-area padding to all tool page content so nothing is obscured.
- Do not show the tab bar on the landing page on desktop — the top nav is sufficient.

### 2.8 Feature cards (landing page)

Three cards, one per tool. Each card:

- `Card` with `p-6`, `rounded-xl`, hover state: `shadow-sm ring-1 ring-border` → `ring-primary/20`.
- Top: tool icon (`24px`, `text-primary`) in a `rounded-lg bg-primary/10 p-2` container.
- Below icon: tool name (`text-xl font-semibold`), one-line description (`text-sm text-muted-foreground`).
- Bottom: `Link` styled as a `default` button — "Merge files", "Compress PDF", "Convert images".
- Cards are in a 3-column grid on desktop (`grid-cols-3`), 1-column on mobile.

### 2.9 Toasts

Use Sonner for all user-facing feedback:

- `toast.success("Done — downloading…")` — on successful processing.
- `toast.error("File too large — 6 MB limit")` — on file size rejection.
- `toast.error("Invalid file type — PDF and images only")` — on wrong MIME type.
- `toast.error("Processing failed — please try again")` — on API error.
- `toast.info("Images will be compressed to JPEG for embedding")` — informational, on image upload to the merge tool.

No toast for file additions to the list — the visual list update is feedback enough.

---

## Part 3 — Screen patterns

### 3.1 Landing page

Layout: `max-w-6xl`, scrollable vertical stack (`gap-8` / `gap-10`).

- **Hero**: headline (`text-2xl` / `md:text-[1.65rem] font-bold`), tagline (`text-sm text-muted-foreground`), then a short **origin story** paragraph (why the app exists — no paywalls, no sign-ups, no harvesting uploads).
- **Tool cards**: four-column grid on `lg` (§2.8; compact `ToolCard` variant).
- **Trust section** (`LandingTrustSection`): `rounded-2xl border bg-muted/40` strip below the cards — four pillar cards (2×2 grid) plus a four-step “How processing works” row. Icons in `bg-primary/10` circles; copy must match the stateless architecture (no DB, in-memory processing, HTTPS, no third-party file APIs).
- **Footer**: one line — `text-xs text-muted-foreground`: "No sign-up. Files are never stored."

### 3.2 Tool pages (merge / compress / image-to-pdf)

Consistent structure across all three:

```
[Tool title + one-line description]
[Drop zone]                        ← large, prominent, top of the page
[File list]                        ← appears after first file is added
[Tool-specific controls]           ← quality presets (compress only) 
[Primary action button]            ← disabled until files are staged
[Progress bar]                     ← visible only while processing
[Download area]                    ← appears on success
```

- `max-w-2xl` centered on all three tool pages (merge can use `max-w-3xl` if the file list needs more horizontal room).
- The drop zone shrinks to an "Add more files" strip after files are staged — it does not disappear.
- On mobile, the primary action button is sticky above the tab bar (`sticky bottom-16`) so it's always reachable without scrolling.

### 3.3 Loading states

Every tool page has a `loading.tsx` with shadcn `Skeleton` matching the real layout:

- One `Skeleton` block for the drop zone (same height, `rounded-xl`).
- Three shorter `Skeleton` blocks for where file list items would appear.
- One `Skeleton` for the primary action button.

No full-page spinner. Skeletons animate via `animate-pulse`.

### 3.4 Error states

Every tool page has an `error.tsx`:

- `AlertCircle` icon, 48px, `text-destructive`.
- Heading: "Something went wrong."
- Body: "We couldn't process your files. Try again or use a smaller file."
- Two buttons: `default` "Try again" (calls `reset()`), `outline` "Back to home".

### 3.5 Empty state (file list)

The file list is not shown when empty — the drop zone takes its place. There is no explicit "empty state" message; the drop zone itself communicates the expected action.

### 3.6 Mobile UX

- **The primary CTA is sticky** above the bottom tab bar (`sticky bottom-16`). Never force the user to scroll to find the action button.
- **Tap targets ≥ 48×48px** for all interactive elements: remove file button, quality preset chips, the primary CTA.
- **File names truncate** with `truncate` — never wrap to two lines in the file list.
- The drop zone height on mobile is `min-h-[140px]` — tall enough to be an obvious tap target without dominating the viewport.
- On iOS, `accept` on the hidden file input accepts `application/pdf,image/jpeg,image/png` — this pre-filters the native file picker.

### 3.7 Accessibility baseline

- Color contrast: WCAG 2.2 AA minimum on all text. Light mode: brand orange on cream passes for buttons and large accents — not small body copy. Dark mode: use the lifted `--primary` token (`oklch(0.72 0.105 42)`) for accents; body copy stays `--foreground`. See §1.10.
- Every icon-only button has an `aria-label` (e.g. `aria-label="Remove file"`).
- The drop zone is keyboard accessible: `role="button"`, `tabIndex={0}`, fires on `Enter` and `Space`.
- The drag-to-reorder list (`@dnd-kit`) handles keyboard reordering natively — do not disable it.
- Focus rings use `ring-2 ring-primary ring-offset-2` via the `--ring` token.
- The progress bar uses `role="progressbar"` with `aria-valuenow`.

---

## Part 4 — Voice & tone

Pdfer is a **quiet, fast, honest tool**. The copy should be minimal and direct. No enthusiasm, no brand voice, no personality quirks.

### 4.1 Principles

- **Plain language.** "File too large" — not "Oops! This file exceeds our upload limit."
- **Active voice.** "Merging files…" — not "Files are being merged."
- **No filler.** The UI doesn't greet you. It shows a drop zone.
- **Honest about failure.** "Processing failed — please try again" is correct. "Hmm, something went wrong 🤔" is not.
- **No emoji in UI copy.** Not in labels, not in toasts, not in empty states.

### 4.2 UI copy length

- Buttons: 1–3 words. "Merge files", "Compress PDF", "Convert", "Download".
- Drop zone label: one sentence. "Drop files here, or click to browse."
- Drop zone sub-label: one line of `text-xs`. "PDF and images up to 6 MB."
- Toast messages: one clause. "Done — downloading…" / "File too large — 6 MB limit."
- Error messages: one sentence, no fluff.

### 4.3 Tool copy reference

| Context | Copy |
|---------|------|
| Merge drop zone label | "Drop PDFs and images here, or click to browse." |
| Merge drop zone hint | "Accepts PDF, JPEG, PNG · max 6 MB total" |
| Compress drop zone label | "Drop a PDF here, or click to browse." |
| Compress drop zone hint | "Accepts PDF · max 6 MB" |
| Image-to-PDF drop zone label | "Drop images here, or click to browse." |
| Image-to-PDF drop zone hint | "Accepts JPEG, PNG · max 6 MB total" |
| Processing state | "Processing…" |
| Success state | "Done — downloading…" |
| Download fallback button | "Download" |
| Compression result badge | "–{n}% smaller" |
| Footer trust line | "No sign-up. Files are never stored." |

### 4.4 Error copy

| Failure | Toast / message |
|---------|-----------------|
| File over limit | "File too large — 6 MB limit" |
| Wrong file type (PDF expected) | "Only PDF files are accepted here" |
| Wrong file type (image expected) | "Only JPEG and PNG images are accepted" |
| No files selected | (button stays disabled — no toast needed) |
| API processing error | "Processing failed — please try again" |
| Network failure | "Couldn't reach the server — check your connection" |
| Partial merge failure | "One or more files couldn't be read — try again with different files" |

---

## Quick checklist

| Do | Don't |
|----|-------|
| Use design tokens (`bg-primary`, `text-foreground`) everywhere | Hardcode OKLCH values or hex in components |
| Warm cream/dark-brown backgrounds in both modes | Swap backgrounds for pure white or cool grey |
| Use Lucide React icons at standardized sizes (16 / 20 / 24 / 32) | Mix icon libraries or paste raw SVG |
| Keep one `default` (orange) primary CTA per page | Stack two `default` buttons on the same screen |
| Show progress while API call is in flight | Leave users with a frozen button |
| Disable the primary CTA when no files are staged | Allow submissions with empty file lists |
| Trigger download automatically on success | Make the user find a hidden download link |
| Shrink the drop zone to "Add more files" after staging | Hide the drop zone once files are added |
| Show `loading.tsx` and `error.tsx` for every tool page | Leave error/loading boundaries to "later" |
| Use `shadow-sm` only for popovers/tooltips | Add `shadow-lg` or glow effects to cards |
| Use `tabular-nums` for file sizes, percentages, ratios | Let file sizes jump layout on update |
| 48×48px minimum tap targets on mobile | Ship 32px remove buttons on mobile |
| Sticky primary CTA above the tab bar on mobile | Hide the CTA below the fold on mobile |
| Write minimal, direct copy ("File too large") | Use filler, exclamations, or emoji in copy |
| Both Claude Orange Light and Claude Orange Dark at full fidelity | Ship a feature in only one mode |
| Only two themes — light `:root` and dark `.dark` | Add a neutral palette or third theme variant |
| Use lifted dark `--primary` for accents on dark surfaces | Copy light-mode `#C15F3C` verbatim into dark mode |
| Claude Orange only — no second accent color | Introduce teal, indigo, or any second brand color |
| Use `cn()` for conditional Tailwind classes | Use template literal interpolation for class names |
| Use status tokens (`text-success`, `bg-warning/10`) | Hardcode `text-green-600` or `text-amber-500` inline |

---

*Keep this guide open when designing or implementing UI. When the product evolves, this guide must follow before the code does.*
