"""Semantic floor segmentation, at a resolution that can actually see a chair leg.

Depth alone is a poor source for occlusion: a chair leg is a few pixels wide and
appears in a depth map as a soft smudge, so thresholding depth against the floor
plane can only ever give ragged edges. Segmentation answers an easier question —
floor, or something standing on it — and its boundaries come from the photo, so
they land on real object edges.

Two details decide whether the result looks clean or looks torn:

* **Resolution.** The stock pipeline resizes to 512x512, where an 8 px chair leg
  survives as barely two pixels and its contact with the floor dissolves. The
  model is fully convolutional, so it is run here at a much larger input size.
* **Soft probabilities, not hard labels.** Upsampling a binary mask invents
  staircase edges. Upsampling the class logits and thresholding afterwards keeps
  the boundary where the model actually put it.

A guided filter then snaps the result onto full-resolution image edges.
"""

from __future__ import annotations

from functools import lru_cache

import cv2
import numpy as np
from PIL import Image

MODEL_ID = "nvidia/segformer-b4-finetuned-ade-512-512"

# ADE20K classes that count as ground for our purpose. An existing rug is still
# floor: a new carpet may legitimately be laid over it.
FLOOR_TOKENS = ("floor", "flooring", "rug", "carpet", "earth", "ground", "path")

# Inference resolution. Large enough that thin furniture legs and their contact
# with the floor survive; the still-photo budget makes the cost irrelevant.
INFERENCE_SIDE = 1280


@lru_cache(maxsize=1)
def _model():
    import torch
    from transformers import SegformerForSemanticSegmentation, SegformerImageProcessor

    processor = SegformerImageProcessor.from_pretrained(MODEL_ID)
    model = SegformerForSemanticSegmentation.from_pretrained(MODEL_ID)
    model.eval()
    floor_ids = [
        index
        for index, label in model.config.id2label.items()
        if any(token in str(label).lower() for token in FLOOR_TOKENS)
    ]
    return torch, processor, model, floor_ids


def floor_probability(image: Image.Image) -> np.ndarray:
    """Soft 0..1 floor probability at the input image's resolution."""
    torch, processor, model, floor_ids = _model()
    rgb = image.convert("RGB")

    work = rgb.copy()
    work.thumbnail((INFERENCE_SIDE, INFERENCE_SIDE), Image.LANCZOS)
    inputs = processor(images=work, return_tensors="pt", do_resize=False)

    with torch.inference_mode():
        logits = model(**inputs).logits  # (1, classes, h/4, w/4)

    # Interpolate the logits, not a thresholded mask: this is what keeps the
    # boundary smooth and sub-pixel instead of stair-stepped.
    upsampled = torch.nn.functional.interpolate(
        logits, size=(rgb.height, rgb.width), mode="bilinear", align_corners=False
    )
    probabilities = upsampled.softmax(dim=1)[0]
    floor = probabilities[floor_ids].sum(dim=0)
    return floor.cpu().numpy().astype(np.float32)


def refine_edges(mask: np.ndarray, image: Image.Image, *, radius: int = 6) -> np.ndarray:
    """Pull a mask onto the photo's own edges at full resolution."""
    guide = np.array(image.convert("RGB"))
    if hasattr(cv2, "ximgproc"):
        refined = cv2.ximgproc.guidedFilter(guide, mask.astype(np.float32), radius, 1e-4)
    else:
        refined = cv2.bilateralFilter(mask.astype(np.float32), 9, 0.1, 9)
    # Sharpen the transition so half-covered pixels commit one way or the other;
    # a wide grey band around every leg is what reads as a torn carpet.
    refined = np.clip((refined - 0.5) * 2.2 + 0.5, 0.0, 1.0)
    return refined


def reclaim_by_colour(mask: np.ndarray, image: Image.Image) -> np.ndarray:
    """Give back floor pixels the segmenter attached to the object above them.

    Around the point where a chair leg meets the ground, the segmenter tends to
    absorb a little of the floor into the leg. Those stray pixels are the ones
    that show through a placed carpet as pale specks — the defect that makes it
    look torn. They are, however, unmistakably floor by colour, so a model built
    from the confidently-floor pixels can hand them back.

    Deliberately conservative: it only reclaims pixels the mask was already
    unsure about, so a solid chair leg is never repainted as floor.
    """
    confident = mask > 0.85
    if confident.sum() < 5000:
        return mask

    lab = cv2.cvtColor(np.array(image.convert("RGB")), cv2.COLOR_RGB2LAB).astype(np.float32)
    samples = lab[confident]
    mean = samples.mean(axis=0)
    covariance = np.cov(samples, rowvar=False) + np.eye(3) * 4.0
    inverse = np.linalg.inv(covariance)

    difference = lab - mean
    # Mahalanobis distance: how many standard deviations from the floor's colour
    distance = np.einsum("...i,ij,...j->...", difference, inverse, difference)
    looks_like_floor = distance < 6.0

    uncertain = (mask > 0.12) & (mask <= 0.85)
    return np.where(uncertain & looks_like_floor, 1.0, mask).astype(np.float32)


def floor_mask(image: Image.Image) -> np.ndarray:
    probability = floor_probability(image)
    probability = reclaim_by_colour(probability, image)
    return refine_edges(probability, image)
