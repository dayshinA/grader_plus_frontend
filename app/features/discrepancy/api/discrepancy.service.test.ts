import { beforeEach, describe, expect, it, vi } from "vitest";

import { discrepancyService } from "~/features/discrepancy/api/discrepancy.service";
import { api, apiWithMessage } from "~/lib/api-client";

vi.mock("~/lib/api-client", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  apiWithMessage: { post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe("discrepancyService", () => {
  // Call history accumulates across cases in a file otherwise, which breaks the
  // "this call went through X and never Y" assertions below.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getCases calls GET /academic-modules/:moduleId/discrepancy-cases", async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    await discrepancyService.getCases("m1");

    expect(api.get).toHaveBeenCalledWith("/academic-modules/m1/discrepancy-cases");
  });

  it("sends no status filter — the tabs filter one fetch client-side", async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    await discrepancyService.getCases("m1");

    expect(vi.mocked(api.get).mock.calls[0][0]).not.toContain("status");
  });

  it("resolveCase PATCHes the case's resolve route with the agreed mark", async () => {
    vi.mocked(apiWithMessage.patch).mockResolvedValue({ data: {}, message: "ok" });

    await discrepancyService.resolveCase("m1", "case4", 67.5);

    expect(apiWithMessage.patch).toHaveBeenCalledWith(
      "/academic-modules/m1/discrepancy-cases/case4/resolve",
      { agreedMark: 67.5 },
    );
  });

  it("resolveCase goes through apiWithMessage, so the backend's confirmation reaches the toast", async () => {
    vi.mocked(apiWithMessage.patch).mockResolvedValue({ data: {}, message: "ok" });

    await discrepancyService.resolveCase("m1", "case4", 70);

    expect(api.patch).not.toHaveBeenCalled();
  });
});
