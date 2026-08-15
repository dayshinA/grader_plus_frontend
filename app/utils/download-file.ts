/**
 * Hands the browser a file already in memory.
 *
 * Used by the two export downloads and the per project feedback document, which come back
 * from the API as raw bodies rather than JSON. Not used for a submission: those are signed
 * storage URLs whose whole point is that the bytes never pass through this app, so the
 * browser is sent straight at them. See `downloadUrlInNewTab`.
 */
export function downloadBlob(content: BlobPart, fileName: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  // Firefox ignores a click on an anchor that was never inserted into the document.
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** `downloadBlob` with the CSV mime type filled in, for the grade export. */
export function downloadCsv(csv: string, fileName: string): void {
  downloadBlob(csv, fileName, "text/csv;charset=utf-8;");
}

/**
 * Sends the browser at a URL the server owns, for the short lived signed links behind a
 * submission download.
 *
 * `noopener` and `noreferrer` because the target is a storage host rather than this origin,
 * and the opened context should get no handle back on this window.
 */
export function downloadUrlInNewTab(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}
