/**
 * The admin panel's endpoints (ROADMAP §6-14 to §6-17).
 *
 * Same shape as `catalog.ts`: a plain async function per call, and a
 * `queryOptions` twin wherever something is read, so a key is never written out
 * twice and cannot drift.
 *
 * What is different is trust. Every one of these needs the session cookie, which
 * `request` already sends — but a 401 here is not an error to display, it is a
 * fact about who is looking. `isUnauthorized` is how the shell tells those two
 * apart without every caller re-reading a status code.
 */

import { queryOptions } from "@tanstack/react-query";

import { ApiError, request } from "./client";
import type {
  AdminCarpetDetail,
  AdminCarpetPage,
  AdminCarpetRow,
  AdminOrder,
  AdminStats,
  ArCornerSuggestion,
  ArVariantStatus,
  CarpetCreate,
  CarpetDetail,
  CarpetUpdate,
  CornerPoint,
  ImageOut,
  OrderStatus,
  VariantCreate,
  VariantOut,
  VariantUpdate,
} from "./types";

export const adminKeys = {
  all: ["admin"] as const,
  me: () => ["admin", "me"] as const,
  stats: () => ["admin", "stats"] as const,
  carpets: (filters: AdminCarpetFilters) => ["admin", "carpets", filters] as const,
  carpet: (carpetId: number) => ["admin", "carpet", carpetId] as const,
  orders: (status: OrderStatus | undefined) => ["admin", "orders", status ?? "all"] as const,
  ar: (carpetId: number) => ["admin", "ar", carpetId] as const,
  arQueue: () => ["admin", "ar", "queue"] as const,
  corners: (carpetId: number) => ["admin", "corners", carpetId] as const,
};

/** True when the API said «not you» rather than «that went wrong». */
export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

// --- session ---------------------------------------------------------------

export function login(username: string, password: string): Promise<{ status: string }> {
  return request("/api/v1/admin/login", {
    method: "POST",
    json: { username, password },
  });
}

export function logout(): Promise<{ status: string }> {
  return request("/api/v1/admin/logout", { method: "POST" });
}

export function getMe(signal?: AbortSignal): Promise<{ username: string }> {
  return request("/api/v1/admin/me", { signal });
}

export function meQuery() {
  return queryOptions({
    queryKey: adminKeys.me(),
    queryFn: ({ signal }) => getMe(signal),
    // A signed-out visitor is an answer, not a fault: retrying a 401 four times
    // only delays the redirect to the login page by a few seconds.
    retry: (count, error) => !isUnauthorized(error) && count < 2,
    staleTime: 5 * 60 * 1000,
  });
}

// --- dashboard -------------------------------------------------------------

export function getStats(signal?: AbortSignal): Promise<AdminStats> {
  return request("/api/v1/admin/stats", { signal });
}

export function statsQuery() {
  return queryOptions({
    queryKey: adminKeys.stats(),
    queryFn: ({ signal }) => getStats(signal),
    retry: (count, error) => !isUnauthorized(error) && count < 2,
  });
}

// --- carpets ---------------------------------------------------------------

export interface AdminCarpetFilters {
  q?: string;
  /** Unset means both — which is the reason this endpoint exists. */
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export function listAdminCarpets(
  filters: AdminCarpetFilters = {},
  signal?: AbortSignal,
): Promise<AdminCarpetPage> {
  return request("/api/v1/admin/carpets", { query: { ...filters }, signal });
}

export function adminCarpetsQuery(filters: AdminCarpetFilters = {}) {
  return queryOptions({
    queryKey: adminKeys.carpets(filters),
    queryFn: ({ signal }) => listAdminCarpets(filters, signal),
    retry: (count, error) => !isUnauthorized(error) && count < 2,
  });
}

/**
 * Every carpet, walked a page at a time.
 *
 * The AR queue asks a question the endpoint cannot answer: «which carpets have
 * a size still missing its files». There is no server-side filter for it, and
 * `ar_ready` is the only AR figure on a row — so the filtering happens here.
 *
 * Which is exactly why this walks rather than fetching one large page. Asking
 * for `page_size: 100` and filtering the result reads as working, because the
 * catalogue is seventy; at a hundred and one it would quietly drop carpets from
 * a list whose entire job is to be the complete set of things needing
 * attention, and the count above it would agree with the omission. Walking
 * costs one request today and stays correct at any size.
 *
 * Admin-only, behind a login, and cached by the query below — so the cost of
 * being right here is a request per hundred carpets, for one person.
 */
export async function listAllAdminCarpets(signal?: AbortSignal): Promise<AdminCarpetRow[]> {
  const PAGE = 100;
  const first = await listAdminCarpets({ page: 1, page_size: PAGE }, signal);
  const rows = [...first.items];
  const pages = Math.ceil(first.total / PAGE);
  for (let page = 2; page <= pages; page += 1) {
    const next = await listAdminCarpets({ page, page_size: PAGE }, signal);
    rows.push(...next.items);
    // A page that comes back empty ends the walk rather than spinning: `total`
    // is counted in one query and the rows in another, so a carpet deleted
    // between them would otherwise leave a page short forever.
    if (next.items.length === 0) break;
  }
  return rows;
}

/** True when some size of this carpet has no AR file yet. */
export function needsArAttention(carpet: AdminCarpetRow): boolean {
  return carpet.variants_count > 0 && carpet.ar_ready < carpet.variants_count;
}

export function arQueueQuery() {
  return queryOptions({
    queryKey: adminKeys.arQueue(),
    queryFn: ({ signal }) => listAllAdminCarpets(signal),
    retry: (count, error) => !isUnauthorized(error) && count < 2,
  });
}

/**
 * One carpet for the edit screen.
 *
 * By id and through the admin route, not `getCarpet(slug)` — the shop's lookup
 * requires `is_active`, so a deactivated carpet could not be opened to be
 * reactivated, and the slug is itself one of the editable fields.
 */
export function getAdminCarpet(
  carpetId: number,
  signal?: AbortSignal,
): Promise<AdminCarpetDetail> {
  return request(`/api/v1/admin/carpets/${carpetId}`, { signal });
}

export function adminCarpetQuery(carpetId: number) {
  return queryOptions({
    queryKey: adminKeys.carpet(carpetId),
    queryFn: ({ signal }) => getAdminCarpet(carpetId, signal),
    retry: (count, error) => !isUnauthorized(error) && count < 2,
  });
}

export function createCarpet(payload: CarpetCreate): Promise<CarpetDetail> {
  return request("/api/v1/admin/carpets", { method: "POST", json: payload });
}

export function updateCarpet(carpetId: number, payload: CarpetUpdate): Promise<CarpetDetail> {
  return request(`/api/v1/admin/carpets/${carpetId}`, { method: "PATCH", json: payload });
}

// --- variants --------------------------------------------------------------

export function addVariant(carpetId: number, payload: VariantCreate): Promise<VariantOut> {
  return request(`/api/v1/admin/carpets/${carpetId}/variants`, {
    method: "POST",
    json: payload,
  });
}

export function updateVariant(variantId: number, payload: VariantUpdate): Promise<VariantOut> {
  return request(`/api/v1/admin/variants/${variantId}`, { method: "PATCH", json: payload });
}

export function deleteVariant(variantId: number): Promise<void> {
  return request(`/api/v1/admin/variants/${variantId}`, { method: "DELETE" });
}

// --- images ----------------------------------------------------------------

export function uploadImage(carpetId: number, file: File): Promise<ImageOut> {
  const form = new FormData();
  form.append("file", file);
  // No `Content-Type` header: the browser has to write it itself so the
  // multipart boundary matches the body it just built. Setting it by hand is
  // the classic way to make an upload arrive unparseable.
  return request(`/api/v1/admin/carpets/${carpetId}/images`, { method: "POST", body: form });
}

export function updateImage(
  imageId: number,
  payload: { position?: number; is_primary?: boolean },
): Promise<ImageOut> {
  return request(`/api/v1/admin/images/${imageId}`, { method: "PATCH", json: payload });
}

export function deleteImage(imageId: number): Promise<void> {
  return request(`/api/v1/admin/images/${imageId}`, { method: "DELETE" });
}

// --- AR --------------------------------------------------------------------

export function getArStatus(
  carpetId: number,
  signal?: AbortSignal,
): Promise<ArVariantStatus[]> {
  return request(`/api/v1/admin/carpets/${carpetId}/ar`, { signal });
}

export function arStatusQuery(carpetId: number) {
  return queryOptions({
    queryKey: adminKeys.ar(carpetId),
    queryFn: ({ signal }) => getArStatus(carpetId, signal),
    retry: (count, error) => !isUnauthorized(error) && count < 2,
  });
}

export function suggestCorners(
  carpetId: number,
  signal?: AbortSignal,
): Promise<ArCornerSuggestion> {
  return request(`/api/v1/admin/carpets/${carpetId}/ar/corners`, { signal });
}

export function cornersQuery(carpetId: number) {
  return queryOptions({
    queryKey: adminKeys.corners(carpetId),
    queryFn: ({ signal }) => suggestCorners(carpetId, signal),
    // Detection is a fresh read of the photograph every time and the answer
    // cannot change unless the photograph does.
    staleTime: Infinity,
    retry: (count, error) => !isUnauthorized(error) && count < 2,
  });
}

/**
 * Build (or rebuild) the AR files for every size of one carpet.
 *
 * With corners the backend runs the pipeline inline and answers `ready`, so a
 * mistake in placement surfaces immediately; without them it queues the work
 * and answers `processing`. The caller has to honour that difference — polling
 * after a `ready` is asking a question already answered.
 */
export function generateArAssets(
  carpetId: number,
  corners?: CornerPoint[],
): Promise<{ status: string }> {
  return request(`/api/v1/admin/carpets/${carpetId}/ar/generate`, {
    method: "POST",
    json: corners ? { corners } : {},
  });
}

// --- orders ----------------------------------------------------------------

export function listOrders(
  status?: OrderStatus,
  limit = 200,
  signal?: AbortSignal,
): Promise<AdminOrder[]> {
  return request("/api/v1/admin/orders", { query: { status, limit }, signal });
}

export function ordersQuery(status?: OrderStatus) {
  return queryOptions({
    queryKey: adminKeys.orders(status),
    queryFn: ({ signal }) => listOrders(status, 200, signal),
    retry: (count, error) => !isUnauthorized(error) && count < 2,
  });
}

export function setOrderStatus(orderId: number, status: OrderStatus): Promise<AdminOrder> {
  return request(`/api/v1/admin/orders/${orderId}`, { method: "PATCH", json: { status } });
}
