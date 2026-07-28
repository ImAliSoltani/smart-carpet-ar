"""Phase-0 AR spike: generate a calibration 'carpet' and its real-scale GLB.

The texture is a metric checkerboard (every square exactly 10 cm) so the phone
test is falsifiable: lay a tape measure next to the AR carpet — each square
must read 10 cm and the whole carpet 1.00 × 1.50 m.

Run from backend/:  uv run python scripts/make_spike_asset.py
"""

from pathlib import Path

from PIL import Image, ImageDraw

from app.ar.glb_builder import build_carpet_glb

WIDTH_M, LENGTH_M = 1.0, 1.5
PX_PER_M = 1000  # 1 px = 1 mm
SQUARE_M = 0.10

OUT_DIR = Path(__file__).resolve().parents[2] / "spike" / "assets"


def make_checkerboard() -> Image.Image:
    w_px, l_px = int(WIDTH_M * PX_PER_M), int(LENGTH_M * PX_PER_M)
    square_px = int(SQUARE_M * PX_PER_M)
    image = Image.new("RGB", (w_px, l_px), "white")
    draw = ImageDraw.Draw(image)

    for row in range(l_px // square_px):
        for col in range(w_px // square_px):
            if (row + col) % 2 == 0:
                draw.rectangle(
                    [
                        col * square_px,
                        row * square_px,
                        (col + 1) * square_px - 1,
                        (row + 1) * square_px - 1,
                    ],
                    fill=(25, 40, 90),
                )

    # red frame marks the exact outer edge (the measured boundary)
    border = 6
    for i in range(border):
        draw.rectangle([i, i, w_px - 1 - i, l_px - 1 - i], outline=(200, 30, 30))

    # top edge marker: white notch at the texture top so orientation is visible
    draw.rectangle([w_px // 2 - 50, 0, w_px // 2 + 50, 30], fill=(200, 30, 30))
    return image


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    texture = make_checkerboard()
    texture.save(OUT_DIR / "calib-texture.png", optimize=True)

    asset = build_carpet_glb(
        texture,
        WIDTH_M,
        LENGTH_M,
        OUT_DIR / "calib-carpet.glb",
        name="CalibrationCarpet",
        max_texture_px=2048,
    )
    print(
        f"OK  {asset.glb_path}  {asset.width_m}x{asset.length_m} m  "
        f"texture {asset.texture_px[0]}x{asset.texture_px[1]}px  {asset.file_size} bytes"
    )


if __name__ == "__main__":
    main()
