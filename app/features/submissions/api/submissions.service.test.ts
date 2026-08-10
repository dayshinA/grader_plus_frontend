import { describe, expect, it, vi } from "vitest";

import { submissionsService } from "~/features/submissions/api/submissions.service";
import { api, apiWithMessage } from "~/lib/api-client";

vi.mock("~/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("~/lib/api-client")>("~/lib/api-client");
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
    apiWithMessage: { post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

describe("submissionsService", () => {
  it("listForStudent calls the nested student submissions route", async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    await submissionsService.listForStudent("m1", "s1");

    expect(api.get).toHaveBeenCalledWith(
      "/academic-modules/m1/students/s1/submissions",
    );
  });

  it("getDownloadUrl calls the per-submission download route", async () => {
    vi.mocked(api.get).mockResolvedValue({ url: "https://r2/x" });

    await submissionsService.getDownloadUrl("m1", "s1", "sub7");

    expect(api.get).toHaveBeenCalledWith(
      "/academic-modules/m1/students/s1/submissions/sub7/download",
    );
  });

  it("bulkUpload posts multipart FormData under the field name the backend expects", async () => {
    vi.mocked(apiWithMessage.post).mockResolvedValue({ data: {}, message: "ok" });
    const file = new File(["zip bytes"], "cohort.zip", { type: "application/zip" });

    await submissionsService.bulkUpload("m1", file);

    const [url, body] = vi.mocked(apiWithMessage.post).mock.calls.at(-1)!;
    expect(url).toBe("/academic-modules/m1/submissions/bulk-upload");
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get("file")).toBe(file);
  });

  it("bulkUpload sets no Content-Type, so the browser generates the multipart boundary", async () => {
    vi.mocked(apiWithMessage.post).mockResolvedValue({ data: {}, message: "ok" });

    await submissionsService.bulkUpload("m1", new File([""], "c.zip"));

    // A hand-set multipart Content-Type omits the boundary parameter and the upload fails
    // server-side — the third argument must stay absent.
    const call = vi.mocked(apiWithMessage.post).mock.calls.at(-1)!;
    expect(call[2]).toBeUndefined();
  });
});
