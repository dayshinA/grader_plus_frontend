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
}

/** Shape of POST /auth/refresh's unwrapped data — kept domain-agnostic here (api-client never imports the auth feature, see configureApiClient below). */
export interface RefreshedSession {
  access_token: string;
  expires_in: number;
  user: unknown;
}

let getToken: () => string | null = () => null;
let onUnauthorized: () => void = () => {};
let onTokenRefreshed: (session: RefreshedSession) => void = () => {};

/** Wired by AuthProvider so api-client never imports the auth feature directly. */
export function configureApiClient(handlers: {
  getToken: () => string | null;
  onUnauthorized: () => void;
  onTokenRefreshed: (session: RefreshedSession) => void;
}) {
  getToken = handlers.getToken;
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
