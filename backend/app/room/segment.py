"""Semantic floor segmentation.

Depth alone is a poor source for occlusion. A chair leg is a few pixels wide and
appears in a depth map as a soft smudge, so thresholding depth against the floor
plane produces ragged, blocky edges — which is exactly how the first version of
the room visualiser failed.

Segmentation answers a different, easier question: is this pixel floor, or is it
something standing on the floor? Its boundaries come from the photo itself, so
they land on real object edges. A guided filter then snaps the upsampled mask
back onto those edges at full resolution.

The same mask also makes the geometry better: fitting the floor plane only to
pixels that are actually floor removes furniture and walls from the vote.
"""

from __future__ import annotations

from functools import lru_cache

import cv2
import numpy as np
from PIL import Image

MODEL_ID = "nvidia/segformer-b4-finetuned-ade-512-512"

# ADE20K label names that count as walkable ground for our purpose. An existing
# rug is still floor: the new carpet may legitimately be laid over it.
FLOOR_LABELS = {"floor", "flooring", "rug", "carpet", "carpeting", "earth", "ground", "path"}


@lru_cache(maxsize=1)
def _segmenter():
    from transformers import pipeline

    return pipeline("image-segmentation", model=MODEL_ID)


def floor_mask(image: Image.Image, *, work_side: int = 1024) -> np.ndarray:
    """Soft 0..1 mask of the floor, at the input image's resolution."""
    rgb = image.convert("RGB")
    work = rgb.copy()
    if max(work.size) > work_side:
        work.thumbnail((work_side, work_side), Image.LANCZOS)

    combined = None
    for segment in _segmenter()(work):
        label = str(segment.get("label", "")).lower()
        if not any(token in label for token in FLOOR_LABELS):
            continue
        piece = np.array(segment["mask"].convert("L"), dtype=np.float32) / 255.0
        combined = piece if combined is None else np.maximum(combined, piece)

    if combined is None:
        return np.zeros((rgb.height, rgb.width), dtype=np.float32)

    mask = cv2.resize(combined, (rgb.width, rgb.height), interpolation=cv2.INTER_LINEAR)
    return refine_edges(mask, rgb)


def refine_edges(mask: np.ndarray, image: Image.Image) -> np.ndarray:
    """Pull a coarse mask onto the photo's own edges.

    Segmentation runs at a reduced resolution, so a thin chair leg comes back
    blurred across several pixels. Guided filtering re-sharpens the boundary
    using the full-resolution image as the guide, which is what makes the leg
    cut a clean line through the carpet.
    """
    guide = np.array(image.convert("RGB"))
    if hasattr(cv2, "ximgproc"):
        refined = cv2.ximgproc.guidedFilter(guide, mask.astype(np.float32), radius=8, eps=1e-4)
    else:
        gray = cv2.cvtColor(guide, cv2.COLOR_RGB2GRAY)
        refined = cv2.bilateralFilter(mask.astype(np.float32), 9, 0.1, 9)
        # push values away from the middle so the edge stays crisp
        refined = np.clip((refined - 0.5) * 1.6 + 0.5, 0, 1)
        del gray
    return np.clip(refined, 0.0, 1.0)
