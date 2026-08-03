/**
 * Transport for the FastAPI backend.
 *
 * Everything the storefront knows about talking to the API lives here: where it
 * is, how a failure becomes a sentence a shopper can read, and how a stored file
 * turns into a URL. Endpoint modules build on this and describe *what* they ask
 * for, never *how*.
 */

/**
 * Origin of the API and of the files it stores.
 *
 * Development runs the two on different ports, so this cannot be assumed to be
 * the site's own origin. In production Caddy puts both behind one host and the
 * variable is set to that.
 */
export const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");

/** A request that reached a verdict — or, with `status === 0`, never arrived. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** True when retrying could plausibly succeed: the network, or the server. */
  get isTransient(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

/**
 * Said in Persian, because these reach the screen.
 *
 * Only a fallback: the backend already answers with its own Persian `detail`
 * for anything it can describe better than a status code can ("فرش پیدا نشد").
 */
const FALLBACK_MESSAGE: Record<number, string> = {
  0: "ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کن.",
  400: "درخواست معتبر نبود.",
  401: "برای این کار باید وارد شوی.",
  403: "اجازه‌ی این کار را نداری.",
  404: "چیزی که دنبالش بودی پیدا نشد.",
  413: "حجم فایل بیش از حد مجاز است.",
  422: "اطلاعات فرستاده‌شده کامل یا درست نیست.",
  429: "درخواست‌ها پشت سر هم بود؛ کمی صبر کن و دوباره بزن.",
};

const GENERIC_MESSAGE = "سرور نتوانست پاسخ بدهد. کمی بعد دوباره امتحان کن.";

function messageFor(status: number, body: unknown): string {
  const detail = (body as { detail?: unknown } | undefined)?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  // A 422 carries one entry per rejected field; the first is the one to show.
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: string } | undefined;
    if (first?.msg) return first.msg;
  }
  return FALLBACK_MESSAGE[status] ?? GENERIC_MESSAGE;
}

export type QueryValue = string | number | boolean | null | undefined;

function withQuery(path: string, query?: Record<string, QueryValue>): string {
  if (!query) return path;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    // An unset filter has to be absent, not empty. `?color=` is a value as far
    // as FastAPI is concerned, and fails validation instead of being ignored.
    if (value === null || value === undefined || value === "") continue;
    search.append(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  query?: Record<string, QueryValue>;
  /** Sent as a JSON body, with the header set. Use `body` for uploads. */
  json?: unknown;
  body?: BodyInit;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { query, json, headers, ...init } = options;

  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");
  if (json !== undefined) requestHeaders.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${withQuery(path, query)}`, {
      // The admin session is an HttpOnly cookie set on the API origin; on a
      // cross-origin request it only travels when credentials are asked for.
      credentials: "include",
      ...init,
      headers: requestHeaders,
      body: json !== undefined ? JSON.stringify(json) : init.body,
    });
  } catch (cause) {
    // fetch rejects only when the request never got an answer — DNS, refused
    // connection, offline, abort. Nothing was served, so there is no status.
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiError(0, FALLBACK_MESSAGE[0], cause);
  }

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => undefined);
  if (!response.ok) throw new ApiError(response.status, messageFor(response.status, body), body);
  return body as T;
}

/**
 * URL for a file the API stored — same-origin, always.
 *
 * Image and AR asset fields come back as paths under the storage contract's
 * public base (`/files/…`). Production serves those from the site's own host,
 * and `next.config.ts` proxies them in development, so the path is already the
 * right answer and nothing in the interface has to carry an origin. This exists
 * to normalise the shape (and the empty case), not to rewrite it.
 */
export function mediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return path.startsWith("/") ? path : `/${path}`;
}

/**
 * The same file as an absolute URL, for the places a path cannot travel:
 * OpenGraph tags, QR codes handed to a phone, an AR asset opened by the
 * system viewer rather than by the page.
 */
export function absoluteMediaUrl(path: string | null | undefined): string | undefined {
  const relative = mediaUrl(path);
  if (!relative) return undefined;
  if (/^https?:\/\//i.test(relative)) return relative;
  const origin =
    typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL;
  return origin ? `${origin}${relative}` : `${API_BASE}${relative}`;
}
