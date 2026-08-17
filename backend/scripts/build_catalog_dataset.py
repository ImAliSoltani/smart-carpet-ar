"""Write the catalogue's two reviewable artifacts.

    uv run python scripts/build_catalog_dataset.py

`dataset/profiles.json` is the machine-readable catalogue — what the ingest
script will read once the images exist. `dataset/prompts.md` is the same thing
written for a person, so the two hundred prompts can be read and argued with
before any of them is spent. `dataset/chat-guide.md` is the third form: the
document to actually work from when the images are made by hand in a chat app,
with the prompts in paste order and a checklist that survives an interruption.

Both are derived, never edited: `catalog_profiles.py` is the source. They live
under `dataset/` at the repository root rather than under `data/`, which is
gitignored — the pixels are heavy and reproducible, this is neither.
"""

import json
import sys
from pathlib import Path

from catalog_chat_guide import build_guide
from catalog_profiles import PROFILES, RATE_PER_SQM
from catalog_prompts import build_shots

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "dataset"


def profile_json(profile) -> dict:
    return {
        "slug": profile.slug,
        "name": profile.name,
        "description": profile.description,
        "pattern": profile.pattern.value,
        "material": profile.material.value,
        "suitable_rooms": [room.value for room in profile.rooms],
        "origin": profile.origin,
        "handmade": profile.handmade,
        "density": profile.density,
        # The colours we asked the photograph for. The catalogue's own `colors`
        # and `color_families` are read back off the image at ingest; these stay
        # here so the two can be compared and a wrong image caught.
        "intended_colors": [
            profile.lead_color.value,
            *(c.value for c in profile.accent_colors),
        ],
        "variants": [
            {"width_cm": w, "length_cm": length, "price": str(price), "stock": stock}
            for w, length, price, stock in profile.variants
        ],
        "images": [shot.name for shot in build_shots(profile)],
    }


def main() -> int:
    OUT.mkdir(exist_ok=True)

    catalogue = [profile_json(p) for p in PROFILES]
    (OUT / "profiles.json").write_text(
        json.dumps(catalogue, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    lines: list[str] = [
        "# پرامپت‌های تولید تصویر کاتالوگ",
        "",
        "این فایل **مشتق** است — از `backend/scripts/catalog_profiles.py` ساخته می‌شود.",
        "دستی ویرایشش نکنید؛ پروفایل را عوض کنید و دوباره بسازیدش:",
        "",
        "```bash",
        "cd backend && uv run python scripts/build_catalog_dataset.py",
        "```",
        "",
        f"**{len(PROFILES)} فرش × {len(SHOT_ORDER)} تصویر = "
        f"{len(PROFILES) * len(SHOT_ORDER)} تولید.**",
        "",
        "## ترتیب، که اختیاری نیست",
        "",
        "برای هر فرش **اول `flat` ساخته می‌شود**، و بعد همان فایل به‌عنوان تصویر",
        "مرجع ضمیمه‌ی چهار پرامپت بعدی می‌شود. اگر پرامپت‌های ۲ تا ۵ مستقل اجرا",
        "شوند، چهار فرش متفاوت به دست می‌آید و کاور با مدل AR یکی نخواهد بود.",
        "",
        "## نام فایل",
        "",
        "`<slug>__<shot>.png` — مثلاً `qom-silk-lachak-sormei__flat.png`.",
        "اسکریپت ingest از روی همین نام فایل را به فرش وصل می‌کند.",
        "",
        "---",
        "",
    ]

    for index, profile in enumerate(PROFILES, start=1):
        area_note = "دستباف" if profile.handmade else "ماشینی"
        lines += [
            f"## {index}. {profile.name}",
            "",
            f"`{profile.slug}` · {area_note} · {profile.density} · {profile.origin} · "
            f"{profile.pattern.value} · {profile.material.value}",
            "",
            f"رنگ‌های خواسته‌شده: {profile.lead_color.value}"
            + (
                " + " + ", ".join(c.value for c in profile.accent_colors)
                if profile.accent_colors
                else ""
            ),
            "",
        ]
        for shot in build_shots(profile):
            tag = (
                "با ضمیمه‌ی `flat`"
                if shot.needs_reference
                else "**بدون مرجع — اول این**"
            )
            lines += [
                f"**`{profile.slug}__{shot.name}.png`** — {tag}",
                "",
                "```text",
                shot.prompt,
                "```",
                "",
            ]
        lines.append("---")
        lines.append("")

    (OUT / "prompts.md").write_text("\n".join(lines), encoding="utf-8")
    (OUT / "chat-guide.md").write_text(build_guide(), encoding="utf-8")

    tiers = sorted({p.tier for p in PROFILES})
    print(f"{len(catalogue)} carpets, {sum(len(p['variants']) for p in catalogue)} sizes")
    print(f"price tiers used: {', '.join(tiers)}")
    print(f"rates defined:    {len(RATE_PER_SQM)}")
    print(f"wrote {OUT / 'profiles.json'}")
    print(f"wrote {OUT / 'prompts.md'}")
    print(f"wrote {OUT / 'chat-guide.md'}")
    return 0


SHOT_ORDER = build_shots(PROFILES[0])

if __name__ == "__main__":
    sys.exit(main())
