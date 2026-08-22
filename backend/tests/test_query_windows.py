"""The window fusion behind visual search.

The numbers that justify it come from `scripts/eval_retrieval.py`, which needs
torch and the generated catalogue and so cannot run in CI. What CI *can* hold
still are the properties the numbers rest on — that the whole frame is always
in the set, that a window means the rectangle its label says, and that a carpet
keeps the best score any window gave it rather than the last one.
"""

from io import BytesIO

import pytest
from PIL import Image, ImageDraw

from app.services import query_windows
from app.services.embeddings import HashEmbeddingBackend


def _rug(rgb: tuple[int, int, int], size=(400, 600)) -> Image.Image:
    image = Image.new("RGB", size, rgb)
    draw = ImageDraw.Draw(image)
    draw.ellipse(
        [size[0] // 4, size[1] // 3, 3 * size[0] // 4, 2 * size[1] // 3],
        outline="white",
        width=9,
    )
    return image


# --- the grid ---------------------------------------------------------------


def test_the_whole_frame_is_always_searched() -> None:
    """The safety net, and the reason this change cannot rank worse than before.

    Every window but this one is a bet that the rug is somewhere in particular.
    The full frame is the bet that it is not, and keeping it means the fusion's
    worst case is the single-vector search it replaced.
    """
    assert query_windows.DEFAULT_GRID[0] is query_windows.FULL_FRAME
    assert query_windows.FULL_FRAME in query_windows.FULL_GRID


def test_windows_stay_inside_the_frame() -> None:
    for window in query_windows.FULL_GRID + query_windows.DEFAULT_GRID:
        x0, y0, x1, y1 = window.box
        assert 0.0 <= x0 < x1 <= 1.0, window.label
        assert 0.0 <= y0 < y1 <= 1.0, window.label


def test_a_window_cuts_the_rectangle_its_label_names() -> None:
    """Fractions of the real frame, not of the square the model crops to.

    The transform resizes the short edge to 256 and centre-crops 224, so on a
    portrait photograph the top and bottom are discarded before the model looks.
    A window expressed against that square would silently be a different window
    on every aspect ratio.
    """
    image = Image.new("RGB", (400, 600))
    cuts = dict(query_windows.cut(image, (query_windows.FULL_FRAME,)))
    assert next(iter(cuts.values())).size == (400, 600)

    bottom_centre = query_windows.Window("t", (0.25, 0.5, 0.75, 1.0))
    (_window, view), = query_windows.cut(image, (bottom_centre,))
    assert view.size == (200, 300)


def test_degenerate_windows_are_dropped_not_embedded() -> None:
    """A thumbnail must not turn into seven 3-pixel crops the model cannot read."""
    tiny = Image.new("RGB", (40, 40))
    cuts = query_windows.cut(tiny, query_windows.DEFAULT_GRID)
    assert all(view.width >= 32 and view.height >= 32 for _w, view in cuts)
    assert cuts, "the full frame is 40×40 and should survive"


def test_the_trimmed_grid_is_smaller_than_the_one_it_came_from() -> None:
    assert len(query_windows.DEFAULT_GRID) < len(query_windows.FULL_GRID)


# --- fusion -----------------------------------------------------------------


def test_a_rug_in_the_corner_of_a_photograph_is_found(client, admin_client) -> None:
    """The whole point, as a behaviour rather than a percentage.

    The catalogue holds a rug photographed edge to edge. The query is that rug
    occupying a quarter of a much larger frame, the rest of it plain wall — the
    shape of every real query photograph. Searching the frame whole asks about
    the wall.
    """
    created = admin_client.post(
        "/api/v1/admin/carpets",
        json={
            "slug": "corner-rug", "name": "فرش گوشه", "pattern": "afshan",
            "material": "wool", "colors": ["#20408a"], "suitable_rooms": ["living_room"],
        },
    )
    assert created.status_code == 201, created.text
    carpet_id = created.json()["id"]

    rug = _rug((32, 64, 138))
    buffer = BytesIO()
    rug.save(buffer, format="PNG")
    upload = admin_client.post(
        f"/api/v1/admin/carpets/{carpet_id}/images",
        files={"file": ("rug.png", buffer.getvalue(), "image/png")},
    )
    assert upload.status_code == 201, upload.text

    # The same rug, small and low in a big empty frame.
    scene = Image.new("RGB", (1200, 1600), (235, 228, 214))
    scene.paste(rug.resize((520, 780)), (340, 760))
    scene_bytes = BytesIO()
    scene.save(scene_bytes, format="PNG")

    response = client.post(
        "/api/v1/search/visual",
        files={"image": ("room.png", scene_bytes.getvalue(), "image/png")},
    )
    assert response.status_code == 200, response.text
    slugs = [r["carpet"]["slug"] for r in response.json()["results"]]
    assert "corner-rug" in slugs


def test_batch_and_single_agree() -> None:
    """`embed_batch` is an optimisation, so it must not also be a change.

    The catalogue was indexed one image at a time through `embed_image`; if the
    batched path produced even slightly different vectors, every stored
    embedding would be answering a question the query no longer asks.
    """
    backend = HashEmbeddingBackend()
    image = _rug((150, 32, 34), size=(200, 300))
    buffer = BytesIO()
    image.save(buffer, format="PNG")

    single = backend.embed_image(buffer.getvalue())
    batched = backend.embed_batch([Image.open(BytesIO(buffer.getvalue()))])[0]
    assert single == pytest.approx(batched)


def test_an_empty_batch_is_not_an_error() -> None:
    assert HashEmbeddingBackend().embed_batch([]) == []
