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
  data: T;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  code: string;
  message: string;
  errors?: ApiFieldError[];
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly errors?: ApiFieldError[];

  constructor(response: ApiErrorResponse) {
    super(response.message);
    this.name = "ApiError";
    this.statusCode = response.statusCode;
    this.code = response.code;
    this.errors = response.errors;
  }

  /** `errors[].field` as a map, which is what the form components read. */
  get fieldErrors(): Record<string, string[]> {
    const map: Record<string, string[]> = {};
    for (const entry of this.errors ?? []) {
      (map[entry.field] ??= []).push(entry.message);
    }
    return map;
  }

  fieldError(field: string): string | undefined {
    return this.errors?.find((entry) => entry.field === field)?.message;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isStatus(error: unknown, statusCode: number): boolean {
  return error instanceof ApiError && error.statusCode === statusCode;
}

/** Out of scope, or the permission is not held. Never rendered as a not found. */
export function isForbidden(error: unknown): boolean {
  return isStatus(error, 403);
}

export function isNotFound(error: unknown): boolean {
  return isStatus(error, 404);
}

/** What `POST /auth/login` and `POST /auth/refresh` put in the body. */
export interface SessionResponse {
  access_token: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    fullName: string;
    mustChangePassword: boolean;
  };
}

// The access token lives here rather than in AuthProvider state. A clientLoader can run
// before the provider mounts on a hard reload, and module state is available either way.
// Never localStorage: a 15 minute token in storage outlives the tab it was issued to.
let currentSession: SessionResponse | null = null;

export function setSession(session: SessionResponse | null): void {
  currentSession = session;
}

export function getCurrentSession(): SessionResponse | null {
  return currentSession;
}

export function clearSession(): void {
  currentSession = null;
}

let onUnauthorized: () => void = () => {};
let onSessionRefreshed: (session: SessionResponse) => void = () => {};

/** Wired by AuthProvider so this file never imports a feature. */
export function configureApiClient(handlers: {
  onUnauthorized: () => void;
  onSessionRefreshed: (session: SessionResponse) => void;
}): void {
  onUnauthorized = handlers.onUnauthorized;
  onSessionRefreshed = handlers.onSessionRefreshed;
}

const REQUEST_TIMEOUT_MS = 30_000;
const REFRESH_URL = "/auth/refresh";

// withCredentials carries the httpOnly refresh cookie on the /auth routes that set it.
// Leave the adapter alone. Setting it to "fetch" breaks every upload that passes
// onUploadProgress: axios then streams the body as a ReadableStream, Chrome requires
// HTTP/2 for a streamed request body, and the dev backend is plain HTTP/1.1, so the
// request dies as ERR_ALPN_NEGOTIATION_FAILED before it leaves the browser.
const axiosInstance: AxiosInstance = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: REQUEST_TIMEOUT_MS,
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  (requestConfig: InternalAxiosRequestConfig) => {
    const token = currentSession?.access_token;
    if (token) {
      requestConfig.headers.set("Authorization", `Bearer ${token}`);
    }
    return requestConfig;
  },
);

function hadTokenOnRequest(requestConfig?: AxiosRequestConfig): boolean {
  const headers = requestConfig?.headers as
    { get?: (name: string) => unknown } | undefined;
  return Boolean(headers?.get?.("Authorization"));
}

function isErrorEnvelope(data: unknown): data is ApiErrorResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "success" in data &&
    (data as { success: unknown }).success === false
  );
}

function throwApiError(envelope: ApiErrorResponse, hadToken: boolean): never {
  if (envelope.statusCode === 401 && hadToken) {
    onUnauthorized();
  }
  throw new ApiError(envelope);
}

let refreshPromise: Promise<boolean> | null = null;

/**
 * Single flight. The backend rotates the refresh cookie on every use and treats a second
 * call with an already rotated token as a replay, revoking the whole chain. Two concurrent
 * 401s must therefore join one refresh rather than fire one each.
 */
export function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = axiosInstance
      .post<SessionResponse>(REFRESH_URL)
      .then((response) => {
        setSession(response.data);
        onSessionRefreshed(response.data);
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
 * The one session recovery attempt per page load. A hard refresh has no token in memory,
 * so the cookie is the only way back in, and whoever asks first triggers it.
 */
export function ensureSessionBootstrap(): Promise<boolean> {
  if (!bootstrapPromise) {
    bootstrapPromise = refreshSession();
  }
  return bootstrapPromise;
}

/** Test only. Nothing in the app should reset the once per load bootstrap. */
export function resetSessionBootstrapForTests(): void {
  bootstrapPromise = null;
  refreshPromise = null;
}

const API_MESSAGE_KEY = "__apiMessage" as const;
type ResponseWithApiMessage = AxiosResponse & { [API_MESSAGE_KEY]?: string };

// The two export downloads and GET /files answer with a raw body rather than the envelope.
const RAW_RESPONSE_KEY = "__rawResponse" as const;
type RawRequestConfig = AxiosRequestConfig & { [RAW_RESPONSE_KEY]?: boolean };

function isRawRequest(requestConfig?: AxiosRequestConfig): boolean {
  return Boolean(
    (requestConfig as RawRequestConfig | undefined)?.[RAW_RESPONSE_KEY],
  );
}

export function parseContentDispositionFilename(
  header: unknown,
): string | null {
  if (typeof header !== "string") return null;
  const match = /filename\s*=\s*(?:"([^"]*)"|([^;]+))/i.exec(header);
  const name = (match?.[1] ?? match?.[2])?.trim();
  return name ? name : null;
}

export interface RawApiResult<T> {
  data: T;
  /** From Content-Disposition, or null when the response carried none. */
  filename: string | null;
}

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    if (isRawRequest(response.config)) return response;

    const envelope = response.data as
      ApiSuccessResponse<unknown> | ApiErrorResponse;
    if (!envelope.success) {
      throwApiError(envelope, hadTokenOnRequest(response.config));
    }
    (response as ResponseWithApiMessage)[API_MESSAGE_KEY] = envelope.message;
    response.data = envelope.data;
    return response;
  },
  (error: AxiosError) => {
    const originalRequest = error.config as
      (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isRefreshCall = originalRequest?.url === REFRESH_URL;
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
          const token = currentSession?.access_token;
          if (token) {
            originalRequest.headers.set("Authorization", `Bearer ${token}`);
          }
          return axiosInstance(originalRequest);
        }
        onUnauthorized();
        throw new ApiError({
          success: false,
          statusCode: 401,
          code: "SESSION_EXPIRED",
          message: "Your session has expired. Sign in again.",
        });
      });
    }

    if (isErrorEnvelope(error.response?.data)) {
      throwApiError(error.response.data, hadToken);
    }

    // No response at all means the request died below HTTP and never reached the server,
    // which is a different fault to any status code it could have answered with. The
    // envelope thrown below flattens that distinction, so record it before it is lost.
    if (!error.response) {
      console.error("[api] request failed before any response", {
        method: originalRequest?.method,
        url: originalRequest?.url,
        axiosCode: error.code,
        message: error.message,
      });
    }

    throw new ApiError({
      success: false,
      statusCode: error.response?.status ?? 0,
      code: "NETWORK_ERROR",
      message: error.message || "Network error. Check your connection.",
    });
  },
);

/** Every helper resolves the unwrapped `data`, never the envelope. */
export const api = {
  get: async <T>(
    url: string,
    requestConfig?: AxiosRequestConfig,
  ): Promise<T> => {
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

  put: async <T>(
    url: string,
    data?: unknown,
    requestConfig?: AxiosRequestConfig,
  ): Promise<T> => {
    const response = await axiosInstance.put<T>(url, data, requestConfig);
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

  delete: async <T>(
    url: string,
    requestConfig?: AxiosRequestConfig,
  ): Promise<T> => {
    const response = await axiosInstance.delete<T>(url, requestConfig);
    return response.data;
  },

  /**
   * A download rather than JSON: the grade CSV and the feedback zip. Comes back as a Blob
   * with whatever filename the backend chose.
   *
   * A failure on these routes still arrives as a JSON envelope, so the blob is read back as
   * text and re-thrown as a real ApiError rather than flattened into a generic failure.
   */
  download: async (
    url: string,
    requestConfig?: AxiosRequestConfig,
  ): Promise<RawApiResult<Blob>> => {
    try {
      const response = await axiosInstance.get<Blob>(url, {
        ...requestConfig,
        responseType: "blob",
        [RAW_RESPONSE_KEY]: true,
      } as RawRequestConfig);
      return {
        data: response.data,
        filename: parseContentDispositionFilename(
          response.headers?.["content-disposition"],
        ),
      };
    } catch (error) {
      throw await reinterpretBlobError(error);
    }
  },
};

/** A failed download carries its envelope inside the blob body. Read it back out. */
async function reinterpretBlobError(error: unknown): Promise<unknown> {
  if (!isApiError(error) || error.code !== "NETWORK_ERROR") return error;

  const body = (error as unknown as { response?: { data?: unknown } }).response
    ?.data;
  if (!(body instanceof Blob)) return error;

  try {
    const parsed: unknown = JSON.parse(await body.text());
    if (isErrorEnvelope(parsed)) return new ApiError(parsed);
  } catch {
    // Not JSON after all. The original error is the best answer.
  }
  return error;
}

export interface ApiResult<T> {
  data: T;
  /** The backend's own confirmation message, for the success toast. */
  message: string;
}

/**
 * The same requests, resolving `{ data, message }`. For mutations whose result is confirmed
 * back to the user, so the toast says what the backend said rather than a guess at it.
 */
export const apiWithMessage = {
  post: async <T>(
    url: string,
    data?: unknown,
    requestConfig?: AxiosRequestConfig,
  ): Promise<ApiResult<T>> => {
    const response = (await axiosInstance.post<T>(
      url,
      data,
      requestConfig,
    )) as ResponseWithApiMessage;
    return {
      data: response.data as T,
      message: response[API_MESSAGE_KEY] ?? "",
    };
  },

  put: async <T>(
    url: string,
    data?: unknown,
    requestConfig?: AxiosRequestConfig,
  ): Promise<ApiResult<T>> => {
    const response = (await axiosInstance.put<T>(
      url,
      data,
      requestConfig,
    )) as ResponseWithApiMessage;
    return {
      data: response.data as T,
      message: response[API_MESSAGE_KEY] ?? "",
    };
  },

  patch: async <T>(
    url: string,
    data?: unknown,
    requestConfig?: AxiosRequestConfig,
  ): Promise<ApiResult<T>> => {
    const response = (await axiosInstance.patch<T>(
      url,
      data,
      requestConfig,
    )) as ResponseWithApiMessage;
    return {
      data: response.data as T,
      message: response[API_MESSAGE_KEY] ?? "",
    };
  },

  delete: async <T>(
    url: string,
    requestConfig?: AxiosRequestConfig,
  ): Promise<ApiResult<T>> => {
    const response = (await axiosInstance.delete<T>(
      url,
      requestConfig,
    )) as ResponseWithApiMessage;
    return {
      data: response.data as T,
      message: response[API_MESSAGE_KEY] ?? "",
    };
  },
};
