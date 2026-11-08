const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiError extends Error {
  code: string;
  details: unknown;
  status: number;

  constructor(status: number, code: string, message: string, details: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers, ...customConfig } = options;

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

  const token = localStorage.getItem("bugsense_access_token");

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...customConfig,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  };

  const response = await fetch(url, config);

  if (response.status === 204) {
    return {} as T;
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorData = (data as { error?: { code?: string; message?: string; details?: unknown } })?.error;
    throw new ApiError(
      response.status,
      errorData?.code || "unknown_error",
      errorData?.message || response.statusText || "Request failed",
      errorData?.details || data
    );
  }

  return data as T;
}

export { ApiError };
