/**
 * HTTP client: JWT injection, RFC 7807 error unwrapping, and offline detection.
 *
 * Uses `fetch` rather than axios — the tech stack does not list an HTTP library, and
 * fetch covers everything this app needs.
 */

import type { ProblemDetail } from '@/types/models';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
const TOKEN_STORAGE_KEY = 'nextpath.access_token';

/** A failed request, carrying the parsed problem details where the server sent them. */
export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetail | null;
  /** True when the browser is offline or the request never reached the server. */
  readonly isOffline: boolean;

  constructor(message: string, status: number, problem: ProblemDetail | null, isOffline = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
    this.isOffline = isOffline;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** 403 with the consent message is the minor-consent gate, not a permissions bug. */
  get isConsentBlocked(): boolean {
    return this.status === 403 && (this.problem?.detail ?? '').includes('Guardian consent');
  }

  get fieldErrors(): { field: string; message: string }[] {
    return this.problem?.errors ?? [];
  }
}

// localStorage throws in some privacy modes; a token we cannot read is the same as no
// token, and must not take the whole app down.
function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — the session simply will not survive a reload */
  }
}

export const tokenStore = {
  get: (): string | null => safeGet(TOKEN_STORAGE_KEY),
  set: (token: string): void => safeSet(TOKEN_STORAGE_KEY, token),
  clear: (): void => safeSet(TOKEN_STORAGE_KEY, null),
};

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: Method;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${API_BASE_URL}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };

  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    throw new ApiError(
      navigator.onLine
        ? 'We could not reach the server. Please try again.'
        : 'You appear to be offline. Your progress is saved on this device.',
      0,
      null,
      true,
    );
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const problem = (payload ?? null) as ProblemDetail | null;
    if (response.status === 401) tokenStore.clear();
    throw new ApiError(
      problem?.detail ?? `Request failed with status ${response.status}`,
      response.status,
      problem,
    );
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query'], signal?: AbortSignal) =>
    request<T>(path, { method: 'GET', query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body }),
};
