/**
 * The room-photo endpoints.
 *
 * Separate from `catalog.ts` because they are a different kind of request: they
 * carry an image up rather than a query, they take seconds rather than
 * milliseconds, and none of them is cacheable — the same room photographed
 * twice is somebody asking again.
 */

import { request } from "./client";
import type { SizeGuideResponse } from "./types";

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
