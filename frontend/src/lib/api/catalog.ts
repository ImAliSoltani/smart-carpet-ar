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
  VisualSearchResponse,
} from "./types";

export const catalogKeys = {
  all: ["catalog"] as const,
  list: (filters: CarpetFilters) => ["catalog", "list", filters] as const,
  detail: (slug: string) => ["catalog", "detail", slug] as const,
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
