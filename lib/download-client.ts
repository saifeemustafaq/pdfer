/**
 * Browser-only blob download helper (see DEVELOPER_GUIDE §20).
 */
export function triggerBlobDownload(
  blob: Blob,
  filename: string,
  delayMs = 0
): void {
  const run = () => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (delayMs > 0) {
    setTimeout(run, delayMs);
  } else {
    run();
  }
}
