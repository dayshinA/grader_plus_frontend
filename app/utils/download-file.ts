/**
 * Hands the browser a file built in memory, without a round trip.
 *
 * Extracted from `bulk-import-page.tsx`'s local copy on 2026-08-10, when the Grades screen's
 * Learn CSV export became a second caller. Both cases are the same shape: bytes already in hand
 * (one built client-side from an import result, one streamed back by `GET .../export`) that need
 * to land in the user's downloads folder under a chosen name.
 *
 * Not used for the *submission* downloads on the Submissions screen — those are presigned R2 URLs
 * where the bytes deliberately never pass through this app, so the browser is sent straight at the
 * URL instead. See `downloadUrlInNewTab`.
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

/** `downloadBlob` with the CSV mime type filled in — the only type either caller produces. */
export function downloadCsv(csv: string, fileName: string): void {
  downloadBlob(csv, fileName, "text/csv;charset=utf-8;");
}

/**
 * Sends the browser at a URL the server owns — for the presigned R2 links behind a submission
 * download, whose whole point is that the file bytes never touch this app.
 *
 * `noopener`/`noreferrer` because the target is a storage host, not our own origin, and the opened
 * context should get no handle back on this window.
 */
export function downloadUrlInNewTab(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}
