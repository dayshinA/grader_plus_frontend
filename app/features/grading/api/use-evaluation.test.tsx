import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { evaluationsService } from "~/features/grading/api/evaluations.service";
import { useEvaluation } from "~/features/grading/api/use-evaluation";
import { ApiError } from "~/lib/api-client";

vi.mock("~/features/grading/api/evaluations.service", () => ({
  evaluationsService: {
    getOwn: vi.fn(),
    start: vi.fn(),
    update: vi.fn(),
    saveScore: vi.fn(),
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function apiError(statusCode: number, code: string) {
  return new ApiError({ success: false, statusCode, code, message: code });
}

/**
 * The one piece of real branching in the marker data layer, and the one most likely to be
 * "simplified" into a bug later: two different 404s on the same route mean opposite things.
 */
describe("useEvaluation", () => {
  // Without this the "never called" assertion below passes on call history left by the two
  // tests above it — the same leak found in two of last session's new test files.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("treats EVALUATION_NOT_FOUND as 'not started yet', not as an error", async () => {
    vi.mocked(evaluationsService.getOwn).mockRejectedValue(
      apiError(404, "EVALUATION_NOT_FOUND"),
    );

    const { result } = renderHook(() => useEvaluation("m1", "s1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it("lets STUDENT_NOT_FOUND through as a real error", async () => {
    // Same status code, opposite meaning: this is BlindIsolationGuard refusing a student the
    // caller holds no assignment for. Swallowing it would show an empty scoring form inviting a
    // marker to start work on someone else's project.
    vi.mocked(evaluationsService.getOwn).mockRejectedValue(apiError(404, "STUDENT_NOT_FOUND"));

    const { result } = renderHook(() => useEvaluation("m1", "s1"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });

  it("does not fire until both the module and the student are known", () => {
    const { result } = renderHook(() => useEvaluation(undefined, "s1"), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(evaluationsService.getOwn).not.toHaveBeenCalled();
  });
});
