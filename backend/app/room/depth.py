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

# Fallback horizontal field of view when the photo carries no lens data.
# Phone main cameras cluster around 65-72 degrees; getting this badly wrong
# skews the recovered floor, so EXIF is always preferred.
DEFAULT_HFOV_DEG = 68.0


def hfov_from_exif(image: Image.Image) -> float | None:
    """Horizontal field of view from the photo's own lens data, if present.

    Phones record the 35 mm-equivalent focal length, which maps directly to a
    field of view against the 36 mm full-frame width — far better than guessing,
    and it costs nothing to read.
    """
    try:
        exif = image.getexif()
    except Exception:
        return None
    if not exif:
        return None

    equivalent = exif.get(41989)  # FocalLengthIn35mmFilm
    if not equivalent:
        return None
    try:
        focal_35mm = float(equivalent)
    except (TypeError, ValueError):
        return None
    if not 8.0 <= focal_35mm <= 400.0:
        return None

    hfov = 2.0 * np.degrees(np.arctan(36.0 / (2.0 * focal_35mm)))
    # Portrait shots record the focal for the long edge; swap when needed.
    if image.height > image.width:
        vfov_rad = 2.0 * np.arctan(24.0 / (2.0 * focal_35mm))
        hfov = np.degrees(vfov_rad)
    return float(hfov)


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
