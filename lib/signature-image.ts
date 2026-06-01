/** Trim and export signature canvases as transparent PNG bytes. */

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
