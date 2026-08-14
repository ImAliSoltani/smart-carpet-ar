/**
 * Catalogue endpoints, and the query descriptions the storefront hangs on them.
 *
 * Each endpoint is a plain async function so it can be awaited directly in a
 * server component, and each has a `queryOptions` twin so the same request can
 * be used by `useQuery`, prefetched, or invalidated without the key being
 * written out twice and drifting.
 */

import { queryOptions } from "@tanstack/react-query";

import { request } from "./client";
import type {
  CarpetDetail,
  CarpetFilters,
  CarpetPage,
  CatalogFacets,
  VisualSearchResponse,
} from "./types";

export const catalogKeys = {
  all: ["catalog"] as const,
  list: (filters: CarpetFilters) => ["catalog", "list", filters] as const,
  detail: (slug: string) => ["catalog", "detail", slug] as const,
  facets: () => ["catalog", "facets"] as const,
  similar: (carpetId: number, limit: number) =>
    ["catalog", "similar", carpetId, limit] as const,
};

export function listCarpets(
  filters: CarpetFilters = {},
  signal?: AbortSignal,
): Promise<CarpetPage> {
  return request<CarpetPage>("/api/v1/carpets", { query: filters, signal });
}

export function getCarpet(slug: string, signal?: AbortSignal): Promise<CarpetDetail> {
  return request<CarpetDetail>(`/api/v1/carpets/${encodeURIComponent(slug)}`, { signal });
}

/** Nearest neighbours of a carpet's own embedding — the product page's «مشابه‌ها». */
export function getSimilarCarpets(
  carpetId: number,
  limit = 6,
  signal?: AbortSignal,
): Promise<VisualSearchResponse> {
  return request<VisualSearchResponse>(`/api/v1/carpets/${carpetId}/similar`, {
    query: { limit },
    signal,
  });
}

/**
 * A photograph in, the carpets nearest it out.
 *
 * `FormData` and no `Content-Type` header: the browser has to write that one
 * itself, because a multipart body is only parseable with the boundary token it
 * generates. Setting it by hand produces a request the backend rejects as
 * malformed, and the mistake looks like a server bug rather than a client one.
 */
export function visualSearch(
  image: File,
  signal?: AbortSignal,
): Promise<VisualSearchResponse> {
  const body = new FormData();
  body.append("image", image);
  return request<VisualSearchResponse>("/api/v1/search/visual", {
    method: "POST",
    body,
    signal,
  });
}

/** Counts per filter and the price distribution — the filter panel's input. */
export function getFacets(signal?: AbortSignal): Promise<CatalogFacets> {
  return request<CatalogFacets>("/api/v1/carpets/facets", { signal });
}

export function facetsQuery() {
  return queryOptions({
    queryKey: catalogKeys.facets(),
    queryFn: ({ signal }) => getFacets(signal),
    // Only moves when the shopkeeper adds a carpet, and every filter
    // interaction would otherwise re-ask for numbers that did not change.
    staleTime: 15 * 60 * 1000,
  });
}

export function carpetListQuery(filters: CarpetFilters = {}) {
  return queryOptions({
    queryKey: catalogKeys.list(filters),
    queryFn: ({ signal }) => listCarpets(filters, signal),
  });
}

export function carpetQuery(slug: string) {
  return queryOptions({
    queryKey: catalogKeys.detail(slug),
    queryFn: ({ signal }) => getCarpet(slug, signal),
  });
}

export function similarCarpetsQuery(carpetId: number, limit = 6) {
  return queryOptions({
    queryKey: catalogKeys.similar(carpetId, limit),
    queryFn: ({ signal }) => getSimilarCarpets(carpetId, limit, signal),
    // Neighbours only move when the catalogue does, and the product page is
    // where visitors go back and forth the most.
    staleTime: 10 * 60 * 1000,
  });
}
