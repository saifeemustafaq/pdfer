import { ACCEPTED_CONVERTIBLE_IMAGE_TYPES } from "@/lib/constants";

/** Extensions for the image types we accept, used to name clipboard blobs. */
const IMAGE_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

function isAcceptedImageType(type: string): boolean {
  return (ACCEPTED_CONVERTIBLE_IMAGE_TYPES as readonly string[]).includes(type);
}

/** Wrap a clipboard image blob in a named File (clipboard blobs have no name). */
export function fileFromImageBlob(blob: Blob, index = 0): File {
  const ext = IMAGE_EXTENSION[blob.type] ?? "png";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const suffix = index > 0 ? `-${index + 1}` : "";
  return new File([blob], `pasted-image-${stamp}${suffix}.${ext}`, {
    type: blob.type || "image/png",
  });
}

/** Extract accepted image files from a paste-event DataTransfer (Cmd/Ctrl+V). */
export function extractImagesFromDataTransfer(
  data: DataTransfer | null
): File[] {
  if (!data) return [];
  const files: File[] = [];

  const items = data.items ? Array.from(data.items) : [];
  for (const item of items) {
    if (item.kind === "file" && isAcceptedImageType(item.type)) {
      const file = item.getAsFile();
      if (file) {
        files.push(file.name ? file : fileFromImageBlob(file, files.length));
      }
    }
  }

  if (files.length === 0 && data.files) {
    for (const file of Array.from(data.files)) {
      if (isAcceptedImageType(file.type)) files.push(file);
    }
  }

  return files;
}

/** Whether the async Clipboard read API (used by the paste button) is available. */
export function isClipboardReadSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.clipboard &&
    typeof navigator.clipboard.read === "function" &&
    typeof window !== "undefined" &&
    typeof window.ClipboardItem !== "undefined"
  );
}

/** Read accepted images from the async Clipboard API (paste button path). */
export async function readImagesFromClipboard(): Promise<File[]> {
  if (!isClipboardReadSupported()) {
    throw new Error("Clipboard read is not supported in this browser.");
  }

  const items = await navigator.clipboard.read();
  const files: File[] = [];
  for (const item of items) {
    const type = item.types.find(isAcceptedImageType);
    if (type) {
      const blob = await item.getType(type);
      files.push(fileFromImageBlob(blob, files.length));
    }
  }
  return files;
}
