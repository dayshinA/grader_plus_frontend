import { describe, expect, it, vi } from "vitest";

import { discrepancyService } from "~/features/discrepancy/api/discrepancy.service";
import { api } from "~/lib/api-client";

vi.mock("~/lib/api-client", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  apiWithMessage: { post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe("discrepancyService", () => {
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
});
