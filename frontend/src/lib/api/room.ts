/**
 * The room-photo endpoints.
 *
 * Separate from `catalog.ts` because they are a different kind of request: they
 * carry an image up rather than a query, they take seconds rather than
 * milliseconds, and none of them is cacheable — the same room photographed
 * twice is somebody asking again.
 */

import { request } from "./client";
import type { RoomAdviserResponse, SizeGuideResponse } from "./types";

/**
 * A room photo in, the carpet sizes its floor will take out.
 *
 * `FormData` with no `Content-Type` header: the browser writes that one itself,
 * because a multipart body can only be parsed with the boundary token it
 * generates.
 */
export function sizeGuide(
  image: File,
  signal?: AbortSignal,
): Promise<SizeGuideResponse> {
  const body = new FormData();
  body.append("image", image);
  return request<SizeGuideResponse>("/api/v1/room/size-guide", {
    method: "POST",
    body,
    signal,
  });
}

/**
 * The same room photo, asked a different question: which carpet, not what size.
 *
 * Kept as its own request rather than one endpoint returning both. They share
 * the expensive half — the depth pass and the floor mask — but a shopper asking
 * for a size should not wait for a ranking they did not ask for, and the two
 * answers live on different pages.
 */
export function roomAdviser(
  image: File,
  signal?: AbortSignal,
): Promise<RoomAdviserResponse> {
  const body = new FormData();
  body.append("image", image);
  return request<RoomAdviserResponse>("/api/v1/room/adviser", {
    method: "POST",
    body,
    signal,
  });
}
