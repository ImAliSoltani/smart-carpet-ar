"""Search a photograph through several windows instead of one whole frame.

The measurement in `scripts/eval_retrieval.py` says the problem plainly: rank 1
for 37.5٪ of `cover` queries, 10٪ of `room`, 5٪ of `gallery`. The gallery shot
is the clearest case — a rug on the floor of a tall vaulted hall, where the rug
is perhaps a fifth of the frame and ochre plaster is most of the rest. DINOv2
embeds what it is given, so it is asked about a hall and answers about a hall.

**The obvious fix, a rug detector, was built first and thrown away.** It is in
this package's history: contour-and-quadrilateral, tuned the way the AR corner
detector is tuned. Drawn over the query images it fired three times out of 120,
and all three were **framed calligraphy hanging on the wall** — a bright convex
rectangle on a plain ground, which is exactly what the score rewards. A detector
that is wrong when it is confident is worse than no detector, because it throws
the answer away instead of merely diluting it.

**So: no detector.** The frame is cut into overlapping windows, every window is
searched, and each carpet keeps its best score across all of them. Nothing has
to decide where the rug is. If some window happens to frame the rug well, that
window speaks for the query; if none does, the full frame is in the set too, so
the result cannot be worse than searching the frame alone — up to ties.

Max-pooling is safe here because the scores are comparable: every window is
scored by the same cosine-plus-histogram combination against the same rows, and
a window showing nothing but parquet is genuinely unlike every carpet, so it
loses. It does not need calibrating, only comparing.

The cost is one embedding per window, and that is the whole argument against
this approach — see `DEFAULT_GRID` for how the count was chosen, and
`EmbeddingBackend.embed_images` for why seven of them do not cost seven times
one.

Measured over 120 held-out photographs of the 40-carpet catalogue
(`scripts/eval_retrieval.py`), whole frame → seven windows:

    rank 1   17.5٪ → 45.8٪        MRR   0.300 → 0.560
    cover    37.5٪ → 67.5٪        room  10.0٪ → 35.0٪      gallery  5.0٪ → 35.0٪
"""

from __future__ import annotations

from dataclasses import dataclass

from PIL import Image

#: A window as fractions of the frame: (x0, y0, x1, y1).
Box = tuple[float, float, float, float]


@dataclass(frozen=True)
class Window:
    label: str
    box: Box


def grid(scale: float, steps: int) -> list[Window]:
    """`steps`×`steps` windows of side `scale`, spread evenly with overlap."""
    if steps < 1:
        raise ValueError("steps must be at least 1")
    span = 1.0 - scale
    offsets = [0.0] if steps == 1 else [span * i / (steps - 1) for i in range(steps)]
    return [
        Window(
            label=f"{scale:.2f}@{col},{row}",
            box=(x, y, x + scale, y + scale),
        )
        for row, y in enumerate(offsets)
        for col, x in enumerate(offsets)
    ]


#: The full frame is always first, and is what the shipped endpoint does today;
#: keeping it in the set is what makes this monotonic rather than a gamble.
FULL_FRAME = Window(label="full", box=(0.0, 0.0, 1.0, 1.0))

#: Two scales, nine positions each, plus the frame — nineteen embeddings.
#: Deliberately extravagant: this is the set the experiment measures, so that
#: trimming it afterwards is a decision with a number attached rather than a
#: guess about which windows mattered.
FULL_GRID: tuple[Window, ...] = (FULL_FRAME, *grid(0.65, 3), *grid(0.45, 3))

#: What survived the trim, and why.
#:
#: `FULL_GRID` lifted rank-1 from 17.5٪ to 45٪ over 120 held-out photographs,
#: and then said plainly which of its nineteen windows had done it. Of the 120
#: correct answers, **63 came from one window** — `0.45@1,2`, the bottom-centre
#: square — and 91 came from the bottom row alone. Six windows never won once.
#:
#: That is not a coincidence about this catalogue, it is where rugs are. A
#: photograph of a room is taken standing up and pointed slightly down, so the
#: floor is the bottom of the frame and the rug is the middle of the floor. The
#: prior is worth encoding because the alternative is paying for fourteen more
#: forward passes to rediscover it on every query.
#:
#: The frame itself stays first, and that is what keeps this honest: whatever
#: the windows do or fail to do, the shipped behaviour is still in the set, so
#: the result cannot come out below where it started.
#:
#: **Seven beat nineteen**, which was not the expected result: rank 1 of 45.8٪
#: against 45.0٪, and cover-shot rank-10 of 95٪ against 90٪. Max-pooling has no
#: reason to improve monotonically with more windows — every window is another
#: chance for the *wrong* carpet to score well on a square of parquet, and the
#: twelve that were cut had contributed six wins between them against however
#: many near-misses they promoted. More looks is not more information when the
#: extra looks are at the wall.
DEFAULT_GRID: tuple[Window, ...] = (
    FULL_FRAME,
    Window("0.45@1,2", (0.275, 0.55, 0.725, 1.0)),  # 63 wins — the floor, centred
    Window("0.45@0,2", (0.0, 0.55, 0.45, 1.0)),  # 9
    Window("0.45@2,2", (0.55, 0.55, 1.0, 1.0)),  # 10
    Window("0.45@2,1", (0.55, 0.275, 1.0, 0.725)),  # 9
    Window("0.45@1,1", (0.275, 0.275, 0.725, 0.725)),  # 7 — a rug shot head-on
    Window("0.65@1,2", (0.175, 0.35, 0.825, 1.0)),  # 7 — the same place, wider
)


def cut(
    image: Image.Image, windows: tuple[Window, ...] = DEFAULT_GRID
) -> list[tuple[Window, Image.Image]]:
    """The image seen through each window.

    Windows are taken against the **square** the model will see anyway. The
    transform resizes the short side to 256 and centre-crops 224, so on a 848×1264
    portrait frame the top and bottom fifths are discarded before the model ever
    looks — meaning a window expressed against the full height can be mostly
    thrown away without anything saying so. Cutting a real sub-rectangle and
    handing it over whole is what makes the window mean what its label says.
    """
    width, height = image.size
    cuts: list[tuple[Window, Image.Image]] = []
    for window in windows:
        x0, y0, x1, y1 = window.box
        box = (
            int(round(x0 * width)),
            int(round(y0 * height)),
            int(round(x1 * width)),
            int(round(y1 * height)),
        )
        if box[2] - box[0] < 32 or box[3] - box[1] < 32:
            continue
        cuts.append((window, image.crop(box)))
    return cuts
