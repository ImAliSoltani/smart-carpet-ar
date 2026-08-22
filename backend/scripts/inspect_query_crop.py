"""Draw what the query-side locator decided, so it can be judged by looking.

Every threshold in `app.eval.crop` was set by eye against these sheets, the way
the colour thresholds were (فاز ۴ بند ۰ و فاز ۴٫۵ بند ۵). Counting how often the
locator "fired" says nothing about whether it fired at the rug.

    uv run --group ml python scripts/inspect_query_crop.py --shot room

Writes one contact sheet per shot into `data/eval/`: the photograph with the
chosen box drawn on it, labelled with the reason and confidence.
"""

import argparse
from pathlib import Path

from PIL import Image, ImageDraw

from app.eval import crop as crop_mod

TILE = 320
COLUMNS = 8


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=Path("../data/catalog-gen"))
    parser.add_argument("--out", type=Path, default=Path("../data/eval"))
    parser.add_argument("--shot", default="room")
    args = parser.parse_args()

    paths = sorted(args.source.glob(f"*__{args.shot}.*"))
    if not paths:
        raise SystemExit(f"هیچ تصویری با شات {args.shot} پیدا نشد")

    tiles: list[Image.Image] = []
    reasons: dict[str, int] = {}
    for path in paths:
        image = Image.open(path).convert("RGB")
        result = crop_mod.locate_carpet(image)
        reasons[result.reason] = reasons.get(result.reason, 0) + 1

        canvas = image.copy()
        draw = ImageDraw.Draw(canvas)
        if result.box is not None:
            draw.rectangle(result.box, outline=(255, 40, 40), width=max(3, canvas.width // 150))
        canvas.thumbnail((TILE, TILE))
        label = Image.new("RGB", (TILE, canvas.height + 18), (18, 18, 18))
        label.paste(canvas, ((TILE - canvas.width) // 2, 0))
        ImageDraw.Draw(label).text(
            (4, canvas.height + 4),
            f"{result.reason} · {result.confidence}",
            fill=(235, 235, 235),
        )
        tiles.append(label)

    rows = (len(tiles) + COLUMNS - 1) // COLUMNS
    cell_h = max(t.height for t in tiles)
    sheet = Image.new("RGB", (COLUMNS * TILE, rows * cell_h), (10, 10, 10))
    for index, tile in enumerate(tiles):
        sheet.paste(tile, ((index % COLUMNS) * TILE, (index // COLUMNS) * cell_h))

    args.out.mkdir(parents=True, exist_ok=True)
    target = args.out / f"query-crop-{args.shot}.png"
    sheet.save(target)
    print(f"{target}  ({len(tiles)} تصویر)")
    for reason, count in sorted(reasons.items(), key=lambda kv: -kv[1]):
        print(f"  {count:3d}  {reason}")


if __name__ == "__main__":
    main()
