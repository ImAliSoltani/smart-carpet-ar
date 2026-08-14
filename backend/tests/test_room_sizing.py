"""The size guide's arithmetic, on grids built by hand.

Neither the depth model nor the segmenter runs here. Both need torch, both take
seconds, and neither is what these assertions are about: the parts that decide
what a shopper is told are the grid search and the A4 geometry, and those are
ordinary code that can be given an exact input and checked against an exact
answer. The model's own behaviour is verified by looking at contact sheets of
real rooms, which is a different kind of check and not a unit test.
"""

import numpy as np
import pytest

from app.room import sizing
from app.room.floor import FloorPlane
from app.room.scale import A4_LONG_M, A4_SHORT_M, _side_lengths, find_a4_scale
from app.room.sizing import CELL_CM, FloorMeasurement, _block_exists, _largest_carpet_shaped


def _measurement(grid: np.ndarray) -> FloorMeasurement:
    rows, cols = _largest_carpet_shaped(grid)
    return FloorMeasurement(
        grid=grid,
        total_free_sqm=round(float(grid.sum()) * (CELL_CM / 100.0) ** 2, 2),
        free_width_cm=int(min(cols, rows) * CELL_CM),
        free_length_cm=int(max(cols, rows) * CELL_CM),
    )


class TestBlockSearch:
    def test_finds_a_block_that_is_there(self) -> None:
        grid = np.zeros((20, 20), dtype=bool)
        grid[5:15, 4:16] = True  # 10 x 12 cells
        assert _block_exists(grid, 10, 12)
        assert _block_exists(grid, 9, 11)

    def test_refuses_a_block_one_cell_too_big(self) -> None:
        grid = np.zeros((20, 20), dtype=bool)
        grid[5:15, 4:16] = True
        assert not _block_exists(grid, 11, 12)
        assert not _block_exists(grid, 10, 13)

    def test_a_hole_disqualifies_the_block(self) -> None:
        """The whole point: a chair leg in the middle is not a free rectangle."""
        grid = np.zeros((20, 20), dtype=bool)
        grid[5:15, 4:16] = True
        assert _block_exists(grid, 10, 12)
        grid[9, 9] = False
        assert not _block_exists(grid, 10, 12)

    def test_empty_and_oversized_are_false_not_errors(self) -> None:
        assert not _block_exists(np.zeros((5, 5), dtype=bool), 2, 2)
        assert not _block_exists(np.ones((5, 5), dtype=bool), 9, 2)
        assert not _block_exists(np.ones((5, 5), dtype=bool), 0, 2)


class TestCarpetShape:
    def test_a_strip_does_not_win_on_area(self) -> None:
        """The bug this constraint exists for.

        A long thin corridor between two sofas has more area than the open patch
        in the middle of the room, and the first version reported it: 45×220 cm,
        which is not a carpet. The square is smaller and is the answer.
        """
        grid = np.zeros((40, 40), dtype=bool)
        grid[0:38, 0:2] = True  # 38 x 2 = 76 cells, aspect 19
        grid[10:18, 10:18] = True  # 8 x 8 = 64 cells, aspect 1
        rows, cols = _largest_carpet_shaped(grid)
        assert (rows, cols) == (8, 8)

    def test_returns_zero_for_an_empty_floor(self) -> None:
        assert _largest_carpet_shaped(np.zeros((10, 10), dtype=bool)) == (0, 0)


class TestFitting:
    def test_a_size_fits_only_with_its_clearance(self) -> None:
        # 60 x 60 cells at 5 cm = 300 x 300 cm of free floor.
        measurement = _measurement(np.ones((60, 60), dtype=bool))

        assert measurement.fits(200, 280)
        # 300 long needs 310 with the clearance, and the floor is exactly 300 —
        # the rug would fit and have nowhere to sit.
        assert not measurement.fits(200, 300)
        # ...and does fit once the clearance is waived, which is what makes the
        # refusal a decision rather than an off-by-one.
        assert measurement.fits(200, 300, clearance_cm=0)

    def test_a_carpet_may_be_turned(self) -> None:
        grid = np.zeros((70, 30), dtype=bool)
        grid[:] = True  # 350 cm along rows, 150 cm across
        measurement = _measurement(grid)
        # 100 x 300 only fits lying along the long axis, and it must be tried.
        assert measurement.fits(100, 300)

    def test_recommendations_come_back_largest_first(self) -> None:
        # 80 x 80 cells at 5 cm = 400 x 400 cm, which takes every size below.
        measurement = _measurement(np.ones((80, 80), dtype=bool))
        sizes = [(100, 150), (200, 300), (70, 100), (250, 350)]
        assert sizing.sizes_that_fit(measurement, sizes) == [
            (250, 350),
            (200, 300),
            (100, 150),
            (70, 100),
        ]

    def test_nothing_fits_a_floor_with_no_room(self) -> None:
        grid = np.zeros((8, 8), dtype=bool)
        grid[:] = True  # 40 x 40 cm
        assert sizing.sizes_that_fit(_measurement(grid), [(100, 150), (200, 300)]) == []


class TestA4Geometry:
    def test_opposite_sides_are_averaged(self) -> None:
        """A corner found a few pixels off shortens one side and lengthens its
        neighbour; averaging the pair is what absorbs that."""
        square = np.array(
            [[0, 0, 0], [1, 0, 0], [1, 2, 0], [0, 2, 0]], dtype=np.float32
        )
        long_side, short_side, skew = _side_lengths(square)
        assert long_side == pytest.approx(2.0)
        assert short_side == pytest.approx(1.0)
        assert skew == pytest.approx(0.0)

    def test_skew_reports_a_quadrilateral_that_is_not_a_rectangle(self) -> None:
        skewed = np.array(
            [[0, 0, 0], [1, 0, 0], [2, 2, 0], [0, 2, 0]], dtype=np.float32
        )
        _, _, skew = _side_lengths(skewed)
        assert skew > 0.2

    def test_a_photo_with_no_sheet_returns_none_rather_than_a_guess(self) -> None:
        """The ordinary case. Most room photos have no A4 in them, and inventing
        a scale from the nearest bright rectangle would be worse than the depth
        model's own estimate."""
        floor = FloorPlane(
            normal=np.array([0.0, -1.0, 0.0], dtype=np.float32),
            offset=1.4,
            inlier_ratio=0.3,
            camera_height_m=1.4,
        )
        noise = (np.random.default_rng(1405).random((240, 320, 3)) * 255).astype(np.uint8)
        assert find_a4_scale(noise, floor, focal=500.0, cx=160.0, cy=120.0) is None

    def test_the_iso_constants_are_the_definition_not_a_measurement(self) -> None:
        assert (A4_LONG_M, A4_SHORT_M) == (0.297, 0.210)
