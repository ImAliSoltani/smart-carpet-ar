"""Curate a raw carpet image dump into a seed catalog.

Filters out small/blurry images, removes near-duplicates (perceptual dHash),
keeps the sharpest N per class, then writes:

    dest/
        images/…                 renamed, curation-ordered
        images/metadata.csv      ingest_folder.py-compatible Persian metadata
        montage.png              contact sheet for human review

Names are generated from the class + the image's own dominant color
(e.g. «فرش افشان کاشان زمینه لاکی»), so the catalog reads like a real shop.

    uv run python scripts/curate_dataset.py <src> --dest ../data/catalog-seed --per-class 35
"""

import argparse
import colorsys
import csv
import random
import shutil
from pathlib import Path

from PIL import Image, ImageFilter, ImageStat

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
MIN_EDGE = 450

PATTERN_FA = {"afshan": "افشان", "lachak_torang": "لچک‌ترنج", "lachak_toranj": "لچک‌ترنج"}
PATTERN_EN = {
    "afshan": "afshan",
    "lachak_torang": "lachak_toranj",
    "lachak_toranj": "lachak_toranj",
}
CITIES = ["کاشان", "نائین", "تبریز", "اصفهان", "قم", "کرمان", "مشهد", "اراک", "همدان", "یزد"]
SIZE_SETS = [
    "150x225:{p1}; 200x300:{p2}",
    "200x300:{p2}; 250x350:{p3}",
    "150x225:{p1}; 200x300:{p2}; 300x400:{p4}",
    "100x150:{p0}; 200x300:{p2}",
]
DESCRIPTIONS = [
    "بافت ظریف با نقشه‌ی اصیل ایرانی، مناسب فضاهای پذیرایی.",
    "الیاف مرغوب با ثبات رنگ بالا؛ انتخابی ماندگار برای منزل شما.",
    "طرح کلاسیک با ترکیب رنگی چشم‌نواز، سازگار با دکوراسیون سنتی و مدرن.",
    "نقشه‌ی پرکار با تراکم بافت بالا و زیرپایی نرم.",
]


def color_word(hex_color: str) -> str:
    r, g, b = (int(hex_color[i : i + 2], 16) / 255 for i in (1, 3, 5))
    h, lightness, s = colorsys.rgb_to_hls(r, g, b)
    hue = h * 360
    if s < 0.14:
        return "دودی" if lightness < 0.55 else "کرم"
    if lightness < 0.16:
        return "مشکی"
    if hue < 18 or hue >= 340:
        return "لاکی"
    if hue < 45:
        return "مسی" if lightness < 0.55 else "کرم"
    if hue < 70:
        return "زرد"
    if hue < 165:
        return "سبز"
    if hue < 255:
        return "سرمه‌ای" if lightness < 0.4 else "آبی"
    return "بادمجانی"


def dhash(image: Image.Image) -> int:
    small = image.convert("L").resize((9, 8), Image.LANCZOS)
    pixels = list(small.getdata())
    bits = 0
    for row in range(8):
        for col in range(8):
            bits = (bits << 1) | (pixels[row * 9 + col] > pixels[row * 9 + col + 1])
    return bits


def hamming(a: int, b: int) -> int:
    return (a ^ b).bit_count()


def sharpness(image: Image.Image) -> float:
    edges = image.convert("L").resize((400, 400)).filter(ImageFilter.FIND_EDGES)
    return ImageStat.Stat(edges).stddev[0]


def dominant_hex(image: Image.Image) -> str:
    small = image.convert("RGB").resize((100, 100))
    quantized = small.quantize(colors=6, method=Image.Quantize.MEDIANCUT)
    palette = quantized.getpalette()
    (_, index), *_ = sorted(quantized.getcolors(100 * 100) or [(0, 0)], reverse=True)
    r, g, b = palette[index * 3 : index * 3 + 3]
    return f"#{r:02x}{g:02x}{b:02x}"


def price_set(rng: random.Random) -> dict[str, int]:
    per_sqm = rng.randrange(18, 36) * 100_000  # believable toman per m²
    return {
        "p0": round(1.5 * per_sqm, -5),
        "p1": round(3.375 * per_sqm, -5),
        "p2": round(6 * per_sqm, -5),
        "p3": round(8.75 * per_sqm, -5),
        "p4": round(12 * per_sqm, -5),
    }


def curate(src: Path, dest: Path, per_class: int, seed: int) -> None:
    rng = random.Random(seed)
    images_dir = dest / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    rows = []
    thumbnails = []
    for class_dir in sorted(p for p in src.iterdir() if p.is_dir()):
        class_key = class_dir.name.lower()
        pattern_fa = PATTERN_FA.get(class_key, class_key)
        pattern_en = PATTERN_EN.get(class_key, "medallion")

        scored = []
        for path in sorted(class_dir.iterdir()):
            if path.suffix.lower() not in IMAGE_EXTENSIONS:
                continue
            try:
                with Image.open(path) as img:
                    img.load()
                    if min(img.size) < MIN_EDGE:
                        continue
                    scored.append((sharpness(img), dhash(img), path))
            except Exception:
                continue

        scored.sort(reverse=True, key=lambda item: item[0])
        picked = []
        for score, signature, path in scored:
            if any(hamming(signature, other) <= 8 for _, other, _ in picked):
                continue  # near-duplicate of something sharper
            picked.append((score, signature, path))
            if len(picked) >= per_class:
                break

        used_slugs = {row["filename"].rsplit(".", 1)[0] for row in rows}
        for index, (_, _, path) in enumerate(picked, start=1):
            with Image.open(path) as img:
                img = img.convert("RGB")
                hex_color = dominant_hex(img)
                thumb = img.copy()
                thumb.thumbnail((160, 160))
                thumbnails.append(thumb)

            city = rng.choice(CITIES)
            word = color_word(hex_color)
            name = f"فرش {pattern_fa} {city} زمینه {word}"
            base = f"{pattern_en}-{index:02d}"
            while base in used_slugs:
                base += "x"
            used_slugs.add(base)

            filename = f"{base}.jpg"
            shutil.copyfile(path, images_dir / filename)
            rows.append(
                {
                    "filename": filename,
                    "name": name,
                    "pattern": pattern_en,
                    "material": rng.choices(["wool", "acrylic"], weights=(3, 1))[0],
                    "origin": city,
                    "description": rng.choice(DESCRIPTIONS),
                    "sizes": rng.choice(SIZE_SETS).format(**price_set(rng)),
                    "stock": rng.randrange(1, 6),
                }
            )
        print(f"{class_dir.name}: kept {len(picked)} of {len(scored)} candidates")

    with open(images_dir / "metadata.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    columns = 10
    cell = 164
    rows_needed = -(-len(thumbnails) // columns)
    montage = Image.new("RGB", (columns * cell, rows_needed * cell), (245, 243, 238))
    for i, thumb in enumerate(thumbnails):
        x = (i % columns) * cell + (cell - thumb.width) // 2
        y = (i // columns) * cell + (cell - thumb.height) // 2
        montage.paste(thumb, (x, y))
    montage.save(dest / "montage.png", optimize=True)

    print(f"\ntotal curated: {len(rows)} -> {images_dir}")
    print(f"montage: {dest / 'montage.png'}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("src", type=Path)
    parser.add_argument("--dest", type=Path, required=True)
    parser.add_argument("--per-class", type=int, default=35)
    parser.add_argument("--seed", type=int, default=1405)
    args = parser.parse_args()
    curate(args.src, args.dest, args.per_class, args.seed)


if __name__ == "__main__":
    main()
