"""Metric depth estimation for a single room photo.

A *metric* model is used rather than a relative one on purpose. Relative depth
is only defined up to an unknown scale and shift, which means back-projecting it
bends straight surfaces — a floor stops being a plane, and the whole geometry we
need falls apart. The metric indoor variant returns depth in real metres, so
planes stay planes and the same map can later answer "how much free floor is
there" for size matching.

The model is loaded lazily and cached: importing this module must stay cheap for
the parts of the API that never touch it.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

import numpy as np
from PIL import Image

MODEL_ID = "depth-anything/Depth-Anything-V2-Metric-Indoor-Small-hf"

# Typical phone/camera horizontal field of view. A single photo carries no
# intrinsics, so this is an assumption; it is exposed because getting it badly
# wrong tilts the recovered floor.
DEFAULT_HFOV_DEG = 60.0


@dataclass
class DepthResult:
    depth_m: np.ndarray  # (H, W) metric depth in metres
    width: int
    height: int


@lru_cache(maxsize=1)
def _estimator():
    from transformers import pipeline

    return pipeline("depth-estimation", model=MODEL_ID)


def estimate_depth(image: Image.Image, *, max_side: int = 1024) -> DepthResult:
    """Metric depth for an RGB image, resized back to the input resolution."""
    rgb = image.convert("RGB")
    work = rgb.copy()
    if max(work.size) > max_side:
        work.thumbnail((max_side, max_side), Image.LANCZOS)

    raw = _estimator()(work)["predicted_depth"]
    depth = raw.squeeze().detach().cpu().numpy().astype(np.float32)

    # the pipeline may return its own working resolution
    if depth.shape != (rgb.height, rgb.width):
        depth = np.array(
            Image.fromarray(depth).resize((rgb.width, rgb.height), Image.BILINEAR)
        )

    return DepthResult(depth_m=depth, width=rgb.width, height=rgb.height)


def intrinsics(
    width: int, height: int, hfov_deg: float = DEFAULT_HFOV_DEG
) -> tuple[float, float, float]:
    """(focal_px, cx, cy) for an assumed horizontal field of view."""
    focal = (width / 2.0) / np.tan(np.radians(hfov_deg) / 2.0)
    return float(focal), width / 2.0, height / 2.0


def back_project(depth_m: np.ndarray, focal: float, cx: float, cy: float) -> np.ndarray:
    """Depth map -> (H, W, 3) camera-space points. X right, Y down, Z forward."""
    height, width = depth_m.shape
    us, vs = np.meshgrid(np.arange(width, dtype=np.float32), np.arange(height, dtype=np.float32))
    z = depth_m
    x = (us - cx) * z / focal
    y = (vs - cy) * z / focal
    return np.stack([x, y, z], axis=-1)
