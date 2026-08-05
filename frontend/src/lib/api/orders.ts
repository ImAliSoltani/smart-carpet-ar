/**
 * Guest checkout and order tracking.
 *
 * There are no accounts (ROADMAP §4), so an order is only ever reachable again
 * through the reference it comes back with plus the phone number that placed
 * it. That pair is the whole authentication story, which is why the reference
 * is the one thing the confirmation screen must not lose.
 */

import { request } from "./client";
import type { OrderCreate, OrderOut, OrderTrackRequest } from "./types";

export function createOrder(payload: OrderCreate, signal?: AbortSignal): Promise<OrderOut> {
  return request<OrderOut>("/api/v1/orders", { method: "POST", json: payload, signal });
}

export function trackOrder(
  payload: OrderTrackRequest,
  signal?: AbortSignal,
): Promise<OrderOut> {
  return request<OrderOut>("/api/v1/orders/track", {
    method: "POST",
    json: payload,
    signal,
  });
}
