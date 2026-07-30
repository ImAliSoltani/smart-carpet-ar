"""Recover the floor plane from a room photo's metric depth.

The floor is found by RANSAC over the points in the lower part of the frame,
with a hard constraint that the winning plane's normal actually points up. That
constraint matters: a wall or a table top is also a large flat surface, and
without it the fit happily lands on one of them.

Camera convention throughout: X right, Y down, Z forward — so "up" is -Y.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

# A plane is only accepted as the floor if its normal is within this angle of up.
MAX_TILT_DEG = 32.0
INLIER_THRESHOLD_M = 0.045
RANSAC_ITERATIONS = 900


@dataclass
class FloorPlane:
    normal: np.ndarray  # unit, pointing up (negative Y component)
    offset: float  # plane is normal . P + offset = 0
    inlier_ratio: float
    camera_height_m: float

    @property
    def confidence(self) -> float:
        """0..1. Low values mean the caller should ask a human rather than guess."""
        # Furniture covers most of a room photo's lower half, so even a perfect
        # fit only claims a fraction of the sampled points; measured runs on real
        # rooms land at 0.20-0.30, which is why the scale is set here.
        support = min(1.0, self.inlier_ratio / 0.28)
        # A camera between hip and eye height is what a person photographing a
        # room actually produces; anything else means the geometry is suspect.
        height_score = 1.0 if 0.7 <= self.camera_height_m <= 2.2 else 0.35
        # Note: how far the plane is tilted relative to the camera is NOT a
        # quality signal — pointing the phone down at the floor tilts it by
        # design. Tilt is only used as a hard filter to reject walls during
        # fitting.
        return round(float(support * height_score), 3)

    def depth_at(self, us: np.ndarray, vs: np.ndarray, focal: float, cx: float, cy: float):
        """Depth of the plane along each pixel's ray (NaN where the ray misses)."""
        dirs = np.stack(
            [(us - cx) / focal, (vs - cy) / focal, np.ones_like(us, dtype=np.float32)], axis=-1
        )
        denominator = dirs @ self.normal
        with np.errstate(divide="ignore", invalid="ignore"):
            t = -self.offset / denominator
        t[~np.isfinite(t)] = np.nan
        t[t <= 0] = np.nan  # plane is behind the camera along this ray
        return t  # dirs have z = 1, so t is exactly the depth

    def basis(self) -> tuple[np.ndarray, np.ndarray]:
        """Two orthonormal in-plane axes: one pointing right, one away from camera."""
        right = np.array([1.0, 0.0, 0.0], dtype=np.float32)
        right = right - self.normal * float(right @ self.normal)
        norm = np.linalg.norm(right)
        if norm < 1e-6:  # camera rolled 90 degrees
            right = np.array([0.0, 0.0, 1.0], dtype=np.float32)
            right = right - self.normal * float(right @ self.normal)
            norm = np.linalg.norm(right)
        right /= norm
        forward = np.cross(self.normal, right)
        return right.astype(np.float32), (forward / np.linalg.norm(forward)).astype(np.float32)


def fit_floor(
    points: np.ndarray, *, mask: np.ndarray | None = None, rng_seed: int = 1405
) -> FloorPlane | None:
    """Fit the floor to a (H, W, 3) camera-space point grid.

    `mask` is a 0..1 floor probability. When supplied, only pixels the segmenter
    called floor take part — which is far better than a geometric guess, because
    a room photo's lower half is mostly furniture.
    """
    height, width = points.shape[:2]
    if mask is not None and float(mask.mean()) > 0.02:
        selected = points[mask > 0.6]
        region = selected.reshape(-1, 3)
    else:
        # Fallback when segmentation found nothing: the floor is essentially
        # always in the lower part of the frame.
        region = points[int(height * 0.45) :].reshape(-1, 3)
    region = region[np.isfinite(region).all(axis=1) & (region[:, 2] > 0.15)]
    if len(region) < 500:
        return None

    rng = np.random.default_rng(rng_seed)
    sample = region[rng.choice(len(region), size=min(len(region), 20000), replace=False)]

    best: FloorPlane | None = None
    best_inliers = 0
    max_tilt_cos = np.cos(np.radians(MAX_TILT_DEG))

    for _ in range(RANSAC_ITERATIONS):
        trio = sample[rng.choice(len(sample), size=3, replace=False)]
        normal = np.cross(trio[1] - trio[0], trio[2] - trio[0])
        length = np.linalg.norm(normal)
        if length < 1e-6:
            continue
        normal = normal / length
        if normal[1] > 0:  # make it point up (-Y)
            normal = -normal
        if -normal[1] < max_tilt_cos:  # too tilted to be a floor
            continue

        offset = -float(normal @ trio[0])
        distances = np.abs(sample @ normal + offset)
        inliers = int(np.count_nonzero(distances < INLIER_THRESHOLD_M))
        if inliers > best_inliers:
            best_inliers = inliers
            best = FloorPlane(
                normal=normal.astype(np.float32),
                offset=offset,
                inlier_ratio=inliers / len(sample),
                camera_height_m=abs(offset),
            )

    if best is None or best.inlier_ratio < 0.12:
        return None

    # Refine on the inliers: three random points give a coarse plane, least
    # squares over everything that agreed gives a stable one.
    distances = np.abs(sample @ best.normal + best.offset)
    inlier_points = sample[distances < INLIER_THRESHOLD_M]
    centroid = inlier_points.mean(axis=0)
    _, _, vh = np.linalg.svd(inlier_points - centroid, full_matrices=False)
    normal = vh[-1]
    if normal[1] > 0:
        normal = -normal
    offset = -float(normal @ centroid)

    return FloorPlane(
        normal=normal.astype(np.float32),
        offset=offset,
        inlier_ratio=best.inlier_ratio,
        camera_height_m=abs(offset),
    )
