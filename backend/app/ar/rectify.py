"""Perspective correction: an ordinary carpet photo -> a top-down texture.

This is what lets a shopkeeper add a carpet with one phone photo instead of
commissioning a 3D model. The photo is almost never taken straight above the
carpet, so we find its four corners and warp them onto a rectangle whose aspect
ratio comes from the carpet's *real* catalogue dimensions — which is also what
makes the AR asset true-scale rather than merely plausible.

Corner detection is deliberately conservative: when it is not confident it says
so, and the admin panel lets a human drag the four corners instead. A wrong
automatic crop that nobody notices is far worse than asking for one correction.
"""

from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO

import cv2
import numpy as np
from PIL import Image

Corner = tuple[float, float]
Corners = tuple[Corner, Corner, Corner, Corner]  # tl, tr, br, bl

# A detected quad must cover at least this fraction of the frame, otherwise we
# have almost certainly locked onto a motif *inside* the carpet.
MIN_AREA_RATIO = 0.25
# Below this, the admin panel opens with the corners pre-filled for review.
CONFIDENCE_THRESHOLD = 0.55


@dataclass
class RectifyResult:
    image: Image.Image
    corners: Corners
    confidence: float
    automatic: bool

    @property
    def needs_review(self) -> bool:
        return self.confidence < CONFIDENCE_THRESHOLD


def order_corners(points: np.ndarray) -> Corners:
    """Order four points as top-left, top-right, bottom-right, bottom-left."""
    points = points.reshape(4, 2).astype(np.float32)
    by_sum = points.sum(axis=1)
    by_diff = np.diff(points, axis=1).ravel()
    ordered = np.array(
        [
            points[np.argmin(by_sum)],  # smallest x+y  -> top-left
            points[np.argmin(by_diff)],  # smallest y-x  -> top-right
            points[np.argmax(by_sum)],  # largest x+y   -> bottom-right
            points[np.argmax(by_diff)],  # largest y-x   -> bottom-left
        ],
        dtype=np.float32,
    )
    return tuple(tuple(float(v) for v in point) for point in ordered)  # type: ignore[return-value]


def _quad_regularity(corners: Corners) -> float:
    """How rectangle-like the quad is (1.0 = perfect), used as a sanity score.

    A real carpet photographed from any angle still projects to a convex quad
    with roughly parallel opposite edges; motifs and shadows usually do not.
    """
    points = np.array(corners, dtype=np.float32)
    edges = np.roll(points, -1, axis=0) - points
    lengths = np.linalg.norm(edges, axis=1)
    if float(lengths.min()) < 1e-3:
        return 0.0

    opposite_ratio = min(
        min(lengths[0], lengths[2]) / max(lengths[0], lengths[2]),
        min(lengths[1], lengths[3]) / max(lengths[1], lengths[3]),
    )

    # angles at each corner should be near 90 degrees
    angle_score = 0.0
    for i in range(4):
        incoming = points[i] - points[i - 1]
        outgoing = points[(i + 1) % 4] - points[i]
        cosine = float(
            np.dot(incoming, outgoing)
            / (np.linalg.norm(incoming) * np.linalg.norm(outgoing) + 1e-6)
        )
        angle_score += 1.0 - min(abs(cosine), 1.0)
    angle_score /= 4.0

    return float(opposite_ratio * angle_score)


def detect_corners(image: Image.Image) -> tuple[Corners, float]:
    """Find the carpet's four corners. Returns the corners and a 0..1 confidence.

    Falls back to the full frame with confidence 0 when nothing convincing is
    found — callers treat that as "ask a human".
    """
    frame = cv2.cvtColor(np.array(image.convert("RGB")), cv2.COLOR_RGB2BGR)
    height, width = frame.shape[:2]
    full_frame: Corners = (
        (0.0, 0.0),
        (float(width), 0.0),
        (float(width), float(height)),
        (0.0, float(height)),
    )

    # Work at a fixed scale so thresholds behave the same for every input size.
    scale = 900 / max(height, width)
    if scale < 1.0:
        working = cv2.resize(frame, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    else:
        working = frame
        scale = 1.0

    gray = cv2.cvtColor(working, cv2.COLOR_BGR2GRAY)
    gray = cv2.bilateralFilter(gray, 9, 60, 60)  # smooth pile texture, keep edges
    edges = cv2.Canny(gray, 40, 130)
    edges = cv2.dilate(edges, np.ones((5, 5), np.uint8), iterations=1)
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    frame_area = working.shape[0] * working.shape[1]
    best: tuple[float, Corners] | None = None

    for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:8]:
        area = cv2.contourArea(contour)
        if area < frame_area * MIN_AREA_RATIO:
            break  # sorted by area, everything after is smaller

        perimeter = cv2.arcLength(contour, closed=True)
        approx = cv2.approxPolyDP(contour, 0.02 * perimeter, closed=True)
        if len(approx) != 4 or not cv2.isContourConvex(approx):
            continue

        corners = order_corners(approx / scale)
        regularity = _quad_regularity(corners)
        coverage = min(area / frame_area, 1.0)
        # Both matter: a big blob that is not rectangle-like is not a carpet,
        # and a perfect little rectangle is probably a motif.
        score = regularity * (0.5 + 0.5 * coverage)
        if best is None or score > best[0]:
            best = (score, corners)

    if best is None:
        return full_frame, 0.0
    return best[1], round(min(best[0], 1.0), 3)


def rectify(
    image: Image.Image,
    *,
    width_cm: int,
    length_cm: int,
    corners: Corners | None = None,
    max_texture_px: int = 2400,
) -> RectifyResult:
    """Warp the carpet onto a top-down rectangle matching its real proportions.

    Pass `corners` to override detection (the admin panel's draggable handles).
    """
    if width_cm <= 0 or length_cm <= 0:
        raise ValueError("carpet dimensions must be positive")

    automatic = corners is None
    if corners is None:
        corners, confidence = detect_corners(image)
    else:
        confidence = 1.0  # a human placed these

    # Output resolution follows the real aspect ratio, capped on the long edge.
    aspect = width_cm / length_cm
    if aspect >= 1.0:
        out_w = max_texture_px
        out_h = max(1, round(max_texture_px / aspect))
    else:
        out_h = max_texture_px
        out_w = max(1, round(max_texture_px * aspect))

    source = np.array(corners, dtype=np.float32)
    target = np.array(
        [(0, 0), (out_w - 1, 0), (out_w - 1, out_h - 1), (0, out_h - 1)], dtype=np.float32
    )
    matrix = cv2.getPerspectiveTransform(source, target)

    frame = cv2.cvtColor(np.array(image.convert("RGB")), cv2.COLOR_RGB2BGR)
    warped = cv2.warpPerspective(
        frame, matrix, (out_w, out_h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
    )
    rectified = Image.fromarray(cv2.cvtColor(warped, cv2.COLOR_BGR2RGB))

    return RectifyResult(
        image=rectified, corners=corners, confidence=confidence, automatic=automatic
    )


def encode_jpeg(image: Image.Image, quality: int = 92) -> bytes:
    buffer = BytesIO()
    image.convert("RGB").save(buffer, format="JPEG", quality=quality, optimize=True)
    return buffer.getvalue()
