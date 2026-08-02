"""Find catalogue photographs whose edges the background removal ate into.

A carpet is a rectangle, so along each side the opaque extent should be almost a
straight line — fringe frays it slightly, nothing more. Where the cut took part
of the pile with the backdrop, the outline steps inwards, and that is what this
measures.

It exists because eyeballing did not catch it. The first review looked at
contact sheets 190 pixels wide, and a bite thirty pixels deep is invisible at
that scale: several damaged carpets were signed off before someone opened the
folder and saw them. Some defects have to be measured, not glanced at.

    uv run --group ml python scripts/check_cutouts.py data/catalog-seed/cutouts
"""

import sys
from pathlib import Path

import cv2
import numpy as np

sys.stdout.reconfigure(encoding="utf-8")

TOLERANCE = 0.02   # how far inside the median edge counts as bitten
MIN_RUN = 0.03     # ignore nibbles shorter than this share of the side
SUSPECT = 0.08     # above this, open the file and look


def side_damage(mask: np.ndarray) -> float:
    """Worst share of any one side that sits inside where the edge should be."""
    worst = 0.0
    for axis in (0, 1):
        m = mask if axis == 0 else mask.T
        rows = np.where(m.any(axis=1))[0]
        if len(rows) < 10:
            continue
        span = m.shape[1]
        tol = max(3, int(span * TOLERANCE))

        first = np.argmax(m[rows], axis=1)
        last = span - 1 - np.argmax(m[rows][:, ::-1], axis=1)

        for edge, sign in ((first, 1), (last, -1)):
            bitten = (edge - np.median(edge)) * sign > tol
            if bitten.mean() > MIN_RUN:
                worst = max(worst, float(bitten.mean()))
    return worst


def main() -> None:
    folder = Path(sys.argv[1] if len(sys.argv) > 1 else "data/catalog-seed/cutouts")
    scores = []
    for path in sorted(folder.glob("*.png")):
        rgba = cv2.imdecode(np.fromfile(path, np.uint8), cv2.IMREAD_UNCHANGED)
        if rgba is None or rgba.shape[2] < 4:
            continue
        scores.append((side_damage(rgba[:, :, 3] > 128), path.stem))

    if not scores:
        raise SystemExit(f"no cutouts found in {folder}")

    scores.sort(reverse=True)
    suspects = [s for s in scores if s[0] > SUSPECT]

    print(f"{len(scores)} cutouts checked, {len(suspects)} suspect\n")
    for score, name in scores[:12]:
        print(f"   {score:6.1%}  {name}{'   <-- look at this one' if score > SUSPECT else ''}")

    if suspects:
        print(
            "\nRe-cut these with the flood pass alone: the GrabCut refinement is what"
            "\ntrims a carpet whose border shares a tone with what it was shot on."
        )
        raise SystemExit(1)
    print("\nno edges bitten into")


if __name__ == "__main__":
    main()
