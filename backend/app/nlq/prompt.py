"""The vocabulary, written out for a language model.

Built from the enums rather than typed out, which is the point. A hand-written
prompt is a second copy of the taxonomy that drifts the first time somebody adds
a colour family, and it drifts silently: the model keeps answering, just never
with the new value. Generating it means the prompt is wrong only if the enum is.

The Persian labels live here rather than in `vocabulary.py` because they are a
different job — that file holds every word a shopper might *type*, this one
holds the single word the shop *says*. The model is given both: the label so its
`understood` lines read like the rest of the site, and the synonyms so it can
recognise what it is being asked.
"""

from decimal import Decimal
from enum import Enum

from app.models.enums import CarpetMaterial, CarpetPattern, ColorFamily, RoomType
from app.nlq.vocabulary import COLOR_WORDS, MATERIAL_WORDS, PATTERN_WORDS, ROOM_WORDS

COLOR_LABEL: dict[ColorFamily, str] = {
    ColorFamily.RED: "قرمز",
    ColorFamily.PINK: "صورتی",
    ColorFamily.ORANGE: "نارنجی",
    ColorFamily.GOLD: "طلایی",
    ColorFamily.CREAM: "نخودی",
    ColorFamily.BROWN: "قهوه‌ای",
    ColorFamily.GREEN: "سبز",
    ColorFamily.TURQUOISE: "فیروزه‌ای",
    ColorFamily.BLUE: "سرمه‌ای",
    ColorFamily.PURPLE: "بنفش",
    ColorFamily.GRAY: "طوسی",
    ColorFamily.BLACK: "مشکی",
    ColorFamily.WHITE: "سفید",
}

PATTERN_LABEL: dict[CarpetPattern, str] = {
    CarpetPattern.LACHAK_TORANJ: "لچک‌ترنج",
    CarpetPattern.AFSHAN: "افشان",
    CarpetPattern.MEDALLION: "ترنجی",
    CarpetPattern.GEOMETRIC: "هندسی",
    CarpetPattern.TRIBAL: "عشایری",
    CarpetPattern.FLORAL: "گل‌دار",
    CarpetPattern.MODERN: "مدرن",
    CarpetPattern.VINTAGE: "وینتیج",
    CarpetPattern.PLAIN: "ساده",
}

MATERIAL_LABEL: dict[CarpetMaterial, str] = {
    CarpetMaterial.WOOL: "پشم",
    CarpetMaterial.SILK: "ابریشم",
    CarpetMaterial.COTTON: "پنبه",
    CarpetMaterial.ACRYLIC: "اکریلیک",
    CarpetMaterial.POLYESTER: "پلی‌استر",
    CarpetMaterial.VISCOSE: "ویسکوز",
    CarpetMaterial.MIXED: "مخلوط",
}

ROOM_LABEL: dict[RoomType, str] = {
    RoomType.LIVING_ROOM: "پذیرایی",
    RoomType.BEDROOM: "اتاق خواب",
    RoomType.DINING_ROOM: "ناهارخوری",
    RoomType.OFFICE: "اتاق کار",
    RoomType.KIDS_ROOM: "اتاق کودک",
    RoomType.HALLWAY: "راهرو",
}

_LABELS: dict[type, dict] = {
    ColorFamily: COLOR_LABEL,
    CarpetPattern: PATTERN_LABEL,
    CarpetMaterial: MATERIAL_LABEL,
    RoomType: ROOM_LABEL,
}


def label_for(member: Enum) -> str:
    """The one Persian word the shop uses for an enum member."""
    return _LABELS[type(member)].get(member, str(member.value))


def _vocabulary_block(title: str, labels: dict, synonyms: dict) -> str:
    lines = [f"{title}:"]
    for member, label in labels.items():
        words = ", ".join(synonyms.get(member, ()))
        lines.append(
            f"- {member.value} = {label} ({words})" if words else f"- {member.value} = {label}"
        )
    return "\n".join(lines)


SYSTEM_PROMPT_HEADER = """\
تو مترجمِ جست‌وجوی یک فروشگاه فرش ایرانی هستی. کار تو **فقط** تبدیل جمله‌ی فارسی
کاربر به یک شیء JSON است. هیچ فرشی را نام نبر، هیچ قیمتی نگو، هیچ موجودی‌ای وعده
نده — پاسخ را خودِ فروشگاه از پایگاه داده می‌دهد.

قواعد:
1. فقط مقدارهای فهرست زیر مجازند. اگر چیزی در فهرست نیست، آن فیلد را خالی بگذار.
2. هرچه از جمله را نفهمیدی در فیلد `text` بگذار تا جست‌وجوی متنی رویش کار کند.
3. قیمت‌ها به **تومان** و عدد صحیح‌اند. «ده میلیون» یعنی 10000000.
4. اندازه‌ها به **سانتی‌متر**اند. «دو در سه» یعنی 200 و 300.
5. در `understood` برای هر تصمیم یک عبارت کوتاه فارسی بنویس، با همان برچسب‌هایی
   که در فهرست آمده — این عبارت‌ها به کاربر نشان داده می‌شوند تا اگر اشتباه
   فهمیدی بتواند اصلاح کند.
6. فقط JSON برگردان، بدون توضیح و بدون بلوک کد.
"""


def build_system_prompt(
    price_floor: Decimal | None = None, price_ceiling: Decimal | None = None
) -> str:
    """The full instruction, vocabulary included, for a chat completion."""
    parts = [
        SYSTEM_PROMPT_HEADER,
        _vocabulary_block("رنگ‌ها (color)", COLOR_LABEL, COLOR_WORDS),
        _vocabulary_block("نقش‌ها (pattern)", PATTERN_LABEL, PATTERN_WORDS),
        _vocabulary_block("جنس‌ها (material)", MATERIAL_LABEL, MATERIAL_WORDS),
        _vocabulary_block("اتاق‌ها (room)", ROOM_LABEL, ROOM_WORDS),
    ]
    if price_floor is not None and price_ceiling is not None:
        parts.append(
            "بازه‌ی قیمت واقعی فروشگاه: از "
            f"{int(price_floor)} تا {int(price_ceiling)} تومان. "
            "«ارزان» یعنی یک‌سوم پایین این بازه و «گران» یعنی یک‌سوم بالای آن."
        )
    parts.append(
        "شکل خروجی:\n"
        '{"color": [], "pattern": [], "material": [], "room": [], '
        '"min_price": null, "max_price": null, '
        '"min_width_cm": null, "max_width_cm": null, '
        '"min_length_cm": null, "max_length_cm": null, '
        '"text": null, "understood": []}'
    )
    return "\n\n".join(parts)
