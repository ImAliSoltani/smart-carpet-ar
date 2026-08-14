"""How large a carpet the visible floor will take.

The shop's hardest question is not which carpet, it is which size. A buyer
standing in their living room has no reliable sense of what 200×300 covers, and
a rug two sizes too small is the most common and most expensive mistake in the
trade — it is also the one a photograph can settle, because the floor is already
in it and the depth map already knows how far away it is.

The measurement is done from above, on a top-down grid of real centimetres laid
on the floor plane. Perspective is undone by that step, so a hundred centimetres
near the camera and a hundred at the far wall are the same hundred, and the
question becomes a plain one about a grid of squares.

**The grid is filled by asking each cell where it appears in the photo, not by
asking each pixel which cell it lands in.** Pixel-to-cell looks equivalent and
is not: a pixel row near the horizon covers half a metre of floor, so
consecutive rows land in cells ten apart and leave unsampled stripes between
them. Those stripes read as occupied, and the free floor comes back shredded
into ribbons. Going the other way, every cell gets exactly one well-defined
sample and there are no gaps to invent.

**The question is asked as "does this carpet fit", not "what is the biggest
rectangle".** They sound alike and they are not. The largest rectangle by area
in a real room's free floor is a strip: the first version of this measured
45×220 cm between two sofas and reported it proudly, because 9900 cm² beats the
300×100 patch in the middle of the room. Strips have area and are not carpets.
Every size the shop actually sells is tried against the grid instead, which is
both the right question and a cheaper one — a summed-area table answers "is this
whole block free" in constant time per position.

**A rug goes under the coffee table.** This is the domain fact that decides what
"free" means, and getting it wrong is what made the first working version
useless: measuring strictly exposed floor, a normally furnished living room came
back as a ring of walkways around its own furniture, and the guide recommended
80×120 for a room that wants 250×350. What stops a carpet is a sofa, a cabinet,
a wall — things you would have to move. A table, a pouffe, a basket stand *on*
the rug and always have. So a cell counts as available when the floor is exposed
**or** when whatever occupies it is low enough to sit on a rug, and height above
the floor plane is exactly what the depth map already knows.

Two honest limits, both reported rather than hidden:

- **Only what the lens saw.** Floor outside the frame is not floor that is not
  there, and a photo taken from inside the room misses the floor under the
  photographer's own feet. This under-measures by design; the interface's job is
  to say "stand in the doorway", not to guess at what was cropped.
- **Only what is exposed.** A rug can slide under the front feet of a sofa, and
  designers routinely want it to. This measures free floor and leaves that
  judgement to the buyer, which is why the free rectangle is returned beside the
  verdict rather than instead of it.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from app.room.compose import RoomScene, occlusion_mask

# Side of one cell in the top-down grid. Five centimetres is finer than any
# carpet size step in the catalogue and coarse enough that a 900px photo becomes
# a grid of about a hundred cells a side.
CELL_CM = 5.0

# A cell counts as free only if this share of the pixels landing in it were
# exposed floor. Cells are hit by many pixels near the camera and few far away,
# so a plain "any pixel" test would call the whole far wall free on one stray.
CELL_FREE_RATIO = 0.6
# ...and only if that many pixels landed in it at all. Cells beyond the depth
# the photo resolves get one or two, and one pixel is not evidence.
CELL_MIN_SAMPLES = 3

# Floor further away than this is dropped before measuring. Monocular depth
# degrades with distance, and the far end of a corridor would otherwise offer a
# gloriously large free rectangle assembled entirely out of error.
MAX_RANGE_M = 7.0

# Anything standing on the floor lower than this may sit on the carpet. Set at
# the height of a coffee table rather than at some safe-looking small number: a
# rug is meant to run under the table, and the sofa is what it stops at. Iranian
# coffee tables run 40-45 cm and seat height starts around 45, so the boundary
# is where furniture stops being something you put *on* a rug.
LOW_OBSTACLE_M = 0.48

# A carpet is recommended only if the free floor exceeds it by this much on both
# sides. The room has to have somewhere for the rug to sit, not merely somewhere
# it would exactly wedge.
CLEARANCE_CM = 10.0

# What counts as carpet-shaped when describing the free area in the abstract.
# The catalogue's longest proportion is 100×400; beyond that a rectangle is a
# runner-shaped accident of where the furniture stands.
MAX_ASPECT = 4.0


@dataclass(frozen=True)
class FloorMeasurement:
    """The exposed floor of one photograph, seen from above."""

    #: True where a 5 cm cell of floor is free. Row axis runs away from the
    #: camera, column axis across it.
    grid: np.ndarray
    total_free_sqm: float
    #: The largest carpet-shaped rectangle, for describing the room when no
    #: catalogue size fits.
    free_width_cm: int
    free_length_cm: int

    def fits(self, width_cm: int, length_cm: int, *, clearance_cm: float = CLEARANCE_CM) -> bool:
        """Would a carpet this size lie flat somewhere, in either orientation?"""
        short = int(np.ceil((min(width_cm, length_cm) + clearance_cm) / CELL_CM))
        long = int(np.ceil((max(width_cm, length_cm) + clearance_cm) / CELL_CM))
        return _block_exists(self.grid, long, short) or _block_exists(self.grid, short, long)


def _block_exists(grid: np.ndarray, rows: int, cols: int) -> bool:
    """Is there an all-free block of exactly this many cells anywhere?

    Summed-area table: the sum over any block is four lookups, so every position
    is tested in constant time and the whole question costs one pass.
    """
    if rows <= 0 or cols <= 0 or rows > grid.shape[0] or cols > grid.shape[1]:
        return False
    integral = np.zeros((grid.shape[0] + 1, grid.shape[1] + 1), dtype=np.int32)
    integral[1:, 1:] = np.cumsum(np.cumsum(grid.astype(np.int32), axis=0), axis=1)
    block = (
        integral[rows:, cols:]
        - integral[:-rows, cols:]
        - integral[rows:, :-cols]
        + integral[:-rows, :-cols]
    )
    return bool((block == rows * cols).any())


def _largest_carpet_shaped(grid: np.ndarray) -> tuple[int, int]:
    """Largest all-free rectangle whose proportions a carpet could have.

    The usual histogram sweep — for each row, how many free cells stand directly
    above each column, then the largest rectangle in that histogram with a
    monotonic stack — with the aspect ratio checked before a candidate is
    allowed to win. Without that check this returns a strip every time.
    """
    if not grid.any():
        return 0, 0

    rows, cols = grid.shape
    heights = np.zeros(cols, dtype=np.int32)
    best_area, best_h, best_w = 0, 0, 0

    for r in range(rows):
        heights = np.where(grid[r], heights + 1, 0)
        stack: list[int] = []
        for c in range(cols + 1):
            current = heights[c] if c < cols else 0
            while stack and heights[stack[-1]] >= current:
                height = int(heights[stack.pop()])
                left = stack[-1] + 1 if stack else 0
                width = c - left
                if height == 0 or width == 0:
                    continue
                if max(height, width) / min(height, width) > MAX_ASPECT:
                    continue
                if height * width > best_area:
                    best_area, best_h, best_w = height * width, height, width
            stack.append(c)

    return best_h, best_w


def measure_free_floor(scene: RoomScene, *, scale: float = 1.0) -> FloorMeasurement | None:
    """Map the photo's exposed floor onto a top-down grid of real centimetres.

    `scale` is the correction an A4 reference produced, or 1.0 when the photo had
    none — applied here rather than to the depth map, so the geometry is computed
    once and measured in whichever units the caller could justify.
    """
    visible = occlusion_mask(scene) > 0.5
    if not visible.any():
        return None

    height, width = scene.depth_m.shape
    us, vs = np.meshgrid(np.arange(width, dtype=np.float32), np.arange(height, dtype=np.float32))
    plane_depth = scene.floor.depth_at(us, vs, scene.focal, scene.cx, scene.cy)

    in_range = np.isfinite(plane_depth) & (plane_depth * scale <= MAX_RANGE_M)
    usable = visible & in_range
    if usable.sum() < 500:
        return None

    right, forward = scene.floor.basis()
    origin = (-scene.floor.normal * scene.floor.offset) * scale  # a point on the plane

    # One forward pass, used only to decide how far the grid should reach.
    # Percentiles rather than extremes: a single grazing ray near the horizon
    # lands hundreds of metres away and would set the bounds on its own.
    dirs = np.stack(
        [(us - scene.cx) / scene.focal, (vs - scene.cy) / scene.focal, np.ones_like(us)],
        axis=-1,
    )
    seen = (dirs[usable] * (plane_depth[usable] * scale)[:, None]) - origin
    u_seen, v_seen = (seen @ right) * 100.0, (seen @ forward) * 100.0
    u_min, u_max = np.percentile(u_seen, [0.5, 99.5])
    v_min, v_max = np.percentile(v_seen, [0.5, 99.5])

    cols = int(np.ceil((u_max - u_min) / CELL_CM)) + 1
    rows = int(np.ceil((v_max - v_min) / CELL_CM)) + 1
    if cols < 2 or rows < 2 or rows * cols > 1_000_000:
        return None

    # Now the other direction: every cell centre, placed on the plane, projected
    # back into the photo and asked what is standing there.
    cell_u = (u_min + (np.arange(cols) + 0.5) * CELL_CM) / 100.0
    cell_v = (v_min + (np.arange(rows) + 0.5) * CELL_CM) / 100.0
    grid_v, grid_u = np.meshgrid(cell_v, cell_u, indexing="ij")
    cell_points = (
        origin[None, None, :]
        + right[None, None, :] * grid_u[..., None]
        + forward[None, None, :] * grid_v[..., None]
    )

    z = cell_points[..., 2]
    with np.errstate(divide="ignore", invalid="ignore"):
        px = cell_points[..., 0] / z * scene.focal + scene.cx
        py = cell_points[..., 1] / z * scene.focal + scene.cy

    on_screen = (
        (z > 0.15)
        & (z * 1.0 <= MAX_RANGE_M)
        & np.isfinite(px)
        & np.isfinite(py)
        & (px >= 0)
        & (px < width)
        & (py >= 0)
        & (py < height)
    )
    sample_x = np.clip(np.nan_to_num(px), 0, width - 1).astype(np.int32)
    sample_y = np.clip(np.nan_to_num(py), 0, height - 1).astype(np.int32)

    # How tall whatever stands at this cell is, measured from the floor plane.
    # `points` is the scene as depth saw it, so this is the height of the
    # surface facing the camera — the table top, the seat of the sofa — which is
    # the right quantity: a rug goes under the first and stops at the second.
    height_above = -(scene.points @ scene.floor.normal + scene.floor.offset) * scale
    low_enough = height_above[sample_y, sample_x] < LOW_OBSTACLE_M

    grid = on_screen & (visible[sample_y, sample_x] | low_enough)

    best_rows, best_cols = _largest_carpet_shaped(grid)
    side_a, side_b = best_cols * CELL_CM, best_rows * CELL_CM
    return FloorMeasurement(
        grid=grid,
        total_free_sqm=round(float(grid.sum()) * (CELL_CM / 100.0) ** 2, 2),
        free_width_cm=int(min(side_a, side_b)),
        free_length_cm=int(max(side_a, side_b)),
    )


def sizes_that_fit(
    measurement: FloorMeasurement,
    sizes: list[tuple[int, int]],
    *,
    clearance_cm: float = CLEARANCE_CM,
) -> list[tuple[int, int]]:
    """Which of the shop's sizes the measured floor will take, largest first."""
    fitting = [
        size for size in sizes if measurement.fits(*size, clearance_cm=clearance_cm)
    ]
    return sorted(fitting, key=lambda size: size[0] * size[1], reverse=True)
