"""Every icon the shop needs, from one mark.

ROADMAP §۸ فاز ۳ set the rule this script exists to keep: «هر دارایی از یک مسیر
ثابت با نام ثابت خوانده می‌شود و مشتق‌هایش با اسکریپت از همان یک فایل ساخته
می‌شوند. جایگزینی نهایی باید تعویض یک فایل و اجرای یک دستور باشد، نه گشتن در
صفحه‌ها.» So the day the real logo arrives, it is dropped at
`assets/brand/mark.png` and this is run again. Nothing else changes — not the
manifest, not the layout, not a single page.

Until then the mark is drawn here, parametrically. That is deliberate and it is
what the brand brief asks for: the *symbol* is a simplified toranj and may be a
placeholder, but the brand **name** is not — «ترنجان» is set in real Vazirmatn
on the page and never baked into an image. Which is just as well, because
Pillow on this machine reports `raqm: False`: it cannot shape Arabic script, so
Persian text drawn through it would come out as unjoined letters in visual
order. A picture of the name was never on the table.

The acceptance test the brand brief sets is 24 pixels. That is what shapes the
drawing below: one silhouette, two pendants, one warm centre, and no detail
that survives being 24 pixels wide only in theory.

    uv run python ../scripts/build_brand_icons.py      # from backend/

Outputs, all overwritten:

    frontend/public/brand/icon-192.png            manifest, any
    frontend/public/brand/icon-512.png            manifest, any
    frontend/public/brand/icon-maskable-512.png   manifest, maskable
    frontend/src/app/icon.png                     tab icon (Next convention)
    frontend/src/app/apple-icon.png               iOS home screen
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
MARK_SOURCE = ROOT / "assets" / "brand" / "mark.png"
PUBLIC_BRAND = ROOT / "frontend" / "public" / "brand"
APP = ROOT / "frontend" / "src" / "app"

# The storefront palette, and its own rule about where gold is allowed.
# ROADMAP: «`--accent` (طلایی) فقط نشانه‌های ریز را رنگ می‌کند» — so the
# medallion is ink and only its heart is gold.
BG = (250, 250, 250, 255)  # --bg   #FAFAFA
INK = (24, 24, 27, 255)  # --ink  #18181B
ACCENT = (161, 98, 7, 255)  # --accent #A16207

# Drawn at 4x and reduced. Pillow's polygon fill has no anti-aliasing of its
# own, and a toranj is nothing but diagonals — jagged at 192px, and at 24px the
# staircase is the shape.
SUPERSAMPLE = 4


def _toranj(
    cx: float,
    cy: float,
    half_w: float,
    half_h: float,
    *,
    point: float = 1.9,
    lobes: int = 5,
    depth: float = 0.24,
) -> list[tuple[float, float]]:
    """One medallion outline, as a closed polygon.

    Swept as an ogee rather than a deformed ellipse: the half-width follows
    `sin(πu)**point` from the bottom tip to the top one, so the tangent goes
    vertical as it arrives and the tip is a real point. Below 1 the exponent
    blunts it; 1.9 is sharp without drawing a needle.

    The scallops are `|cos|`, not `cos`. That is the whole difference between
    this and the first attempt: a cosine ripple gives smooth waves and the shape
    came out a cloud, while the absolute value puts a **cusp** at every zero —
    the sharp inward notch a real toranj edge is made of. Five deep ones rather
    than nine shallow: shallow scallops are the first thing to disappear when
    512 pixels are resampled down to 24, and the brand brief makes 24 the test.
    """
    steps = 600
    right: list[tuple[float, float]] = []
    left: list[tuple[float, float]] = []
    for i in range(steps + 1):
        u = i / steps
        width = math.sin(math.pi * u) ** point
        scallop = 1 - depth + depth * abs(math.cos(lobes * math.pi * u))
        x = half_w * width * scallop
        y = -half_h + 2 * half_h * u
        right.append((cx + x, cy + y))
        left.append((cx - x, cy + y))
    return right + left[::-1]


def _draw_placeholder(size: int) -> Image.Image:
    """The stand-in mark: a lobed medallion with a pendant at each point.

    The pendants are what make it read as a toranj rather than as a generic
    diamond, and they are the part that survives shrinking — at 24px they are
    two dots on a vertical axis, which is still a composition.
    """
    canvas = size * SUPERSAMPLE
    image = Image.new("RGBA", (canvas, canvas), BG)
    draw = ImageDraw.Draw(image)

    cx = cy = canvas / 2
    # The mark takes the middle 94%. It is a silhouette on its own ground, not a
    # picture inside a frame — the launcher and the tab strip add their own
    # padding, and adding ours on top only makes the mark smaller than the space
    # it was given. The maskable variant, which really does get cropped, shrinks
    # separately in `_mark`.
    total_half_h = canvas * 0.94 / 2

    pendant_half_h = total_half_h * 0.15
    body_half_h = total_half_h - 2 * pendant_half_h
    body_half_w = body_half_h / 1.25

    draw.polygon(_toranj(cx, cy, body_half_w, body_half_h), fill=INK)

    # سرترنج, above and below, touching the tips rather than floating clear of
    # them. Detached they read as two specks at small sizes; touching, the three
    # shapes are one vertical mark.
    for direction in (-1, 1):
        pendant_cy = cy + direction * (body_half_h + pendant_half_h)
        draw.polygon(
            _toranj(cx, pendant_cy, pendant_half_h / 1.15, pendant_half_h, point=1.5, lobes=3, depth=0.14),
            fill=INK,
        )

    # The warm centre. Gold is a detail here, not a field — which is both the
    # palette's rule and the only way it stays legible: a gold medallion on
    # #FAFAFA is 4.7:1, while ink is 15:1.
    draw.polygon(_toranj(cx, cy, body_half_w * 0.44, body_half_h * 0.44), fill=ACCENT)

    return image.resize((size, size), Image.LANCZOS)


def _mark(size: int, *, scale: float = 1.0) -> Image.Image:
    """The mark at `size`, from the real logo if there is one yet.

    `scale` below 1 shrinks the drawing inside its background — what a maskable
    icon needs, since the launcher is free to crop everything outside a circle
    of 80% diameter.
    """
    if scale != 1.0:
        inner = _mark(round(size * scale))
        canvas = Image.new("RGBA", (size, size), BG)
        offset = (size - inner.width) // 2
        canvas.paste(inner, (offset, offset), inner)
        return canvas

    if MARK_SOURCE.exists():
        art = Image.open(MARK_SOURCE).convert("RGBA")
        if art.width != art.height:
            raise SystemExit(f"{MARK_SOURCE} must be square; it is {art.width}×{art.height}.")
        flat = Image.new("RGBA", art.size, BG)
        flat.paste(art, (0, 0), art)
        return flat.resize((size, size), Image.LANCZOS)

    return _draw_placeholder(size)


def main() -> None:
    PUBLIC_BRAND.mkdir(parents=True, exist_ok=True)

    source = "assets/brand/mark.png" if MARK_SOURCE.exists() else "the drawn placeholder"
    print(f"mark: {source}")

    outputs = [
        (PUBLIC_BRAND / "icon-192.png", 192, 1.0),
        (PUBLIC_BRAND / "icon-512.png", 512, 1.0),
        # Android crops a maskable icon to whatever shape the launcher likes and
        # only promises the middle 80% survives. 0.72 keeps the pendants inside
        # a circle mask with room to spare.
        (PUBLIC_BRAND / "icon-maskable-512.png", 512, 0.72),
        (APP / "icon.png", 256, 1.0),
        (APP / "apple-icon.png", 180, 1.0),
    ]

    for path, size, scale in outputs:
        _mark(size, scale=scale).save(path, "PNG", optimize=True)
        print(f"  {path.relative_to(ROOT).as_posix()}  {size}×{size}")


if __name__ == "__main__":
    main()
