import { disableDemoSession } from "@/lib/demo";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

const ACCESS_TOKEN_KEY = "bugsense_access_token";
const REFRESH_TOKEN_KEY = "bugsense_refresh_token";
const REQUEST_TIMEOUT_MS = 20_000;

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  disableDemoSession();
}

export class ApiError extends Error {
  code: string;
  details: Record<string, unknown> | null;
  status: number;

  constructor(status: number, code: string, message: string, details: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details =
      typeof details === "object" && details !== null ? (details as Record<string, unknown>) : null;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
  /** Internal: prevents an infinite refresh loop when the new token is also rejected. */
  retriedAfterRefresh?: boolean;
}

type RefreshSubscriber = (token: string | null) => void;

let isRefreshing = false;
let refreshSubscribers: RefreshSubscriber[] = [];

function onTokenRefreshed(token: string | null) {
  const subscribers = refreshSubscribers;
  refreshSubscribers = [];
  subscribers.forEach((callback) => callback(token));
}

function addRefreshSubscriber(callback: RefreshSubscriber) {
  refreshSubscribers.push(callback);
}

async function fetchWithTimeout(input: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: init.signal ?? controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) {
    clearTokens();
    return null;
  }

  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    if (!response.ok) {
      clearTokens();
      return null;
    }

    const data = await response.json();
    if (data.access) {
      setTokens(data.access, data.refresh || refresh);
      return data.access;
    }
    clearTokens();
    return null;
  } catch {
    clearTokens();
    return null;
  }
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const {
    params,
    headers,
    skipAuth = false,
    retriedAfterRefresh = false,
    ...customConfig
  } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const defaultHeaders: Record<string, string> = {
    Accept: "application/json",
  };

  if (customConfig.body) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      defaultHeaders.Authorization = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(url, {
      ...customConfig,
      headers: {
        ...defaultHeaders,
        ...headers,
      },
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    throw new ApiError(
      0,
      timedOut ? "request_timeout" : "network_error",
      timedOut
        ? "The request timed out. Check your connection and try again."
        : "Unable to reach the server. Check your connection and try again.",
      null
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  // Handle silent token refresh on 401
  if (response.status === 401 && !skipAuth && !endpoint.includes("/auth/") && !retriedAfterRefresh) {
    if (!isRefreshing) {
      isRefreshing = true;
      let newToken: string | null = null;
      try {
        newToken = await refreshAccessToken();
      } finally {
        isRefreshing = false;
      }

      if (newToken) {
        onTokenRefreshed(newToken);
        return apiRequest<T>(endpoint, { ...options, retriedAfterRefresh: true });
      }

      // Wake every queued request with a failure so none of them hangs forever.
      onTokenRefreshed(null);
      window.dispatchEvent(new Event("bugsense-auth-expired"));
    } else {
      // Queue requests until the in-flight refresh completes.
      return new Promise<T>((resolve, reject) => {
        addRefreshSubscriber((newToken) => {
          if (!newToken) {
            reject(new ApiError(401, "unauthorized", "Session expired. Please sign in again.", null));
          } else {
            resolve(apiRequest<T>(endpoint, { ...options, retriedAfterRefresh: true }));
          }
        });
      });
    }
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorData = (data as { error?: { code?: string; message?: string; details?: unknown } })
      ?.error;
    throw new ApiError(
      response.status,
      errorData?.code || "unknown_error",
      errorData?.message || response.statusText || "Request failed",
      errorData?.details || data
    );
  }

  return data as T;
}
