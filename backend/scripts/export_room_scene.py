"""Analyse a room photo once and export everything the browser needs to place a
carpet interactively.

The heavy work — depth, floor fit, occlusion — happens here, exactly once per
photo. What the client receives is the floor plane, the camera intrinsics, and a
single occlusion mask. Because the carpet always lies on that same plane, the
mask stays valid wherever the user drags the carpet, so moving and rotating it
needs no further server work.

    uv run --group ml python scripts/export_room_scene.py <photo> [--out DIR]
"""

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

from app.room.compose import analyze_room, occlusion_mask


def export(photo_path: Path, out_dir: Path, max_side: int = 1400) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    with Image.open(photo_path) as original:
        image = original.convert("RGB")
        image.thumbnail((max_side, max_side), Image.LANCZOS)
        # keep EXIF-derived field of view from the untouched original
        scene = analyze_room(image)

    stem = photo_path.stem
    image.save(out_dir / f"{stem}.jpg", quality=90, optimize=True)

    mask = (occlusion_mask(scene) * 255).astype(np.uint8)
    Image.fromarray(mask).save(out_dir / f"{stem}-mask.png", optimize=True)

    payload = {
        "photo": f"{stem}.jpg",
        "mask": f"{stem}-mask.png",
        "width": scene.image.width,
        "height": scene.image.height,
        "focalPx": scene.focal,
        "cx": scene.cx,
        "cy": scene.cy,
        "plane": {
            "normal": [float(v) for v in scene.floor.normal],
            "offset": float(scene.floor.offset),
        },
        "cameraHeightM": round(scene.floor.camera_height_m, 3),
        "confidence": scene.confidence,
    }
    (out_dir / f"{stem}-scene.json").write_text(
        json.dumps(payload, indent=2), encoding="utf-8"
    )
    print(
        f"{stem}: confidence={scene.confidence} camera_height={scene.floor.camera_height_m:.2f}m "
        f"focal={scene.focal:.0f}px -> {out_dir}"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("photos", type=Path, nargs="+")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    for photo in args.photos:
        export(photo, args.out)


if __name__ == "__main__":
    main()
