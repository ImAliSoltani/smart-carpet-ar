"""Cut the carpet out of a query photograph before it is embedded.

The debt this pays off is recorded at the end of فاز ۴٫۵: retrieval on an angled
`cover` shot reaches rank 1 for 38٪ of queries, and on a `room` shot for 10٪.
The cause is mechanical rather than a bug — DINOv2 embeds **the whole frame**,
and in a photograph of a living room most of the frame is wall, parquet and
sofa. The colour histogram makes it worse in the same direction, because it
faithfully reports the colour of the floorboards. The catalogue side of the
comparison is a rug edge to edge; the query side is a room. They are not
photographs of the same kind of thing.

So the fix is not a better model, it is making both sides the same kind of
photograph: find the rug in the frame and embed only that.

**Why this is not `app.ar.rectify.detect_corners`.** That detector answers a
different question well. It looks for the four corners of a rug that fills a
studio frame, to perspective-correct it into a texture, and its area floor is a
quarter of the image because anything smaller cannot be the subject of a flat
shot. Here the rug is often a fifth of the frame and seen at a steep angle, and
nothing downstream needs corner precision — an axis-aligned box that mostly
contains the rug is worth as much as a perfect quadrilateral, because the next
step resizes it to 224×224 anyway. Two different questions, two detectors; the
AR one stays untouched, since it is the one that is on device-tested code.

**Failure returns the original bytes.** A query image where nothing rug-shaped
is found is handed on whole, so the worst case of this step is the behaviour
that existed before it. That matters more than the average case: a wrong crop
throws away the answer, while no crop merely keeps today's number.
"""

from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO

import cv2
import numpy as np
from PIL import Image

from app.ar.rectify import order_corners, quad_regularity

#: Work size. Every threshold below is expressed against this, so an 848×1264
#: generated image and a 4000px phone photograph are judged the same way.
WORK_PX = 900

#: A rug can be a fifth of a room photograph and still be the subject. Below
#: this it is a cushion, a picture frame, or a patch of the rug's own border.
MIN_AREA_RATIO = 0.06

#: Above this the candidate is most of the frame already; cropping to it can
#: only shave context, so leave the image alone and save the reprocessing.
MAX_AREA_RATIO = 0.92

#: How rectangle-like the quadrilateral has to be. `quad_regularity` returns
#: 1.0 for a perfect parallelogram-with-right-angles and decays with both
#: skew and unequal opposite sides; a rug seen from a sofa still scores well
#: above this, while the ragged blob a shadow makes does not.
MIN_REGULARITY = 0.45

#: The box is grown by this fraction of its own size on every side. A rug's
#: fringe and its outer guard band carry pattern the embedding wants, and the
#: contour tends to sit just inside the pile.
MARGIN = 0.04


@dataclass(frozen=True)
class CropResult:
    """What the locator decided, kept separate from the bytes so it can be shown.

    `box` is None when the image was left alone — either nothing convincing was
    found, or the candidate already filled the frame.
    """

    box: tuple[int, int, int, int] | None
    confidence: float
    reason: str


def locate_carpet(image: Image.Image) -> CropResult:
    """Find the rug's bounding box in a photograph. Never raises."""
    frame = np.array(image.convert("RGB"))
    height, width = frame.shape[:2]
    if height == 0 or width == 0:
        return CropResult(None, 0.0, "empty image")

    scale = WORK_PX / max(height, width)
    working = (
        cv2.resize(frame, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        if scale < 1.0
        else frame
    )
    scale = min(scale, 1.0)

    gray = cv2.cvtColor(working, cv2.COLOR_RGB2GRAY)
    # Bilateral first for the same reason the AR detector uses it: a rug's pile
    # is high-frequency everywhere, and Canny on raw pixels finds the pattern
    # instead of the rug.
    gray = cv2.bilateralFilter(gray, 9, 60, 60)
    edges = cv2.Canny(gray, 40, 130)
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    frame_area = float(working.shape[0] * working.shape[1])
    best: tuple[float, np.ndarray, float] | None = None

    for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:12]:
        area = cv2.contourArea(contour)
        ratio = area / frame_area
        if ratio < MIN_AREA_RATIO:
            break  # sorted by area; everything after is smaller
        perimeter = cv2.arcLength(contour, closed=True)
        approx = cv2.approxPolyDP(contour, 0.02 * perimeter, closed=True)
        if len(approx) != 4 or not cv2.isContourConvex(approx):
            continue
        regularity = quad_regularity(order_corners(approx.reshape(4, 2).astype(float)))
        if regularity < MIN_REGULARITY:
            continue
        # Coverage breaks ties towards the larger of two rug-shaped things, on
        # the assumption that a photograph is of its biggest subject.
        score = regularity * (0.6 + 0.4 * min(ratio, 1.0))
        if best is None or score > best[0]:
            best = (score, approx.reshape(4, 2).astype(float), ratio)

    if best is None:
        return CropResult(None, 0.0, "no rug-shaped quadrilateral")

    score, quad, ratio = best
    if ratio > MAX_AREA_RATIO:
        return CropResult(None, round(min(score, 1.0), 3), "already fills the frame")

    quad = quad / scale
    x0, y0 = quad.min(axis=0)
    x1, y1 = quad.max(axis=0)
    pad_x = (x1 - x0) * MARGIN
    pad_y = (y1 - y0) * MARGIN
    box = (
        int(max(0, x0 - pad_x)),
        int(max(0, y0 - pad_y)),
        int(min(width, x1 + pad_x)),
        int(min(height, y1 + pad_y)),
    )
    if box[2] - box[0] < 32 or box[3] - box[1] < 32:
        return CropResult(None, round(min(score, 1.0), 3), "box too small to embed")
    return CropResult(box, round(min(score, 1.0), 3), "cropped")


def crop_image(image: Image.Image) -> tuple[Image.Image, CropResult]:
    """The located rug as its own image, plus what the locator decided."""
    result = locate_carpet(image)
    if result.box is None:
        return image, result
    return image.crop(result.box), result


def crop_to_carpet(data: bytes) -> bytes:
    """Bytes in, bytes out — the shape `app.eval.retrieval.evaluate` wants.

    Re-encoded as PNG rather than JPEG so the experiment measures the crop and
    not a second round of compression artefacts on an already-compressed image.
    """
    try:
        image = Image.open(BytesIO(data))
        cropped, result = crop_image(image)
    except Exception:  # noqa: BLE001 — a query image that cannot be read is the caller's problem
        return data
    if result.box is None:
        return data
    buffer = BytesIO()
    cropped.convert("RGB").save(buffer, format="PNG")
    return buffer.getvalue()
