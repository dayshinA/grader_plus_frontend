import axios from "axios";
import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { config } from "~/lib/config";

export interface ApiSuccessResponse<T> {
  success: true;
  statusCode: number;
  code: string;
  message: string;
  data?: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  code: string;
  message: string;
  errors?: { field: string; message: string }[];
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly errors?: { field: string; message: string }[];

  constructor(response: ApiErrorResponse) {
    super(response.message);
    this.name = "ApiError";
    this.statusCode = response.statusCode;
    this.code = response.code;
    this.errors = response.errors;
  }

  /**
   * The backend's `errors: [{ field, message }]` array as a field → messages map, which is the
   * shape the shared form components (`FormField`, `FormError`) read. Derived rather than stored
   * so `errors` stays the single source of truth.
   */
  get fieldErrors(): Record<string, string[]> {
    const map: Record<string, string[]> = {};
    for (const entry of this.errors ?? []) {
      (map[entry.field] ??= []).push(entry.message);
    }
    return map;
  }

  /** First message for a field, for wiring straight into a form field's `error` slot. */
  fieldError(field: string): string | undefined {
    return this.errors?.find((entry) => entry.field === field)?.message;
  }
}

/** Narrows an unknown rejection to the one error type every caller in this app has to handle. */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * CH-17 (Phase 4): under the RBAC model, a caller who lacks the relevant permission gets a bare
 * 403 from a **list** endpoint (e.g. `GET /academic-modules` for a department-scoped Coordinator
 * whose grant doesn't carry `modules.view`, or any Mode B list for a user with zero role
 * assignments), not the old model's `200 []`. On a list/collection read, treat this as "nothing to
 * show" and render the screen's normal empty state rather than an error banner.
 *
 * ⚠️ **Reads only.** A 403 on a *write* (create/update/delete) is a real failure — surfacing it as
 * a quiet empty state would make a rejected action look like it silently succeeded. Never call
 * this to decide how a mutation's error renders.
 */
export function is403(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === 403;
}

/** Shape of POST /auth/refresh's unwrapped data — kept domain-agnostic here (api-client never imports the auth feature, see configureApiClient below). */
export interface RefreshedSession {
  access_token: string;
  expires_in: number;
  user: unknown;
}

// Token/session storage lives here, not in AuthProvider's React state. A
// protected route's `clientLoader` can run — and, on a hard reload, does run
// — before `AuthProvider` has mounted at all (React Router's SPA data router
// doesn't render the route tree, including root.tsx's <AuthProvider>, until
// every matched route's clientLoader resolves). A callback-based `getToken`
// supplied by AuthProvider wouldn't be wired yet at that point. Keeping the
// token as module state here means it's available regardless of mount order
// — see `ensureSessionBootstrap` below, which a clientLoader calls directly.
let currentToken: string | null = null;
let currentSession: RefreshedSession | null = null;

function getToken(): string | null {
  return currentToken;
}

/** Set on login and on any successful refresh. */
export function setSession(session: RefreshedSession | null): void {
  currentSession = session;
  currentToken = session?.access_token ?? null;
}

/** The last successfully (re)hydrated session, if any — read by AuthProvider
 * after `ensureSessionBootstrap` settles, and by a clientLoader to decide
 * whether it's safe to make its own authenticated request. */
export function getCurrentSession(): RefreshedSession | null {
  return currentSession;
}

export function clearSession(): void {
  setSession(null);
}

let onUnauthorized: () => void = () => {};
let onTokenRefreshed: (session: RefreshedSession) => void = () => {};

/** Wired by AuthProvider so api-client never imports the auth feature directly. */
export function configureApiClient(handlers: {
  onUnauthorized: () => void;
  onTokenRefreshed: (session: RefreshedSession) => void;
}) {
  onUnauthorized = handlers.onUnauthorized;
  onTokenRefreshed = handlers.onTokenRefreshed;
}

const REQUEST_TIMEOUT_MS = 30_000;
const REFRESH_URL = "/auth/refresh";

// `adapter: "fetch"` pins axios to the same fetch primitive in every
// environment (browser, tests) instead of letting it pick xhr/http per
// runtime — keeps behavior identical across dev/prod and lets tests stub
// global fetch directly (axios ^1.7+).
//
// `withCredentials: true` is required for the refresh_token httpOnly cookie
// (login/refresh/change-password/logout all set or clear it via Set-Cookie)
// to be stored/sent at all on this cross-origin dev setup — without it the
// browser silently drops the cookie even though the backend sends it. Safe
// to set globally rather than per-endpoint: the cookie itself is scoped
// `path: /auth` server-side, so the browser only ever actually attaches it
// to /auth/* requests regardless of this instance-wide setting (see
// front-end-back-end-guide.md §1.2).
const axiosInstance: AxiosInstance = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: REQUEST_TIMEOUT_MS,
  adapter: "fetch",
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  (requestConfig: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token) {
      requestConfig.headers.set("Authorization", `Bearer ${token}`);
    }
    return requestConfig;
  },
);

function hadTokenOnRequest(requestConfig?: AxiosRequestConfig): boolean {
  return Boolean(
    (requestConfig?.headers as { get?: (name: string) => unknown } | undefined)
      ?.get?.("Authorization"),
  );
}

/**
 * Only a 401 on a request that carried a token means "the session died" — a
 * 401 on an unauthenticated call (e.g. a wrong-password POST /auth/login,
 * which is @Public() and never had a token to begin with) is just a normal
 * auth-failure response for that call, not a session-expiry event.
 */
function throwApiError(envelope: ApiErrorResponse, hadToken: boolean): never {
  if (envelope.statusCode === 401 && hadToken) {
    onUnauthorized();
  }
  throw new ApiError(envelope);
}

function isErrorEnvelope(data: unknown): data is ApiErrorResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "success" in data &&
    (data as { success: unknown }).success === false
  );
}

let refreshPromise: Promise<boolean> | null = null;

/**
 * Single-flight token refresh: the mount-time bootstrap, the proactive
 * expiry timer, and the reactive 401 handler below all join this same
 * in-flight request instead of firing their own. The backend treats a
 * second concurrent /auth/refresh call with the same cookie as token
 * reuse/theft and revokes the *entire* refresh chain (see
 * front-end-back-end-guide.md §1.2) — deduping here isn't just an
 * optimization, a race would force every caller to re-login.
 */
export function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = axiosInstance
      .post<RefreshedSession>(REFRESH_URL)
      .then((response) => {
        // Set unconditionally, before the callback — the callback may not be
        // wired yet (AuthProvider hasn't mounted, see the token-storage note
        // above), but the session must still be available to whoever called
        // this (e.g. a clientLoader's own ensureSessionBootstrap awaiter).
        setSession(response.data);
        onTokenRefreshed(response.data);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

let bootstrapPromise: Promise<boolean> | null = null;

/**
 * Session-recovery attempt made exactly once per page load: whichever caller
 * asks first — AuthProvider's mount effect, or a protected route's
 * `clientLoader` (which can run *before* AuthProvider mounts on a hard
 * reload, see the token-storage note above) — triggers the actual
 * `refreshSession()` call; everyone else joins the same promise via this
 * cache. Call this (and check `getCurrentSession()` afterward) at the top of
 * any protected route's `clientLoader` before making its own authenticated
 * request — see `ensureAuthenticated()` in `~/features/auth/utils.ts`.
 */
export function ensureSessionBootstrap(): Promise<boolean> {
  if (!bootstrapPromise) {
    bootstrapPromise = refreshSession();
  }
  return bootstrapPromise;
}

/**
 * Test-only. `bootstrapPromise` is deliberately a once-per-page-load cache, and
 * nothing in the app should ever clear it — but a test file shares one module
 * instance across all its cases, so without this the *first* test to mount
 * `AuthProvider` fixes the bootstrap result for every test after it (a suite
 * whose first case has no session would silently never exercise recovery
 * again). Call from `beforeEach`, never from application code.
 */
export function resetSessionBootstrapForTests(): void {
  bootstrapPromise = null;
  refreshPromise = null;
}

/** Stashed on the axios response by the interceptor below, before `response.data` is
 * overwritten with the unwrapped payload — lets `apiWithMessage` recover the backend's
 * own confirmation message (e.g. "User deactivated successfully.") without changing
 * what every existing `api.<verb>()` caller receives. */
const API_MESSAGE_KEY = "__apiMessage" as const;
type ResponseWithApiMessage = AxiosResponse & { [API_MESSAGE_KEY]?: string };

// Every backend response (success or failure) is wrapped in an envelope
// (`{ success, statusCode, code, message, data? }`) — this interceptor is the
// single place that unwraps it, so every `api.<verb>()` call below returns
// the inner `data` directly and every failure (whatever HTTP status it
// arrived on) surfaces as the same `ApiError`.
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    const envelope = response.data as
      | ApiSuccessResponse<unknown>
      | ApiErrorResponse;
    if (!envelope.success) {
      throwApiError(envelope, hadTokenOnRequest(response.config));
    }
    (response as ResponseWithApiMessage)[API_MESSAGE_KEY] = envelope.message;
    response.data = envelope.data;
    return response;
  },
  (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const isRefreshCall = originalRequest?.url === REFRESH_URL;
    // The refresh call itself never triggers onUnauthorized or a retry —
    // its own failure is reported back through refreshSession()'s return
    // value, and the caller (bootstrap/timer/this interceptor) decides what
    // to do with it. Without this guard a failed refresh would recurse.
    const hadToken = !isRefreshCall && hadTokenOnRequest(originalRequest);

    if (
      error.response?.status === 401 &&
      hadToken &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      return refreshSession().then((refreshed) => {
        if (refreshed) {
          const token = getToken();
          if (token) {
            originalRequest.headers.set("Authorization", `Bearer ${token}`);
          }
          return axiosInstance(originalRequest);
        }
        onUnauthorized();
        throw new ApiError({
          success: false,
          statusCode: 401,
          code: "UNAUTHORIZED",
          message: "Your session has expired.",
        });
      });
    }

    if (isErrorEnvelope(error.response?.data)) {
      throwApiError(error.response.data, hadToken);
    }

    // No envelope to unwrap here: network failure, timeout, or a response
    // body that isn't JSON. Surface a consistent ApiError rather than
    // leaking a raw AxiosError to callers.
    throw new ApiError({
      success: false,
      statusCode: error.response?.status ?? 0,
      code: "NETWORK_ERROR",
      message: error.message || "Network error — check your connection.",
    });
  },
);

/**
 * Typed request helpers — each returns the unwrapped `data` payload directly
 * (already unwrapped by the response interceptor above), never the envelope.
 */
export const api = {
  get: async <T>(url: string, requestConfig?: AxiosRequestConfig): Promise<T> => {
    const response = await axiosInstance.get<T>(url, requestConfig);
    return response.data;
  },

  post: async <T>(
    url: string,
    data?: unknown,
    requestConfig?: AxiosRequestConfig,
  ): Promise<T> => {
    const response = await axiosInstance.post<T>(url, data, requestConfig);
    return response.data;
  },

  patch: async <T>(
    url: string,
    data?: unknown,
    requestConfig?: AxiosRequestConfig,
  ): Promise<T> => {
    const response = await axiosInstance.patch<T>(url, data, requestConfig);
    return response.data;
  },

  delete: async <T>(url: string, requestConfig?: AxiosRequestConfig): Promise<T> => {
    const response = await axiosInstance.delete<T>(url, requestConfig);
    return response.data;
  },
};

export interface ApiResult<T> {
  data: T;
  /** The backend's own confirmation message for this response (e.g. "User deactivated
   * successfully.") — surface this in a success toast per SYSTEM_DESIGN.md decision #31,
   * rather than a hand-written string, so the UI always says exactly what the backend did. */
  message: string;
}

/**
 * Same requests as `api.<verb>()`, but resolves `{ data, message }` instead of bare
 * `data` — for mutations whose result the UI shows back to the user (see decision #31's
 * "Action feedback" convention: success toasts use the backend's own `message`, not a
 * hand-written one). Prefer plain `api.<verb>()` for reads/anything whose result isn't
 * shown as a confirmation.
 */
export const apiWithMessage = {
  post: async <T>(
    url: string,
    data?: unknown,
    requestConfig?: AxiosRequestConfig,
  ): Promise<ApiResult<T>> => {
    const response = (await axiosInstance.post<T>(url, data, requestConfig)) as ResponseWithApiMessage;
    return { data: response.data as T, message: response[API_MESSAGE_KEY] ?? "" };
  },

  patch: async <T>(
    url: string,
    data?: unknown,
    requestConfig?: AxiosRequestConfig,
  ): Promise<ApiResult<T>> => {
    const response = (await axiosInstance.patch<T>(url, data, requestConfig)) as ResponseWithApiMessage;
    return { data: response.data as T, message: response[API_MESSAGE_KEY] ?? "" };
  },

  delete: async <T>(
    url: string,
    requestConfig?: AxiosRequestConfig,
  ): Promise<ApiResult<T>> => {
    const response = (await axiosInstance.delete<T>(url, requestConfig)) as ResponseWithApiMessage;
    return { data: response.data as T, message: response[API_MESSAGE_KEY] ?? "" };
  },
};
