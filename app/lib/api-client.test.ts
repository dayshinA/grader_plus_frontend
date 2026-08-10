import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  api,
  ApiError,
  clearSession,
  configureApiClient,
  parseContentDispositionFilename,
  refreshSession,
  setSession,
} from "~/lib/api-client";

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function authHeaderFrom(requestInit: RequestInit | Request): string | null {
  const headers = new Headers(
    requestInit instanceof Request ? requestInit.headers : requestInit.headers,
  );
  return headers.get("Authorization");
}

function urlFrom(input: unknown): string {
  return input instanceof Request ? input.url : String(input);
}

const noopHandlers = {
  onUnauthorized: () => {},
  onTokenRefreshed: () => {},
};

describe("api client", () => {
  beforeEach(() => {
    configureApiClient(noopHandlers);
    // Token/session storage is module state in api-client.ts now (not reset
    // by configureApiClient itself) — clear it between tests for isolation.
    clearSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns unwrapped data on a successful envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            success: true,
            statusCode: 200,
            code: "SUCCESS",
            message: "ok",
            data: { id: "1" },
          },
          200,
        ),
      ),
    );

    const result = await api.get<{ id: string }>("/auth/login");

    expect(result).toEqual({ id: "1" });
  });

  it("throws ApiError on a failed envelope, branching on success not status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            success: false,
            statusCode: 401,
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          },
          200, // deliberately mismatched HTTP status to prove we branch on `success`
        ),
      ),
    );

    await expect(api.get("/auth/login")).rejects.toMatchObject(
      new ApiError({
        success: false,
        statusCode: 401,
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      }),
    );
  });

  it("does not fire the unauthorized callback on a 401 from an unauthenticated request (e.g. wrong-password login)", async () => {
    const onUnauthorized = vi.fn();
    configureApiClient({ ...noopHandlers, onUnauthorized });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            success: false,
            statusCode: 401,
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          },
          401,
        ),
      ),
    );

    await expect(api.post("/auth/login", { email: "x", password: "y" })).rejects.toThrow(
      ApiError,
    );

    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("attaches the Authorization header when a token is present", async () => {
    setSession({ access_token: "abc123", expires_in: 3600, user: {} });
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(
          { success: true, statusCode: 200, code: "SUCCESS", message: "ok" },
          200,
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await api.get("/protected");

    const [urlOrRequest, requestInit] = fetchMock.mock.calls[0];
    expect(authHeaderFrom(requestInit ?? urlOrRequest)).toBe("Bearer abc123");
  });

  it("surfaces a network failure (no response) as an ApiError instead of throwing a raw error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(api.get("/auth/login")).rejects.toThrow(ApiError);
  });

  it("sends a JSON body on api.post", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(
          { success: true, statusCode: 201, code: "CREATED", message: "ok", data: { id: "2" } },
          201,
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await api.post<{ id: string }>("/auth/change-password", {
      currentPassword: "old",
      newPassword: "new",
    });

    expect(result).toEqual({ id: "2" });
    const [urlOrRequest, requestInit] = fetchMock.mock.calls[0];
    const init = requestInit ?? urlOrRequest;
    const body = init instanceof Request ? await init.clone().text() : (init as RequestInit).body;
    expect(JSON.parse(body as string)).toEqual({
      currentPassword: "old",
      newPassword: "new",
    });
  });

  describe("token refresh", () => {
    it("on a 401 with a token, refreshes once and retries the original request with the new token", async () => {
      const onTokenRefreshed = vi.fn();
      configureApiClient({
        onUnauthorized: vi.fn(),
        onTokenRefreshed,
      });
      // refreshSession() sets the current token itself (see api-client.ts) —
      // this just seeds the *original* request's token so it's eligible for
      // the retry-on-401 path (hadTokenOnRequest must be true).
      setSession({ access_token: "old-token", expires_in: 3600, user: {} });

      let protectedCallCount = 0;
      const fetchMock = vi.fn((input: unknown) => {
        const url = urlFrom(input);
        if (url.includes("/auth/refresh")) {
          return Promise.resolve(
            jsonResponse(
              {
                success: true,
                statusCode: 200,
                code: "TOKEN_REFRESHED",
                message: "ok",
                data: { access_token: "new-token", expires_in: 3600, user: { id: "u1" } },
              },
              200,
            ),
          );
        }
        if (url.includes("/protected")) {
          protectedCallCount += 1;
          if (protectedCallCount === 1) {
            return Promise.resolve(
              jsonResponse(
                { success: false, statusCode: 401, code: "UNAUTHORIZED", message: "expired" },
                401,
              ),
            );
          }
          return Promise.resolve(
            jsonResponse(
              { success: true, statusCode: 200, code: "SUCCESS", message: "ok", data: { value: "ok" } },
              200,
            ),
          );
        }
        throw new Error(`unexpected fetch call: ${url}`);
      });
      vi.stubGlobal("fetch", fetchMock);

      const result = await api.get<{ value: string }>("/protected");

      expect(result).toEqual({ value: "ok" });
      expect(onTokenRefreshed).toHaveBeenCalledOnce();
      expect(protectedCallCount).toBe(2);

      const retryCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1] as [
        unknown,
        unknown?,
      ];
      expect(authHeaderFrom((retryCall[1] ?? retryCall[0]) as RequestInit | Request)).toBe(
        "Bearer new-token",
      );
    });

    it("calls onUnauthorized exactly once and rejects if the refresh attempt also fails", async () => {
      const onUnauthorized = vi.fn();
      configureApiClient({ onUnauthorized, onTokenRefreshed: () => {} });
      setSession({ access_token: "old-token", expires_in: 3600, user: {} });

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(
            { success: false, statusCode: 401, code: "UNAUTHORIZED", message: "x" },
            401,
          ),
        ),
      );

      await expect(api.get("/protected")).rejects.toThrow(ApiError);

      expect(onUnauthorized).toHaveBeenCalledOnce();
    });

    it("dedupes concurrent refreshSession() calls into a single request (backend treats a race as token reuse)", async () => {
      configureApiClient(noopHandlers);
      let refreshCallCount = 0;
      vi.stubGlobal(
        "fetch",
        vi.fn((input: unknown) => {
          if (urlFrom(input).includes("/auth/refresh")) {
            refreshCallCount += 1;
          }
          return Promise.resolve(
            jsonResponse(
              {
                success: true,
                statusCode: 200,
                code: "TOKEN_REFRESHED",
                message: "ok",
                data: { access_token: "t2", expires_in: 3600, user: {} },
              },
              200,
            ),
          );
        }),
      );

      const [first, second] = await Promise.all([refreshSession(), refreshSession()]);

      expect(first).toBe(true);
      expect(second).toBe(true);
      expect(refreshCallCount).toBe(1);
    });

    it("refreshSession() resolves false (not a throw) when the refresh call fails", async () => {
      configureApiClient(noopHandlers);
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(
            { success: false, statusCode: 401, code: "UNAUTHORIZED", message: "Invalid or expired refresh token" },
            401,
          ),
        ),
      );

      await expect(refreshSession()).resolves.toBe(false);
    });
  });
});

describe("parseContentDispositionFilename", () => {
  it("reads the quoted form the backend produces", () => {
    expect(
      parseContentDispositionFilename('attachment; filename="COP511-grades.csv"'),
    ).toBe("COP511-grades.csv");
  });

  it("reads the bare, unquoted form too", () => {
    expect(parseContentDispositionFilename("attachment; filename=grades.csv")).toBe(
      "grades.csv",
    );
  });

  it("is null when the header is missing, so callers use their own fallback name", () => {
    expect(parseContentDispositionFilename(undefined)).toBeNull();
    expect(parseContentDispositionFilename(null)).toBeNull();
  });

  it("is null when the header carries no filename at all", () => {
    expect(parseContentDispositionFilename("attachment")).toBeNull();
  });

  it("is null for an empty filename rather than returning an empty string", () => {
    expect(parseContentDispositionFilename('attachment; filename=""')).toBeNull();
  });
});

describe("api.getRaw", () => {
  beforeEach(() => {
    configureApiClient(noopHandlers);
    clearSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a non-envelope body untouched instead of throwing", async () => {
    // The whole point of the raw path. `GET .../export` returns bare text/csv, which has no
    // `success` field — through the normal interceptor that reads as a *failed* envelope and a
    // perfectly good CSV surfaces as an ApiError with an undefined statusCode.
    const csv = "Learn ID,Final Grade\nL2048,67.5\n";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="COP511-grades.csv"',
          },
        }),
      ),
    );

    const result = await api.getRaw<string>("/academic-modules/m1/export");

    expect(result.data).toBe(csv);
    expect(result.filename).toBe("COP511-grades.csv");
  });

  it("falls back to a null filename when the response carries no Content-Disposition", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("a,b\n", {
          status: 200,
          headers: { "Content-Type": "text/csv" },
        }),
      ),
    );

    const result = await api.getRaw<string>("/academic-modules/m1/export");

    expect(result.filename).toBeNull();
  });

  it("still throws a real ApiError, with its code, when the raw route itself fails", async () => {
    // A failure on this route arrives as an ordinary JSON envelope, and must keep its code —
    // this is why `responseType: "text"` is deliberately not set on the request.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(
          {
            success: false,
            statusCode: 403,
            code: "FORBIDDEN",
            message: "You cannot export this module's grades.",
          },
          403,
        ),
      ),
    );

    await expect(api.getRaw<string>("/academic-modules/m1/export")).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });
  });

  it("leaves the normal envelope path alone — api.get still unwraps to data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(
          { success: true, statusCode: 200, code: "OK", message: "ok", data: [{ id: "g1" }] },
          200,
        ),
      ),
    );

    await expect(api.get("/academic-modules/m1/grades")).resolves.toEqual([{ id: "g1" }]);
  });
});
