"""Place a carpet into a room photo, correctly occluded by the furniture.

The occlusion mask is the whole point of doing this on a still photo rather than
in live AR: with seconds instead of milliseconds to spend, the depth map can be
computed at full resolution, so a chair leg standing on the carpet cuts a clean
edge instead of the blocky, shimmering one a phone's realtime depth produces.

Everything here is ordinary geometry once the floor plane is known:
carpet rectangle on the plane -> project its corners -> homography for the
texture -> compare scene depth against plane depth to decide what covers it.
"""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np
from PIL import Image

from app.room.depth import back_project, estimate_depth, intrinsics
from app.room.floor import FloorPlane, fit_floor

# Scene points closer than the floor by more than this are treated as objects
# standing on it. Below the tolerance we are inside depth noise.
OCCLUSION_MARGIN_M = 0.035


@dataclass
class RoomScene:
    image: Image.Image
    depth_m: np.ndarray
    points: np.ndarray
    floor: FloorPlane
    focal: float
    cx: float
    cy: float

    @property
    def confidence(self) -> float:
        return self.floor.confidence


class RoomAnalysisError(RuntimeError):
    """The photo could not be understood well enough to place a carpet."""


def analyze_room(image: Image.Image, *, hfov_deg: float | None = None) -> RoomScene:
    from app.room.depth import DEFAULT_HFOV_DEG

    depth = estimate_depth(image)
    focal, cx, cy = intrinsics(depth.width, depth.height, hfov_deg or DEFAULT_HFOV_DEG)
    points = back_project(depth.depth_m, focal, cx, cy)

    floor = fit_floor(points)
    if floor is None:
        raise RoomAnalysisError(
            "کف اتاق در این عکس تشخیص داده نشد؛ عکسی بگیرید که کف در آن دیده شود"
        )

    return RoomScene(
        image=image.convert("RGB"),
        depth_m=depth.depth_m,
        points=points,
        floor=floor,
        focal=focal,
        cx=cx,
        cy=cy,
    )


def default_anchor(scene: RoomScene) -> np.ndarray:
    """A sensible starting spot: where the ray through the lower-middle of the
    frame lands on the floor — usually the open area in front of the camera."""
    us = np.array([[scene.cx]], dtype=np.float32)
    vs = np.array([[scene.cy + scene.image.height * 0.28]], dtype=np.float32)
    depth = scene.floor.depth_at(us, vs, scene.focal, scene.cx, scene.cy)[0, 0]
    if not np.isfinite(depth):
        depth = float(np.nanmedian(scene.depth_m))
    direction = np.array(
        [(us[0, 0] - scene.cx) / scene.focal, (vs[0, 0] - scene.cy) / scene.focal, 1.0],
        dtype=np.float32,
    )
    return direction * depth


def carpet_corners_3d(
    scene: RoomScene, anchor: np.ndarray, width_m: float, length_m: float, yaw_rad: float = 0.0
) -> np.ndarray:
    """Four corners of the carpet rectangle lying on the floor plane."""
    right, forward = scene.floor.basis()
    cos_y, sin_y = np.cos(yaw_rad), np.sin(yaw_rad)
    axis_u = right * cos_y + forward * sin_y
    axis_v = -right * sin_y + forward * cos_y

    half_w, half_l = width_m / 2.0, length_m / 2.0
    # order: far-left, far-right, near-right, near-left (matches texture TL,TR,BR,BL)
    return np.stack(
        [
            anchor - axis_u * half_w + axis_v * half_l,
            anchor + axis_u * half_w + axis_v * half_l,
            anchor + axis_u * half_w - axis_v * half_l,
            anchor - axis_u * half_w - axis_v * half_l,
        ]
    ).astype(np.float32)


def project(points_3d: np.ndarray, focal: float, cx: float, cy: float) -> np.ndarray:
    z = np.clip(points_3d[:, 2], 1e-3, None)
    return np.stack([points_3d[:, 0] / z * focal + cx, points_3d[:, 1] / z * focal + cy], axis=-1)


def _occlusion_mask(scene: RoomScene, carpet_alpha: np.ndarray) -> np.ndarray:
    """1 where the carpet is visible, 0 where furniture covers it."""
    height, width = scene.depth_m.shape
    us, vs = np.meshgrid(np.arange(width, dtype=np.float32), np.arange(height, dtype=np.float32))
    plane_depth = scene.floor.depth_at(us, vs, scene.focal, scene.cx, scene.cy)

    in_front = (scene.depth_m < plane_depth - OCCLUSION_MARGIN_M) & np.isfinite(plane_depth)
    visible = (~in_front).astype(np.float32)

    # Follow the real object edges: a guided/joint-bilateral step snaps the mask
    # to the photo's own boundaries instead of the depth map's softer ones.
    guide = cv2.cvtColor(np.array(scene.image), cv2.COLOR_RGB2GRAY)
    visible = cv2.ximgproc.jointBilateralFilter(guide, visible, 9, 24, 9) if _has_ximgproc() else (
        cv2.bilateralFilter(visible, 9, 0.15, 9)
    )
    return np.clip(visible, 0.0, 1.0) * carpet_alpha


def _has_ximgproc() -> bool:
    return hasattr(cv2, "ximgproc")


def _match_lighting(carpet: np.ndarray, room: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Scale the carpet's brightness towards the floor it is replacing, so it
    reads as lit by the room rather than pasted on top of it."""
    area = mask > 0.5
    if area.sum() < 100:
        return carpet
    room_luma = room[area].mean()
    carpet_luma = carpet[area].mean()
    if carpet_luma < 1e-3:
        return carpet
    # Damped: a full match would erase the carpet's own tone.
    gain = float(np.clip((room_luma / carpet_luma) ** 0.45, 0.72, 1.35))
    return np.clip(carpet * gain, 0, 255)


def place_carpet(
    scene: RoomScene,
    carpet_texture: Image.Image,
    *,
    width_m: float,
    length_m: float,
    anchor: np.ndarray | None = None,
    yaw_rad: float = 0.0,
) -> Image.Image:
    """Composite the carpet into the room photo at true perspective and scale."""
    if anchor is None:
        anchor = default_anchor(scene)

    corners_3d = carpet_corners_3d(scene, anchor, width_m, length_m, yaw_rad)
    if np.any(corners_3d[:, 2] <= 0.05):
        raise RoomAnalysisError("فرش در این موقعیت پشت دوربین می‌افتد؛ نقطه‌ی دیگری را انتخاب کنید")

    image_corners = project(corners_3d, scene.focal, scene.cx, scene.cy).astype(np.float32)

    texture = np.array(carpet_texture.convert("RGB"))
    th, tw = texture.shape[:2]
    source = np.array([[0, 0], [tw - 1, 0], [tw - 1, th - 1], [0, th - 1]], dtype=np.float32)
    homography = cv2.getPerspectiveTransform(source, image_corners)

    room = np.array(scene.image).astype(np.float32)
    size = (scene.image.width, scene.image.height)
    warped = cv2.warpPerspective(
        texture, homography, size, flags=cv2.INTER_CUBIC
    ).astype(np.float32)
    alpha = cv2.warpPerspective(
        np.ones((th, tw), dtype=np.float32), homography, size, flags=cv2.INTER_LINEAR
    )

    warped = _match_lighting(warped, room, alpha)
    visible = _occlusion_mask(scene, alpha)

    # Contact shadow: a soft darkening just outside the carpet edge sells the
    # idea that it is resting on the floor rather than floating in the image.
    spread = max(3, int(0.012 * max(size)) | 1)
    halo = cv2.GaussianBlur(alpha, (spread * 2 + 1, spread * 2 + 1), 0)
    shadow = np.clip(halo - alpha, 0, 1) * 0.32
    room = room * (1.0 - shadow[..., None])

    blended = room * (1.0 - visible[..., None]) + warped * visible[..., None]
    return Image.fromarray(np.clip(blended, 0, 255).astype(np.uint8))
