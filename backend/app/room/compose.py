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
from app.room.segment import floor_mask, refine_edges

# Scene points closer than the floor by more than this are treated as objects
# standing on it. Below the tolerance we are inside depth noise.
OCCLUSION_MARGIN_M = 0.035
# How closely depth must match the plane for a pixel to count as floor despite
# what the segmenter said. Generous, because monocular depth is smooth but not
# exact; the margin above still removes anything genuinely standing up.
FLOOR_AGREEMENT_M = 0.06


@dataclass
class RoomScene:
    image: Image.Image
    depth_m: np.ndarray
    points: np.ndarray
    floor: FloorPlane
    focal: float
    cx: float
    cy: float
    floor_mask: np.ndarray

    @property
    def confidence(self) -> float:
        return self.floor.confidence


class RoomAnalysisError(RuntimeError):
    """The photo could not be understood well enough to place a carpet."""


def analyze_room(image: Image.Image, *, hfov_deg: float | None = None) -> RoomScene:
    from app.room.depth import DEFAULT_HFOV_DEG, hfov_from_exif

    depth = estimate_depth(image)
    hfov = hfov_deg or hfov_from_exif(image) or DEFAULT_HFOV_DEG
    focal, cx, cy = intrinsics(depth.width, depth.height, hfov)
    points = back_project(depth.depth_m, focal, cx, cy)

    mask = floor_mask(image)
    floor = fit_floor(points, mask=mask)
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
        floor_mask=mask,
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


def occlusion_mask(scene: RoomScene) -> np.ndarray:
    """Full-frame visibility: 1 where the floor is exposed, 0 where something
    stands on it.

    Primarily the segmentation mask, because its boundaries come from the photo
    and therefore land on real object edges — thin chair legs included. Depth
    still contributes: anything clearly nearer than the floor plane is an
    occluder even if the segmenter labelled it floor, which catches objects
    lying flat on the ground.

    Independent of where the carpet is: the carpet never leaves the plane, so
    this is a fixed property of the photo. That is what lets the browser move
    the carpet freely after a single server-side analysis.
    """
    visible = scene.floor_mask.astype(np.float32).copy()

    height, width = scene.depth_m.shape
    us, vs = np.meshgrid(np.arange(width, dtype=np.float32), np.arange(height, dtype=np.float32))
    plane_depth = scene.floor.depth_at(us, vs, scene.focal, scene.cx, scene.cy)
    valid = np.isfinite(plane_depth)

    # Rescue shadowed floor. A segmenter often loses the floor inside a shadow
    # and hands that region to the object casting it, which punches holes in the
    # carpet exactly where a chair meets the ground. Depth does not care about
    # shadows: where it agrees closely with the plane, the pixel is floor.
    agrees = valid & (np.abs(scene.depth_m - plane_depth) < FLOOR_AGREEMENT_M)
    visible = np.maximum(visible, agrees.astype(np.float32) * 0.95)

    # Depth still has the final veto: anything clearly nearer than the plane is
    # standing on it, even where the segmenter called it floor.
    clearly_in_front = valid & (scene.depth_m < plane_depth - OCCLUSION_MARGIN_M)
    visible[clearly_in_front] = 0.0

    # One more pass against the photo, so the rescued regions keep clean edges.
    return refine_edges(np.clip(visible, 0.0, 1.0), scene.image)


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
    visible = occlusion_mask(scene) * alpha

    # Contact shadow: a soft darkening just outside the carpet edge sells the
    # idea that it is resting on the floor rather than floating in the image.
    spread = max(3, int(0.012 * max(size)) | 1)
    halo = cv2.GaussianBlur(alpha, (spread * 2 + 1, spread * 2 + 1), 0)
    shadow = np.clip(halo - alpha, 0, 1) * 0.32
    room = room * (1.0 - shadow[..., None])

    blended = room * (1.0 - visible[..., None]) + warped * visible[..., None]
    return Image.fromarray(np.clip(blended, 0, 255).astype(np.uint8))
