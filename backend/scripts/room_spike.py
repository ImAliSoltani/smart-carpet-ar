"""Run the room visualizer on sample photos and write a review sheet.

    uv run --group ml python scripts/room_spike.py
"""

import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from app.ar.rectify import rectify
from app.room.compose import RoomAnalysisError, analyze_room, place_carpet

ROOT = Path(__file__).resolve().parents[2]
ROOMS = ROOT / "data" / "room-samples"
CARPET = ROOT / "data" / "catalog-seed" / "images" / "afshan-03.jpg"
OUT = ROOT / "data" / "room-samples" / "out"

WIDTH_CM, LENGTH_CM = 200, 300


def depth_preview(depth: np.ndarray) -> Image.Image:
    finite = depth[np.isfinite(depth)]
    lo, hi = np.percentile(finite, 2), np.percentile(finite, 98)
    norm = np.clip((depth - lo) / max(hi - lo, 1e-6), 0, 1)
    return Image.fromarray((np.stack([norm] * 3, axis=-1) * 255).astype(np.uint8))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    with Image.open(CARPET) as photo:
        texture = rectify(photo.convert("RGB"), width_cm=WIDTH_CM, length_cm=LENGTH_CM).image

    rooms = sorted(p for p in ROOMS.glob("room*.jpg") if p.stat().st_size > 20_000)
    if not rooms:
        print("no room samples found")
        sys.exit(1)

    panels = []
    for path in rooms:
        with Image.open(path) as room_image:
            room_image = room_image.convert("RGB")
            started = time.perf_counter()
            try:
                scene = analyze_room(room_image)
            except RoomAnalysisError as exc:
                print(f"{path.name}: FAILED — {exc}")
                continue
            analysed = time.perf_counter() - started

            try:
                result = place_carpet(
                    scene, texture, width_m=WIDTH_CM / 100, length_m=LENGTH_CM / 100
                )
            except RoomAnalysisError as exc:
                print(f"{path.name}: placement failed — {exc}")
                continue
            total = time.perf_counter() - started

            print(
                f"{path.name}: floor confidence={scene.confidence} "
                f"inliers={scene.floor.inlier_ratio:.2f} "
                f"camera_height={scene.floor.camera_height_m:.2f}m "
                f"depth+fit={analysed:.1f}s total={total:.1f}s"
            )
            panels.append((room_image, depth_preview(scene.depth_m), result))
            result.save(OUT / f"{path.stem}-placed.jpg", quality=92)

    if not panels:
        print("nothing produced")
        sys.exit(1)

    cell_w, cell_h = 420, 300
    sheet = Image.new("RGB", (cell_w * 3, cell_h * len(panels)), (245, 243, 238))
    draw = ImageDraw.Draw(sheet)
    for row, trio in enumerate(panels):
        for col, img in enumerate(trio):
            thumb = img.copy()
            thumb.thumbnail((cell_w - 12, cell_h - 12))
            sheet.paste(thumb, (col * cell_w + 6, row * cell_h + 6))
        draw.text((8, row * cell_h + 4), ["original", "depth", "placed"][0], fill=(90, 90, 90))
    sheet.save(OUT / "review-sheet.jpg", quality=90)
    print(f"\nreview sheet: {OUT / 'review-sheet.jpg'}")


if __name__ == "__main__":
    main()
