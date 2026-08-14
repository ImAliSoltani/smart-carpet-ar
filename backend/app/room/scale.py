"""Put a real measurement into the room photo, using a sheet of A4.

Monocular metric depth is remarkable and it is still a guess. The model has
never seen this room and infers absolute distance from what rooms usually look
like, so a small room furnished like a large one comes back too big. On the
sample photos here the recovered camera height lands between 1.18 m and 1.45 m,
which is plausible for every one of them and therefore proves nothing: a ten
percent error is invisible and turns a 200×300 recommendation into a 220×330.

An A4 sheet fixes that, and it is the one ruler every household already owns.
Its dimensions are exact by definition — ISO 216 fixes A4 at 210×297 mm — so a
sheet lying on the floor gives the photo a known length in the same plane the
carpet will lie in. Everything the depth model got wrong about scale is a single
multiplicative factor, and one known length is enough to recover it.

The aspect ratio is what makes detection trustworthy rather than hopeful. A4's
ratio is √2, and after the sheet's corners are projected onto the recovered
floor plane, a correct detection *must* measure √2 on that plane. A book, a
tile, or a patch of sunlight will not, so the ratio is used to reject candidates
and only the length is used to measure. That also means a bad floor plane
rejects itself: project onto a wrong plane and the rectangle comes out skewed.
"""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

from app.room.floor import FloorPlane

# ISO 216, in metres. Exact by definition, not measured.
A4_SHORT_M = 0.210
A4_LONG_M = 0.297
A4_RATIO = A4_LONG_M / A4_SHORT_M  # √2, near enough

# How far a candidate's measured ratio may sit from √2 and still be believed.
# Wide enough to survive a sheet that is not perfectly flat and a plane that is
# a degree or two off; far too tight for the ratio to be met by accident.
RATIO_TOLERANCE = 0.12

# The appearance tests are deliberately weak, because the strong test is
# geometric and comes later. A candidate only becomes a measurement if, once its
# corners are projected onto the floor plane, the rectangle it forms measures √2
# — and nothing in a room does that by accident. Tightening these two instead
# cost real detections: a white sheet on a cream tile floor is barely brighter
# than the tile, and demanding contrast lost every photo with a pale floor,
# which is most of them.
MAX_PAPER_SATURATION = 90  # 0..255, HSV S, inside the quad
MIN_BRIGHTER_THAN_SURROUND = -4  # inside minus ring; paper is never much darker

# A sheet smaller than this is too few pixels to corner accurately; larger than
# this and it is not a sheet, it is the floor.
MIN_AREA_FRACTION = 0.0008
MAX_AREA_FRACTION = 0.10

# The correction is refused outside this band. A metric depth model that is out
# by more than this has not mis-scaled the room, it has misunderstood it, and
# quietly multiplying by 3 would turn a wrong answer into a confident wrong
# answer.
MIN_SCALE = 0.5
MAX_SCALE = 2.0


@dataclass(frozen=True)
class ScaleReference:
    """A measured A4 sheet, and what it says about the photo's scale."""

    scale: float  # multiply every metric length by this
    corners_px: np.ndarray  # (4, 2) as found in the image
    measured_long_m: float  # the sheet's long side before correction
    measured_short_m: float
    ratio_error: float  # |measured ratio − √2| / √2

    @property
    def correction_percent(self) -> float:
        """How far off the depth model was, as a signed percentage."""
        return round((self.scale - 1.0) * 100.0, 1)


def _looks_like_paper(hsv: np.ndarray, quad: np.ndarray) -> bool:
    """Is the region inside this quadrilateral a pale sheet on a darker floor?"""
    inside = np.zeros(hsv.shape[:2], dtype=np.uint8)
    cv2.fillPoly(inside, [quad.astype(np.int32)], 1)
    if inside.sum() < 60:
        return False

    # A ring just outside the quad, as wide as a tenth of its own size, is what
    # "the floor around it" means. Dilating the quad and subtracting it is the
    # cheapest way to draw that ring for a shape of any orientation.
    span = int(np.sqrt(inside.sum()) * 0.35) | 1
    ring = cv2.dilate(inside, np.ones((span, span), np.uint8)) - inside
    if ring.sum() < 40:
        return False

    value = hsv[:, :, 2]
    saturation = hsv[:, :, 1]
    inside_value = float(np.median(value[inside > 0]))
    ring_value = float(np.median(value[ring > 0]))
    inside_saturation = float(np.median(saturation[inside > 0]))

    return (
        inside_saturation <= MAX_PAPER_SATURATION
        and inside_value - ring_value >= MIN_BRIGHTER_THAN_SURROUND
    )


def _paper_candidates(image_bgr: np.ndarray) -> list[np.ndarray]:
    """Quadrilaterals that could be a sheet of paper, largest first.

    Found by their edges rather than by their colour. A sheet's defining feature
    in a room photo is a hard four-sided boundary; its brightness only tells the
    two apart once the boundary is known, which is what `_looks_like_paper` is
    for.
    """
    hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)
    grey = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    # Local contrast first. A room photo is lit from one side, so a sheet in the
    # dim half sits at grey values a global threshold reads as shadow; CLAHE
    # equalises in tiles and gives its edges back.
    grey = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(grey)
    grey = cv2.bilateralFilter(grey, 7, 60, 60)  # keep edges, lose floor texture

    # Otsu picks the threshold from this photo rather than from a constant, which
    # matters because the same sheet under window light and under a lamp is two
    # very different grey values.
    high, _ = cv2.threshold(grey, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    edges = cv2.Canny(grey, int(high * 0.5), int(high))
    # Closing, not dilation. Both bridge the one-pixel breaks a soft shadow
    # leaves in an edge, but dilation also thickens the band outward, and
    # `findContours` then traces the *inside* of that thickened band — pulling
    # every corner a pixel or two inward. On a sheet ninety pixels wide that is
    # a four to nine percent under-measurement, in one direction, every time:
    # precisely the systematic error this whole reference exists to remove.
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))

    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    frame_area = float(image_bgr.shape[0] * image_bgr.shape[1])

    found: list[tuple[float, np.ndarray]] = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if not (MIN_AREA_FRACTION * frame_area <= area <= MAX_AREA_FRACTION * frame_area):
            continue
        # Insist on four corners. The tolerance is a fraction of the perimeter so
        # it scales with the sheet's size in the frame, not the photo's pixels.
        approx = cv2.approxPolyDP(contour, 0.02 * cv2.arcLength(contour, True), True)
        if len(approx) != 4 or not cv2.isContourConvex(approx):
            continue
        # A sheet is solid: this drops ring- and comb-shaped regions that happen
        # to have four extreme points.
        if area / max(cv2.contourArea(cv2.convexHull(contour)), 1.0) < 0.85:
            continue
        quad = approx.reshape(4, 2).astype(np.float32)
        if not _looks_like_paper(hsv, quad):
            continue
        # Corners to sub-pixel. `approxPolyDP` returns a contour vertex, which is
        # a whole pixel on the edge band; the measurement divides by a length of
        # eighty or a hundred pixels, so half a pixel per corner is half a
        # percent of the answer and it is free to remove.
        refined = cv2.cornerSubPix(
            grey,
            quad.copy(),
            (5, 5),
            (-1, -1),
            (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.01),
        )
        # Sub-pixel refinement can bolt onto a stronger nearby edge; keep it only
        # while it stays a correction rather than becoming a different corner.
        if np.all(np.linalg.norm(refined - quad, axis=1) < 3.0):
            quad = refined
        found.append((area, quad))

    found.sort(key=lambda pair: pair[0], reverse=True)
    return [corners for _, corners in found]


def _on_plane(
    corners_px: np.ndarray, floor: FloorPlane, focal: float, cx: float, cy: float
) -> np.ndarray | None:
    """Where those image corners land on the floor plane, in metres."""
    us = corners_px[:, 0].astype(np.float32)
    vs = corners_px[:, 1].astype(np.float32)
    depths = floor.depth_at(us, vs, focal, cx, cy)
    if not np.all(np.isfinite(depths)):
        return None
    dirs = np.stack([(us - cx) / focal, (vs - cy) / focal, np.ones_like(us)], axis=-1)
    return (dirs * depths[:, None]).astype(np.float32)


def _side_lengths(points_3d: np.ndarray) -> tuple[float, float, float]:
    """(long, short, squareness error) of a quadrilateral's four sides.

    Opposite sides are averaged rather than taken singly: a corner found a few
    pixels off shortens one side and lengthens its neighbour, and the average of
    the pair is stable against exactly that.
    """
    sides = [float(np.linalg.norm(points_3d[(i + 1) % 4] - points_3d[i])) for i in range(4)]
    pair_a = (sides[0] + sides[2]) / 2.0
    pair_b = (sides[1] + sides[3]) / 2.0
    long_side, short_side = max(pair_a, pair_b), min(pair_a, pair_b)
    # How unequal the two members of each pair were — a proxy for how badly the
    # quadrilateral failed to be a parallelogram on this plane.
    skew = max(
        abs(sides[0] - sides[2]) / max(pair_a, 1e-6),
        abs(sides[1] - sides[3]) / max(pair_b, 1e-6),
    )
    return long_side, short_side, float(skew)


def find_a4_scale(
    image: np.ndarray, floor: FloorPlane, focal: float, cx: float, cy: float
) -> ScaleReference | None:
    """Look for an A4 sheet lying on the floor and measure the photo against it.

    `image` is RGB, as the rest of this package uses. Returns None when no
    candidate survives — which is the ordinary case, because most photos have no
    sheet in them, and is not an error.
    """
    image_bgr = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

    best: ScaleReference | None = None
    for corners in _paper_candidates(image_bgr):
        points = _on_plane(corners, floor, focal, cx, cy)
        if points is None:
            continue
        long_m, short_m, skew = _side_lengths(points)
        if short_m < 1e-4 or skew > 0.25:
            continue

        ratio_error = abs((long_m / short_m) - A4_RATIO) / A4_RATIO
        if ratio_error > RATIO_TOLERANCE:
            continue

        # Both sides vote, weighted by nothing clever: they are two measurements
        # of the same scalar and averaging them halves the corner noise.
        scale = float(np.mean([A4_LONG_M / long_m, A4_SHORT_M / short_m]))
        if not (MIN_SCALE <= scale <= MAX_SCALE):
            continue

        candidate = ScaleReference(
            scale=scale,
            corners_px=corners,
            measured_long_m=long_m,
            measured_short_m=short_m,
            ratio_error=float(ratio_error),
        )
        # Among survivors, trust the one whose shape is closest to A4 rather
        # than the largest: size in the frame says how near the sheet was, not
        # how well it was found.
        if best is None or candidate.ratio_error < best.ratio_error:
            best = candidate

    return best
