"""The working document for generating the catalogue by hand, in a chat app.

`prompts.md` is for reading and arguing with. This is for *doing* — the file
that stays open for the two or three hours the images take, with the prompts in
paste order, the filename beside each, and a checklist that survives being
interrupted.

**Why the chat path is not a downgrade.** The one thing the API script buys is
attaching the flat texture to the other four requests, and a chat window does
that for free: the image from message one is already in the conversation when
message two arrives. So the consistency mechanism the whole design rests on is
native here. What is lost is only the typing.

**Why one chat per carpet, and never one chat for two.** The context that makes
shot two a photograph of shot one is the same context that would make carpet
seventeen's cover a photograph of carpet sixteen. Forty conversations is not
bureaucracy; it is the isolation the method needs.
"""

from __future__ import annotations

from catalog_profiles import PROFILES
from catalog_prompts import build_shots

#: What to look at before accepting a `flat`, and what to type when it is wrong.
#: Only this shot gets acceptance criteria, because only this one is measured:
#: the AR pipeline rectifies it, the embedding is computed from it, and the
#: colour filter reads it. The other four are looked at and either liked or not.
FLAT_CHECKS: tuple[tuple[str, str], ...] = (
    (
        "از روبه‌رو و کاملاً صاف است؟ لبه‌ها موازی کادرند و ذوزنقه نیست؟",
        "دقیقاً از بالا و عمود بر فرش، بدون هیچ پرسپکتیوی. لبه‌ها کاملاً موازی کادر.",
    ),
    (
        "فرش کل کادر را پر کرده؟ **هیچ پس‌زمینه‌ای دیده نمی‌شود؟**",
        "فرش باید کل کادر را پر کند؛ چهار لبه‌ی فرش همان چهار لبه‌ی تصویر باشد و "
        "هیچ پس‌زمینه‌ای — حتی سفید — دیده نشود.",
    ),
    (
        "چیزی رویش نیست؟ گلدان، میز، سایه‌ی چیز دیگر؟",
        "هیچ شیئی روی فرش یا نزدیکش نباشد و هیچ سایه‌ای رویش نیفتد.",
    ),
    (
        "نور یکنواخت است؟ لکه‌ی روشن یا تیره ندارد؟",
        "نور یکنواخت و پخش روی تمام سطح، بدون لکه‌ی روشن و بدون سایه‌روشن.",
    ),
    (
        "نسبت ابعادش با اندازه‌ای که خواسته‌ایم می‌خواند؟",
        "نسبت ابعاد را دقیقاً همان چیزی کن که در پیام اول خواستم.",
    ),
)


def _fa(value: int | str) -> str:
    """Persian digits. The document is Persian and half-Latin numerals in it
    read as a copy-paste accident, which in a working document is a reason to
    trust it slightly less."""
    return str(value).translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹"))


def build_guide() -> str:
    total = len(PROFILES) * len(build_shots(PROFILES[0]))
    lines: list[str] = [
        "# ساخت تصاویر کاتالوگ — راهنمای کار دستی",
        "",
        "این فایل **مشتق** است. از `backend/scripts/catalog_profiles.py` ساخته می‌شود:",
        "",
        "```bash",
        "cd backend && uv run python scripts/build_catalog_dataset.py",
        "```",
        "",
        f"**{_fa(len(PROFILES))} فرش × {_fa(len(build_shots(PROFILES[0])))} تصویر"
        f" = {_fa(total)} تصویر.**",
        "",
        "## روش کار",
        "",
        "۱. برای **هر فرش یک گفتگوی تازه** باز کنید. همان چیزی که باعث می‌شود",
        "   تصویر دوم عکسی *از* تصویر اول باشد، اگر گفتگو را ادامه دهید باعث",
        "   می‌شود فرش هفدهم شبیه شانزدهم دربیاید. چهل گفتگو، نه یکی.",
        "۲. پنج پیام را **به همین ترتیب** بفرستید. پیام اول فرش را می‌سازد؛ چهار",
        "   پیام بعدی از همان فرش عکس می‌گیرند — چون تصویر پیام قبلی در گفتگو هست،",
        "   لازم نیست چیزی را دوباره آپلود کنید.",
        "۳. هر تصویر را با **همان نامی که زیرش نوشته شده** ذخیره کنید، در:",
        "",
        "```",
        "data/catalog-gen/",
        "```",
        "",
        "نام فایل تنها چیزی است که تصویر را به فرش وصل می‌کند. اگر نامش عوض شود،",
        "اسکریپت ingest پیدایش نمی‌کند.",
        "",
        "## پیش از پذیرفتن هر `flat` این‌ها را نگاه کنید",
        "",
        "چهار تصویر دیگر فقط باید قشنگ باشند. `flat` **اندازه‌گیری می‌شود**:",
        "پایپ‌لاین AR پرسپکتیوش را تصحیح و در فایل سه‌بعدی پخت می‌کند، امبدینگ",
        "جست‌وجوی بصری از رویش حساب می‌شود، و فیلتر رنگ رنگ‌هایش را می‌خواند.",
        "اشتباهش بعد از ingest قابل تعمیر نیست.",
        "",
        "**مهم‌ترینشان پس‌زمینه است.** استخراج رنگ فقط پیکسل‌های *شفاف* را رد",
        "می‌کند و JPEG آلفا ندارد، پس هرچه فرش نیست هم فرش حساب می‌شود. یک فرش",
        "سرمه‌ای قم با حاشیه‌ی سفید، ۳۳٪ سفید خوانده شد و زیر «سفید» فایل شد.",
        "",
        "| ببینید | اگر نبود، همین را بفرستید |",
        "|---|---|",
    ]
    for question, fix in FLAT_CHECKS:
        lines.append(f"| {question} | «{fix}» |")

    lines += [
        "",
        "اگر بعد از دو بار اصلاح درست نشد، از اول شروع کنید — گفتگویی که یک بار",
        "بد فهمیده، معمولاً همان را تکرار می‌کند.",
        "",
        "## پیشرفت",
        "",
    ]
    for index, profile in enumerate(PROFILES, start=1):
        lines.append(f"- [ ] {_fa(index)}. `{profile.slug}` — {profile.name}")

    lines += ["", "---", ""]

    for index, profile in enumerate(PROFILES, start=1):
        kind = "دستباف" if profile.handmade else "ماشینی"
        colours = ", ".join(
            [profile.lead_color.value, *(c.value for c in profile.accent_colors)]
        )
        lines += [
            f"## {_fa(index)} از {_fa(len(PROFILES))} — {profile.name}",
            "",
            f"`{profile.slug}` · {kind} · {profile.density} · {profile.origin}",
            f"رنگ‌های خواسته‌شده: {colours}",
            "",
            "**گفتگوی تازه باز کنید.**",
            "",
        ]
        for step, shot in enumerate(build_shots(profile), start=1):
            lines += [
                f"### پیام {_fa(step)} → `{profile.slug}__{shot.name}.png`",
                "",
                "```text",
                shot.prompt,
                "```",
                "",
            ]
        lines += ["---", ""]

    return "\n".join(lines)
