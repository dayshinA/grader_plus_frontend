// For the raw-body downloads. A submission is a signed URL, so see `downloadUrlInNewTab`.
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

export function downloadCsv(csv: string, fileName: string): void {
  downloadBlob(csv, fileName, "text/csv;charset=utf-8;");
}

// `noopener` and `noreferrer`, because the target is another host.
export function downloadUrlInNewTab(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}
