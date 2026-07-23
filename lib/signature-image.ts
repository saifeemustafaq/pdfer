/** Trim and export signature canvases as transparent PNG bytes. */

export type SignatureCanvasSize = "compact" | "large";

const SIGNATURE_LINE_WIDTH: Record<SignatureCanvasSize, number> = {
  compact: 2.5,
  large: 3.5,
};

/** Prepare a signature canvas for drawing (clears existing content). */
export function initSignatureCanvas(
  canvas: HTMLCanvasElement,
  inkColor: string,
  size: SignatureCanvasSize = "compact"
): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = Math.max(1, Math.floor(width * dpr));
  canvas.height = Math.max(1, Math.floor(height * dpr));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(dpr, dpr);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = SIGNATURE_LINE_WIDTH[size];
  ctx.strokeStyle = inkColor;
  return ctx;
}

/** Draw an existing PNG signature onto a canvas (scaled to fit). */
export async function loadPngOntoCanvas(
  canvas: HTMLCanvasElement,
  png: Uint8Array,
  inkColor: string,
  size: SignatureCanvasSize = "compact"
): Promise<boolean> {
  const ctx = initSignatureCanvas(canvas, inkColor, size);
  if (!ctx) return false;

  try {
    const bitmap = await createImageBitmap(
      new Blob([png.buffer as ArrayBuffer], { type: "image/png" })
    );
    const pad = 12;
    const maxW = Math.max(1, canvas.clientWidth - pad * 2);
    const maxH = Math.max(1, canvas.clientHeight - pad * 2);
    const scale = Math.min(maxW / bitmap.width, maxH / bitmap.height, 1);
    const drawW = bitmap.width * scale;
    const drawH = bitmap.height * scale;
    const x = (canvas.clientWidth - drawW) / 2;
    const y = (canvas.clientHeight - drawH) / 2;

    ctx.drawImage(bitmap, x, y, drawW, drawH);
    bitmap.close();
    return hasCanvasInk(canvas);
  } catch (err) {
    console.error("loadPngOntoCanvas failed:", err);
    return false;
  }
}

export function hasCanvasInk(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  const { width, height } = canvas;
  if (width === 0 || height === 0) return false;

  const data = ctx.getImageData(0, 0, width, height).data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) return true;
  }
  return false;
}

type TrimBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

function findTrimBounds(imageData: ImageData): TrimBounds | null {
  const { data, width, height } = imageData;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha === 0) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) return null;

  const pad = 8;
  return {
    minX: Math.max(0, minX - pad),
    minY: Math.max(0, minY - pad),
    maxX: Math.min(width - 1, maxX + pad),
    maxY: Math.min(height - 1, maxY + pad),
  };
}

/** Export non-empty canvas strokes as a trimmed transparent PNG. */
export async function canvasToTrimmedPng(
  canvas: HTMLCanvasElement
): Promise<Uint8Array | null> {
  const ctx = canvas.getContext("2d");
  if (!ctx || !hasCanvasInk(canvas)) return null;

  const bounds = findTrimBounds(ctx.getImageData(0, 0, canvas.width, canvas.height));
  if (!bounds) return null;

  const trimmedWidth = bounds.maxX - bounds.minX + 1;
  const trimmedHeight = bounds.maxY - bounds.minY + 1;

  const trimmed = document.createElement("canvas");
  trimmed.width = trimmedWidth;
  trimmed.height = trimmedHeight;
  const trimmedCtx = trimmed.getContext("2d");
  if (!trimmedCtx) return null;

  trimmedCtx.drawImage(
    canvas,
    bounds.minX,
    bounds.minY,
    trimmedWidth,
    trimmedHeight,
    0,
    0,
    trimmedWidth,
    trimmedHeight
  );

  return new Promise((resolve) => {
    trimmed.toBlob(async (blob) => {
      if (!blob) {
        resolve(null);
        return;
      }
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, "image/png");
  });
}

/** Load an uploaded image file as PNG bytes (preserves transparency when present). */
export async function fileToSignaturePng(file: File): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read signature image.");

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const trimmed = await canvasToTrimmedPng(canvas);
  if (!trimmed) {
    throw new Error("Signature image is empty.");
  }
  return trimmed;
}

/**
 * Decode an uploaded image file onto a canvas at native size, without trimming
 * or altering pixels. Used as the pristine source for interactive background
 * removal so re-running the threshold never compounds quality loss.
 */
export async function decodeImageToCanvas(
  file: File
): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, bitmap.width);
    canvas.height = Math.max(1, bitmap.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not read signature image.");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    return canvas;
  } finally {
    bitmap.close();
  }
}

/** Width of the luminance ramp below the cutoff used to soften knocked-out edges. */
const KNOCKOUT_SOFT_BAND = 24;

/**
 * Map a 0-100 "background removal" strength to a luminance cutoff. Higher
 * strength removes more (lighter grays), lower strength removes only near-white.
 * - strength 0   -> cutoff ~254 (only pure white)
 * - strength 100 -> cutoff ~180 (aggressive; light grays too)
 */
export function knockoutStrengthToCutoff(strength: number): number {
  const clamped = Math.max(0, Math.min(100, strength));
  return 254 - (clamped / 100) * (254 - 180);
}

/**
 * Return a new canvas with light backgrounds knocked out to transparency.
 * Pixels at/above the luminance cutoff become fully transparent; pixels within
 * a soft band just below the cutoff ramp their alpha for smooth edges; darker
 * pixels (the ink) are kept. Keys off brightness only, so colored ink survives
 * and any light background color is removed. Assumes a light background.
 */
export function applyWhiteKnockout(
  source: HTMLCanvasElement,
  strength: number
): HTMLCanvasElement {
  const width = source.width;
  const height = source.height;

  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;

  const srcCtx = source.getContext("2d");
  const outCtx = out.getContext("2d");
  if (!srcCtx || !outCtx || width === 0 || height === 0) return out;

  const image = srcCtx.getImageData(0, 0, width, height);
  const data = image.data;

  const cutoff = knockoutStrengthToCutoff(strength);
  const bandStart = cutoff - KNOCKOUT_SOFT_BAND;

  for (let i = 0; i < data.length; i += 4) {
    const originalAlpha = data[i + 3];
    if (originalAlpha === 0) continue;

    const luminance =
      0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

    if (luminance >= cutoff) {
      data[i + 3] = 0;
    } else if (luminance > bandStart) {
      const keep = (cutoff - luminance) / KNOCKOUT_SOFT_BAND;
      data[i + 3] = Math.round(originalAlpha * keep);
    }
  }

  outCtx.putImageData(image, 0, 0);
  return out;
}

/** Export a canvas as trimmed transparent PNG bytes (alpha-trims empty margins). */
export async function canvasToSignaturePng(
  canvas: HTMLCanvasElement
): Promise<Uint8Array> {
  const trimmed = await canvasToTrimmedPng(canvas);
  if (!trimmed) {
    throw new Error("Signature image is empty.");
  }
  return trimmed;
}
