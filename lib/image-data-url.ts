/**
 * Convert raw image bytes to a base64 data URL for use as an <img> src.
 *
 * Preferred over URL.createObjectURL for preview overlays: data URLs need no
 * revoke lifecycle, which avoids a React StrictMode bug where an effect cleanup
 * revokes a memoized object URL while it is still referenced (leaving a broken
 * image after unmount/remount, e.g. switching edit tabs).
 */
export function bytesToDataUrl(
  bytes: Uint8Array,
  mimeType = "image/png"
): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}
