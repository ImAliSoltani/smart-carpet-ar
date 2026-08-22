"""How wrong the size guide's ruler is, over a scene where the truth is known.

The size guide answers «چه اندازه فرشی در این اتاق جا می‌شود», and every part of
that answer is downstream of one number: how many metres a pixel is worth. On a
single photograph that number is a guess, which is why §6-7 lets a shopper put a
sheet of A4 on the floor — ISO 216 fixes its dimensions exactly, so one sheet
turns the guess into a measurement.

**Measured on synthetic scenes, and that is a choice with a reason.** A room
photograph has no ground truth in it: nobody measured the free floor in those
rooms to the centimetre, so an error computed against them would be an error
against another estimate. Here the floor plane, the camera, and the sheet's
position are *constructed*, so the true scale is known to machine precision and
the number below is the error of the code rather than the error of a guess about
the code. What it therefore does **not** cover is finding a real sheet in a real
photograph — creased, half-shadowed, on a patterned floor — and فاز ۴ recorded
the ordinary failure of that honestly: no sheet found returns None rather than a
guess, and the interface says the answer is approximate.

The scene is rendered the way `find_a4_scale` will read it back: a sheet lying
on the floor plane is projected through the same pinhole model, so a sign error
in either direction shows up as a scale that is out rather than as a pair of
mistakes that cancel.
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass

import cv2
import numpy as np

from app.room.floor import FloorPlane
from app.room.scale import A4_LONG_M, A4_SHORT_M, find_a4_scale

#: A room photograph as this pipeline sees it — the size guide reduces every
#: upload to 900px on the long edge before anything runs.
FRAME = (900, 600)  # width, height


@dataclass(frozen=True)
class Scene:
    """One synthetic room, and the answer it should produce.

    **The camera is aimed at the sheet**, and that took two corrections to get
    right. With the camera level, the floor 1.4 m below it projects entirely
    below the frame, so the first version rendered 72 scenes containing no sheet
    at all; the detector correctly found nothing in every one and the report read
    «0٪ sheet found», which looks like a damning result about the detector and
    was a bug in the scene. Fixing that with a *fixed* 25° tilt fixed most of
    them and still lost the sheet off the bottom whenever the camera was held
    high or the sheet was near — 24 of 72 found at eye height. Both are the same
    mistake: a person taking this photograph looks at the sheet, so the pitch is
    derived from where the sheet should land in the frame rather than assumed.

    `distance_m` is measured along the floor from the point directly beneath the
    camera, which is where a sheet's distance is actually felt.
    """

    true_scale: float
    camera_height_m: float
    distance_m: float
    sheet_rotation_deg: float
    #: Where the sheet's centre sits vertically in the frame, 0 at the top. A
    #: little below the middle, which is where a photograph of the floor in
    #: front of you puts it.
    aim_at: float = 0.62


@dataclass(frozen=True)
class Trial:
    scene: Scene
    recovered: float | None
    #: The sheet's longest side in pixels, as drawn. Reported because it is the
    #: thing the shopper controls — the corner refinement works on whole pixels,
    #: so half a pixel of corner error on a 60px sheet is nearly one percent of
    #: the answer, and on a 200px sheet it is a quarter of that.
    sheet_px: float = 0.0

    @property
    def found(self) -> bool:
        return self.recovered is not None

    @property
    def error(self) -> float | None:
        if self.recovered is None:
            return None
        return abs(self.recovered - self.scene.true_scale) / self.scene.true_scale


def _project(points_3d: np.ndarray, focal: float, cx: float, cy: float) -> np.ndarray:
    """Pinhole projection — the same model `_on_plane` inverts."""
    z = np.maximum(points_3d[:, 2], 1e-6)
    return np.stack([points_3d[:, 0] / z * focal + cx, points_3d[:, 1] / z * focal + cy], axis=1)


def render(
    scene: Scene, *, focal: float = 700.0
) -> tuple[np.ndarray, FloorPlane, float, float, np.ndarray]:
    """A dark floor with one pale sheet on it, plus the plane it was drawn on.

    Camera coordinates throughout: x right, y **down**, z forward, camera at the
    origin. Tilting the camera down by φ turns the floor's upward normal into
    `(0, -cos φ, -sin φ)` and leaves its distance from the camera — and therefore
    `FloorPlane.offset` — equal to the camera height, which is the invariant
    worth stating because it is the one a sign error breaks silently.

    The sheet is drawn `1 / true_scale` times its real size, which is what a
    depth model reading the room too large or too small does to every length in
    it. Recovering `true_scale` therefore means the correction works in both
    directions, not just the one the developer happened to try.
    """
    width, height = FRAME
    cx, cy = width / 2.0, height / 2.0
    h = scene.camera_height_m
    # Pitch that puts the sheet's centre at `aim_at`. Derived rather than
    # chosen — see the note on `Scene`. With k the target's offset from the
    # principal point in focal lengths, the centre's y/z is k, and solving
    # (h − D·tanφ) / (h·tanφ + D) = k gives this directly.
    k = (scene.aim_at * height - cy) / focal
    phi = float(
        np.arctan2(h - k * scene.distance_m, k * h + scene.distance_m)
    )

    normal = np.array([0.0, -np.cos(phi), -np.sin(phi)], dtype=np.float32)
    floor = FloorPlane(
        normal=normal, offset=float(h), inlier_ratio=0.45, camera_height_m=float(h)
    )

    # An orthonormal frame *on* the plane: e1 across, e2 away from the camera.
    origin = np.array([0.0, h * np.cos(phi), h * np.sin(phi)], dtype=np.float32)
    e1 = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    e2 = np.array([0.0, -np.sin(phi), np.cos(phi)], dtype=np.float32)

    half_long = (A4_LONG_M / scene.true_scale) / 2.0
    half_short = (A4_SHORT_M / scene.true_scale) / 2.0
    theta = np.deg2rad(scene.sheet_rotation_deg)
    rotation = np.array(
        [[np.cos(theta), -np.sin(theta)], [np.sin(theta), np.cos(theta)]], dtype=np.float32
    )
    local = np.array(
        [
            [-half_short, -half_long],
            [half_short, -half_long],
            [half_short, half_long],
            [-half_short, half_long],
        ],
        dtype=np.float32,
    )
    placed = local @ rotation.T + np.array([0.0, scene.distance_m], dtype=np.float32)
    corners_3d = origin + placed[:, :1] * e1 + placed[:, 1:] * e2
    corners_px = _project(corners_3d, focal, cx, cy)

    # A mid-dark floor so the sheet is the brighter region `_looks_like_paper`
    # is looking for, with a little noise so the edge detector has a real
    # gradient to find rather than a synthetic step.
    rng = np.random.default_rng(1405)
    image = np.full((height, width, 3), 96, dtype=np.int16)
    image = np.clip(image + rng.integers(-8, 9, image.shape), 0, 255).astype(np.uint8)
    cv2.fillPoly(image, [np.round(corners_px).astype(np.int32)], (242, 242, 240))
    return image, floor, focal, cx, corners_px


def run(scenes: list[Scene]) -> list[Trial]:
    trials = []
    for scene in scenes:
        image, floor, focal, cx, corners_px = render(scene)
        cy = FRAME[1] / 2.0
        reference = find_a4_scale(image, floor, focal, cx, cy)
        sides = np.linalg.norm(np.roll(corners_px, -1, axis=0) - corners_px, axis=1)
        trials.append(
            Trial(
                scene=scene,
                recovered=reference.scale if reference else None,
                sheet_px=float(sides.max()),
            )
        )
    return trials


def default_scenes() -> list[Scene]:
    """A sweep across the things that actually vary between two photographs.

    Scale spans the range the module will accept at all (0.5–2.0), because the
    correction is only worth having if it works where the depth model is most
    wrong. Camera height spans hip to eye. Rotation matters because a sheet
    square to the camera and a sheet at 40° project to very different
    quadrilaterals, and the corner refinement is the step most likely to lose
    accuracy on the skewed one.
    """
    scenes = []
    for true_scale in (0.6, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.8):
        for camera_height in (1.1, 1.4, 1.7):
            for rotation in (0.0, 20.0, 40.0):
                for distance in (1.2, 1.6, 2.2):
                    scenes.append(
                        Scene(
                            true_scale=true_scale,
                            camera_height_m=camera_height,
                            distance_m=distance,
                            sheet_rotation_deg=rotation,
                        )
                    )
    return scenes


@dataclass
class Report:
    trials: list[Trial]

    @property
    def found_rate(self) -> float:
        return sum(1 for t in self.trials if t.found) / len(self.trials) if self.trials else 0.0

    @property
    def errors(self) -> list[float]:
        return [t.error for t in self.trials if t.error is not None]

    def as_row(self, label: str) -> dict[str, object]:
        errors = self.errors
        sizes = [t.sheet_px for t in self.trials]
        return {
            "scenes": label,
            "n": len(self.trials),
            "sheet px": round(statistics.median(sizes)) if sizes else "—",
            "found": f"{self.found_rate:.1%}",
            "median error": f"{statistics.median(errors):.2%}" if errors else "—",
            "worst error": f"{max(errors):.2%}" if errors else "—",
            "over 3%": sum(1 for e in errors if e > 0.03),
        }
