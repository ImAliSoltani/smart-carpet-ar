"""Author the catalog metadata for the seed photographs.

Every row below was written after looking at the actual photograph: the field
colour, the border colour and the motif are what the picture shows, not a guess
derived from an average pixel value (a whole-image average turns a busy carpet
into mud and mislabels roughly a third of them).

What is observed versus what is assigned:

* observed from the photo — field colour, border colour, motif, and whether the
  weave looks hand-knotted or machine-made;
* assigned as plausible shop data — city of origin, material, offered sizes,
  price and stock.

Prices are generated from one rule so the catalog stays internally consistent:
a price per square metre per quality tier, a small per-carpet variation, and a
discount on larger pieces (as in the real market). Rounded to 100,000 toman.

    uv run python scripts/build_seed_metadata.py
"""

import csv
import zlib
from pathlib import Path
from typing import NamedTuple

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
IMAGES = ROOT / "data" / "catalog-seed" / "images"


class Seed(NamedTuple):
    file: str
    slug: str
    tier: str
    city: str
    pattern: str
    field: str
    look: str
    rooms: list[str]


# tier -> (material, toman per square metre, offered sizes, stock range)
TIERS = {
    "machine_acrylic": (
        "acrylic",
        2_400_000,
        [(100, 150), (150, 225), (200, 300), (250, 350), (300, 400)],
        (4, 14),
    ),
    "machine_viscose": (
        "viscose",
        3_200_000,
        [(100, 150), (150, 225), (200, 300), (250, 350)],
        (3, 10),
    ),
    "hand_wool": (
        "wool",
        18_000_000,
        [(100, 150), (150, 225), (200, 300), (250, 350)],
        (1, 3),
    ),
    "hand_silk": (
        "silk",
        75_000_000,
        [(80, 120), (100, 150), (150, 225)],
        (1, 2),
    ),
}

TIER_LABEL = {
    "machine_acrylic": "فرش ماشینی {city} ۱۲۰۰ شانه",
    "machine_viscose": "فرش ماشینی {city} ۱۵۰۰ شانه",
    "hand_wool": "فرش دستباف {city}",
    "hand_silk": "فرش دستباف ابریشم {city}",
}

PATTERN_LABEL = {"afshan": "طرح افشان", "lachak_toranj": "نقش لچک‌ترنج"}

MATERIAL_SENTENCE = {
    "machine_acrylic": (
        "بافت ماشینی ۱۲۰۰ شانه با نخ اکریلیک هیت‌ست؛ ثبات رنگ بالا و نگهداری آسان."
    ),
    "machine_viscose": (
        "بافت ماشینی ۱۵۰۰ شانه با نخ ویسکوز؛ درخشش ملایم و جزئیات نقشه‌ی ریزتر."
    ),
    "hand_wool": (
        "دستباف با پرز پشم و زیرساخت پنبه؛ هر تخته اندکی با تخته‌ی دیگر تفاوت دارد."
    ),
    "hand_silk": (
        "دستباف ابریشم با رَج‌شمار بالا؛ نقشه در زاویه‌های مختلف نور تغییر جلوه می‌دهد."
    ),
}

ROOM_LABEL = {
    "living_room": "پذیرایی",
    "bedroom": "اتاق خواب",
    "dining_room": "ناهارخوری",
    "kids_room": "اتاق کودک",
    "office": "اتاق کار",
    "hallway": "راهرو",
}

LIVING_DINING = ["living_room", "dining_room"]
LIVING_BEDROOM = ["living_room", "bedroom"]
LIVING_OFFICE = ["living_room", "office"]

CARPETS = [
    Seed(
        "afshan-01", "afshan-kashan-meshki", "hand_wool", "کاشان", "afshan", "مشکی",
        "زمینه‌ی مشکی با گل‌واگیره‌ی ریز و یکدست، و حاشیه‌ی پهن استخوانی"
        " که کل نقش را قاب می‌گیرد",
        LIVING_DINING,
    ),
    Seed(
        "afshan-02", "afshan-mashhad-sormei", "hand_wool", "مشهد", "afshan", "سرمه‌ای",
        "زمینه‌ی سرمه‌ای پرمایه با بته‌های ریز سراسری و حاشیه‌ی لاکی روشن",
        LIVING_DINING,
    ),
    Seed(
        "afshan-03", "afshan-sarugh-ghermez", "hand_wool", "ساروق", "afshan", "قرمز",
        "زمینه‌ی قرمز روشن با نقش‌مایه‌های درشت و حاشیه‌ی سرمه‌ای تیره",
        LIVING_DINING,
    ),
    Seed(
        "afshan-04", "afshan-naeen-kerem", "hand_wool", "نایین", "afshan", "کرم",
        "زمینه‌ی کرم آرام با بته‌جقه‌ی مرکزی کوچک و حاشیه‌ی شتری",
        LIVING_BEDROOM,
    ),
    Seed(
        "afshan-05", "afshan-tabriz-nili", "hand_wool", "تبریز", "afshan", "نیلی",
        "زمینه‌ی نیلی کم‌رنگ با اسلیمی سراسری و حاشیه‌ی زرشکی تیره",
        LIVING_BEDROOM,
    ),
    Seed(
        "afshan-06", "afshan-kerman-firoozei", "hand_wool", "کرمان", "afshan", "فیروزه‌ای",
        "زمینه‌ی سبزِ فیروزه‌ای با گل‌های ریز نارنجی و کرم، و حاشیه‌ی لاکی",
        LIVING_DINING,
    ),
    Seed(
        "afshan-07", "afshan-kerman-sabz", "hand_wool", "کرمان", "afshan", "سبز",
        "زمینه‌ی سبز زمردی با شبکه‌ی منظم گل‌های طلایی و حاشیه‌ی گلبهی",
        LIVING_DINING,
    ),
    Seed(
        "afshan-08", "afshan-esfahan-kerem", "hand_wool", "اصفهان", "afshan", "کرم",
        "زمینه‌ی کرم روشن با گل‌های ریز سرخ و حاشیه‌ی گلبهی، فضایی باز و روشن",
        LIVING_BEDROOM,
    ),
    Seed(
        "afshan-09", "afshan-kashan-shotori-machine", "machine_viscose", "کاشان",
        "afshan", "شتری",
        "زمینه‌ی شتری یکدست با نقش هم‌رنگِ زمینه؛ طرحی آرام برای فضاهای مینیمال",
        ["living_room", "bedroom", "office"],
    ),
    Seed(
        "afshan-10", "afshan-kashan-ostokhani", "hand_wool", "کاشان", "afshan", "استخوانی",
        "زمینه‌ی استخوانی با اسلیمی متراکم و حاشیه‌ی پهن زرشکی",
        LIVING_BEDROOM,
    ),
    Seed(
        "afshan-11", "afshan-mashhad-boronzi", "hand_wool", "مشهد", "afshan", "زیتونی",
        "زمینه‌ی زیتونیِ برنزی با نقش سایه‌روشن و حاشیه‌ی مشکی-سبز",
        LIVING_OFFICE,
    ),
    Seed(
        "afshan-12", "afshan-tabriz-abi-roshan", "hand_wool", "تبریز", "afshan", "فیروزه‌ای",
        "زمینه‌ی فیروزه‌ای روشن با گل‌های رنگارنگ پراکنده و حاشیه‌ی سرمه‌ای",
        ["living_room", "kids_room", "bedroom"],
    ),
    Seed(
        "afshan-13", "afshan-ghom-shekargah", "hand_silk", "قم", "afshan", "زیتونی",
        "نقش شکارگاه روی زمینه‌ی زیتونی-طلایی با پرندگان و شاخ‌وبرگ، و حاشیه‌ی زرشکی",
        LIVING_OFFICE,
    ),
    Seed(
        "afshan-14", "afshan-ghom-firoozei", "hand_silk", "قم", "afshan", "فیروزه‌ای",
        "زمینه‌ی فیروزه‌ای با درخت زندگی و پرندگان، و حاشیه‌ی پهن طلایی",
        LIVING_BEDROOM,
    ),
    Seed(
        "afshan-15", "afshan-esfahan-ostokhani", "hand_silk", "اصفهان", "afshan", "استخوانی",
        "زمینه‌ی استخوانی با گل‌واگیره‌ی بسیار ریز و حاشیه‌ی نیلی پرکار",
        LIVING_BEDROOM,
    ),
    Seed(
        "afshan-17", "afshan-ghom-zereshki", "hand_silk", "قم", "afshan", "زرشکی",
        "زمینه‌ی زرشکیِ ابریشمی با درخت زندگی و آهوان، با درخششی که با زاویه‌ی نور"
        " تغییر می‌کند",
        LIVING_OFFICE,
    ),
    Seed(
        "afshan-18", "afshan-esfahan-sabz", "hand_silk", "اصفهان", "afshan", "کرم",
        "زمینه‌ی کرم با ساقه‌های سبز و گل‌های سرخ ریز، و حاشیه‌ی باریک گلبهی",
        ["bedroom", "living_room"],
    ),
    Seed(
        "afshan-19", "afshan-ghom-derakht-zendegi", "hand_silk", "قم", "afshan", "استخوانی",
        "نقش درخت زندگی روی زمینه‌ی استخوانی با پرندگان رنگی و حاشیه‌ی سرمه‌ای",
        LIVING_OFFICE,
    ),
    Seed(
        "afshan-21", "afshan-mashhad-ghermez", "hand_wool", "مشهد", "afshan", "قرمز",
        "زمینه‌ی قرمز شاداب با بته‌های درشت و حاشیه‌ی نیلی روشن",
        LIVING_DINING,
    ),
    Seed(
        "lachak_toranj-01", "toranj-naeen-ostokhani", "hand_wool", "نایین",
        "lachak_toranj", "استخوانی",
        "ترنج گرد و کم‌رنگ در میان زمینه‌ی استخوانی، با لچک‌های محو در چهار گوشه",
        LIVING_BEDROOM,
    ),
    Seed(
        "lachak_toranj-04", "toranj-tabriz-rangarang", "hand_wool", "تبریز",
        "lachak_toranj", "سبز نفتی",
        "ترنج بزرگ و پرکار با گل‌های سرخ و سبز روی زمینه‌ی سبز نفتی، و حاشیه‌ی طلایی",
        LIVING_DINING,
    ),
    Seed(
        "lachak_toranj-05", "toranj-esfahan-sormei", "hand_wool", "اصفهان",
        "lachak_toranj", "سرمه‌ای",
        "ترنج گرد استخوانی روی زمینه‌ی سرمه‌ای متراکم، با حاشیه‌ی زرشکی",
        LIVING_DINING,
    ),
    Seed(
        "lachak_toranj-06", "toranj-tabriz-lozi", "hand_wool", "تبریز",
        "lachak_toranj", "آبی",
        "ترنج لوزیِ مشکی با گل‌های روشن در مرکز، روی زمینه‌ی آبی کم‌رنگ",
        LIVING_OFFICE,
    ),
    Seed(
        "lachak_toranj-07", "toranj-mashhad-laki", "hand_wool", "مشهد",
        "lachak_toranj", "لاکی",
        "ترنج ستاره‌ای در دل زمینه‌ی لاکی یکدست، با لچک‌های هم‌رنگ",
        LIVING_DINING,
    ),
    Seed(
        "lachak_toranj-08", "toranj-kashan-laki-machine", "machine_acrylic", "کاشان",
        "lachak_toranj", "لاکی",
        "ترنج استخوانی درشت روی زمینه‌ی لاکی روشن، با لچک‌های کرم در چهار گوشه",
        LIVING_DINING,
    ),
    Seed(
        "lachak_toranj-09", "toranj-kashan-zereshki", "hand_wool", "کاشان",
        "lachak_toranj", "زرشکی",
        "ترنج کرمِ پرکار روی زمینه‌ی زرشکی تیره، با حاشیه‌ی شتری روشن",
        LIVING_DINING,
    ),
    Seed(
        "lachak_toranj-10", "toranj-ghom-sabz-nafti", "hand_silk", "قم",
        "lachak_toranj", "سبز نفتی",
        "زمینه‌ی سبز نفتیِ تیره با نقشه‌ی بسیار ریز و ترنج کم‌پیدا؛ نمایی آرام و مخملی",
        LIVING_OFFICE,
    ),
    Seed(
        "lachak_toranj-11", "toranj-ghom-sormei-tala", "hand_silk", "قم",
        "lachak_toranj", "سرمه‌ای",
        "ترنج طلاییِ درخشان مثل خورشید در مرکز زمینه‌ی سرمه‌ای، با حاشیه‌های چندلایه",
        LIVING_OFFICE,
    ),
    Seed(
        "lachak_toranj-12", "toranj-mashhad-arghavani", "hand_wool", "مشهد",
        "lachak_toranj", "ارغوانی",
        "زمینه‌ی ارغوانیِ گرم با ترنج درهم‌تنیده و حاشیه‌ی سرمه‌ای",
        LIVING_BEDROOM,
    ),
    Seed(
        "lachak_toranj-13", "toranj-tabriz-nafti-tala", "hand_wool", "تبریز",
        "lachak_toranj", "سبز نفتی",
        "ترنج طلایی برجسته روی زمینه‌ی سبز نفتی، با حاشیه‌ی طوسی روشن",
        LIVING_OFFICE,
    ),
    Seed(
        "lachak_toranj-14", "toranj-kashan-kerem-machine", "machine_acrylic", "کاشان",
        "lachak_toranj", "کرم",
        "ترنج بزرگ و متقارن در زمینه‌ی کرم روشن با سایه‌روشن قهوه‌ای",
        LIVING_BEDROOM,
    ),
    Seed(
        "lachak_toranj-15", "toranj-aran-laki-machine", "machine_acrylic", "آران و بیدگل",
        "lachak_toranj", "لاکی",
        "ترنج آبی-طوسی روی زمینه‌ی لاکی، با حاشیه‌ی سرمه‌ای پرنقش",
        LIVING_DINING,
    ),
    Seed(
        "lachak_toranj-16", "toranj-aran-meshki-gol", "machine_acrylic", "آران و بیدگل",
        "lachak_toranj", "مشکی",
        "دسته‌گل‌های رنگی روی زمینه‌ی مشکی، با حاشیه‌ی طلاییِ روشن که کل قاب را جدا می‌کند",
        LIVING_DINING,
    ),
    Seed(
        "lachak_toranj-17", "toranj-aran-nafti-machine", "machine_viscose", "آران و بیدگل",
        "lachak_toranj", "سبز نفتی",
        "زمینه‌ی سبز نفتیِ تیره با نقش فیروزه‌ای ریز و ترنج هم‌رنگ زمینه",
        LIVING_OFFICE,
    ),
    Seed(
        "lachak_toranj-18", "toranj-kashan-firoozei-machine", "machine_acrylic", "کاشان",
        "lachak_toranj", "فیروزه‌ای",
        "زمینه‌ی فیروزه‌ای روشن با ترنج سرخ کوچک و حاشیه‌ی نارنجی شاد",
        ["kids_room", "living_room", "bedroom"],
    ),
    Seed(
        "lachak_toranj-19", "toranj-kashan-zereshki-machine", "machine_acrylic", "کاشان",
        "lachak_toranj", "زرشکی",
        "ترنج استخوانی کشیده روی زمینه‌ی زرشکی، با حاشیه‌ی سرمه‌ای",
        LIVING_DINING,
    ),
    Seed(
        "lachak_toranj-20", "toranj-tabriz-sormei-bozorg", "hand_wool", "تبریز",
        "lachak_toranj", "سرمه‌ای",
        "ترنج گرد و بسیار بزرگ که تقریباً تمام زمینه‌ی سرمه‌ای را پر کرده،"
        " با حاشیه‌ی گلبهی",
        LIVING_DINING,
    ),
    Seed(
        "lachak_toranj-21", "toranj-aran-kerem-machine", "machine_acrylic", "آران و بیدگل",
        "lachak_toranj", "کرم",
        "ترنج گلدار روی زمینه‌ی کرم، با حاشیه‌ی آجری و لچک‌های هم‌رنگ حاشیه",
        LIVING_BEDROOM,
    ),
    Seed(
        "lachak_toranj-22", "toranj-kashan-laki-tire", "hand_wool", "کاشان",
        "lachak_toranj", "لاکی",
        "ترنج سرمه‌ای کوچک در دل زمینه‌ی لاکیِ تیره، با حاشیه‌ی سرمه‌ای",
        LIVING_DINING,
    ),
    Seed(
        "lachak_toranj-24", "toranj-aran-sormei-machine", "machine_acrylic", "آران و بیدگل",
        "lachak_toranj", "سرمه‌ای",
        "ترنج استخوانی متقارن روی زمینه‌ی سرمه‌ای، با حاشیه‌ی روشن و خطوط تمیز",
        LIVING_BEDROOM,
    ),
    Seed(
        "lachak_toranj-25", "toranj-tabriz-meshki-tala", "hand_wool", "تبریز",
        "lachak_toranj", "مشکی",
        "قاب‌های تودرتوی مشکی و طلایی با گل‌های رنگی، طرحی پرکار و تشریفاتی",
        LIVING_DINING,
    ),
    Seed(
        "lachak_toranj-26", "toranj-esfahan-abi", "hand_wool", "اصفهان",
        "lachak_toranj", "آبی",
        "ترنج کرمِ برجسته روی زمینه‌ی آبی-فیروزه‌ای، با حاشیه‌ی گلبهی",
        LIVING_BEDROOM,
    ),
    Seed(
        "lachak_toranj-27", "toranj-ghom-firoozei", "hand_silk", "قم",
        "lachak_toranj", "فیروزه‌ای",
        "ترنج ستاره‌ای طلایی روی زمینه‌ی فیروزه‌ای روشن، با حاشیه‌ی سرمه‌ای پرکار",
        LIVING_BEDROOM,
    ),
    Seed(
        "lachak_toranj-28", "toranj-esfahan-talaei", "hand_silk", "اصفهان",
        "lachak_toranj", "طلایی",
        "ترنج استخوانی در میان زمینه‌ی طلاییِ درخشان، با حاشیه‌ی سرمه‌ای",
        LIVING_OFFICE,
    ),
]


def jitter(key: str, spread: float) -> float:
    """Stable pseudo-random factor in [1-spread, 1+spread] for one carpet."""
    h = zlib.crc32(key.encode()) / 0xFFFFFFFF
    return 1 - spread + 2 * spread * h


def size_factor(area: float) -> float:
    if area <= 3:
        return 1.0
    return 0.95 if area <= 7 else 0.90


def build_sizes(slug: str, tier: str) -> tuple[str, int]:
    _, per_sqm, catalogue, (lo, hi) = TIERS[tier]
    base = per_sqm * jitter(slug, 0.12)
    count = 2 if tier == "hand_silk" else 3
    start = int(jitter(slug + "off", 0.49) * (len(catalogue) - count))
    parts = []
    for width, length in catalogue[start : start + count]:
        area = width * length / 10_000
        price = round(base * area * size_factor(area) / 100_000) * 100_000
        parts.append(f"{width}x{length}:{price}")
    stock = lo + int(jitter(slug + "stock", 0.49) * (hi - lo))
    return "; ".join(parts), stock


def build_row(seed: Seed) -> dict:
    title = (
        f"{TIER_LABEL[seed.tier].format(city=seed.city)}"
        f" {PATTERN_LABEL[seed.pattern]} — زمینه {seed.field}"
    )
    room_words = "، ".join(ROOM_LABEL[r] for r in seed.rooms)
    sizes, stock = build_sizes(seed.slug, seed.tier)
    return {
        "filename": f"{seed.file}.jpg",
        "slug": seed.slug,
        "name": title,
        "pattern": seed.pattern,
        "material": TIERS[seed.tier][0],
        "origin": seed.city,
        "description": (
            f"{seed.look}. {MATERIAL_SENTENCE[seed.tier]}"
            f" پیشنهاد ما برای {room_words} است."
        ),
        "sizes": sizes,
        "stock": stock,
        "suitable_rooms": "; ".join(seed.rooms),
    }


def normalise_formats() -> list[str]:
    """Re-save images whose real format contradicts their .jpg extension.

    Four of the downloaded files are BMP wearing a .jpg name. Ingest rejects
    them, so fix them here rather than by hand, keeping the seed reproducible
    from a fresh copy of the dataset.
    """
    converted = []
    for path in sorted(IMAGES.glob("*.jpg")):
        with Image.open(path) as im:
            if im.format == "JPEG":
                continue
            original, rgb = im.format, im.convert("RGB")
        rgb.save(path, "JPEG", quality=95, subsampling=0)
        converted.append(f"{path.name} ({original})")
    return converted


def main() -> None:
    for name in normalise_formats():
        print(f"re-saved as JPEG: {name}")

    rows = [build_row(s) for s in CARPETS]
    if len({r["slug"] for r in rows}) != len(rows):
        raise SystemExit("duplicate slug")

    on_disk = {p.name for p in IMAGES.glob("*.jpg")}
    missing = sorted({r["filename"] for r in rows} - on_disk)
    if missing:
        raise SystemExit(f"photographs missing for: {missing}")

    # The folder also holds carpets whose metadata was authored elsewhere, so
    # rewrite only the rows this script owns and carry the rest through intact.
    out = IMAGES / "metadata.csv"
    merged = {r["slug"]: r for r in rows}
    if out.exists():
        with open(out, encoding="utf-8-sig") as f:
            for existing in csv.DictReader(f):
                merged.setdefault(existing["slug"], existing)

    final = sorted(merged.values(), key=lambda r: r["filename"])
    with open(out, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(final)

    prices = [
        int(part.split(":")[1]) for r in final for part in r["sizes"].split("; ")
    ]
    print(f"authored {len(rows)} carpets; catalogue now holds {len(final)} -> {out}")
    print(f"variants: {len(prices)}")
    print(f"price range: {min(prices):,} – {max(prices):,} تومان")


if __name__ == "__main__":
    main()
