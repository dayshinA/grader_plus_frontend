import { describe, expect, it, vi } from "vitest";

import { rubricsService } from "~/features/rubrics/api/rubrics.service";
import { isRubricMissing } from "~/features/rubrics/api/use-rubric";
import { ApiError, api } from "~/lib/api-client";

vi.mock("~/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("~/lib/api-client")>("~/lib/api-client");
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

describe("rubricsService", () => {
  it("getRubric calls GET /academic-modules/:moduleId/rubric", async () => {
    vi.mocked(api.get).mockResolvedValue({ id: "r1", criteria: [] });

    await rubricsService.getRubric("m1");

    expect(api.get).toHaveBeenCalledWith("/academic-modules/m1/rubric");
  });
});

describe("isRubricMissing", () => {
  function apiError(statusCode: number, code: string): ApiError {
    return new ApiError({ success: false, statusCode, code, message: code });
  }

  it("is true for the backend's RUBRIC_NOT_FOUND — a module whose rubric isn't built yet", () => {
    expect(isRubricMissing(apiError(404, "RUBRIC_NOT_FOUND"))).toBe(true);
  });

  it("is false for a module that doesn't exist, which is a real failure", () => {
    expect(isRubricMissing(apiError(404, "MODULE_NOT_FOUND"))).toBe(false);
  });

  it("is false for a 403 — handled separately by is403", () => {
    expect(isRubricMissing(apiError(403, "FORBIDDEN"))).toBe(false);
  });

  it("is false for a non-API error", () => {
    expect(isRubricMissing(new Error("network down"))).toBe(false);
  });
});
