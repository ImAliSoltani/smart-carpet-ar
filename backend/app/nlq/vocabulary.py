"""The Persian words a shopper uses for the things the catalogue enumerates.

Separate from the storefront's `taxonomy.ts`, and deliberately so: that file
holds **one** label per member, because a chip shows one word. This holds every
word somebody might *type* for the same member, which is a different list and a
longer one — «سرمه‌ای», «آبی تیره», «نفتی» and «لاجوردی» all mean the same
filter, and a shopper who writes any of them means it.

Only Persian is listed. The shop is Persian and the query box is Persian; a
Latin synonym table would be a guess about a visitor who has not appeared.

Every table is keyed by the enum member, so adding a colour family to
`app.models.enums` and forgetting to add its words here fails loudly in the
test that walks the enums rather than silently dropping the word.
"""

from app.models.enums import CarpetMaterial, CarpetPattern, ColorFamily, RoomType

# Longer phrases must be listed before the shorter ones they contain — «آبی
# تیره» before «آبی» — because the matcher takes the first hit and would
# otherwise file a navy query under turquoise.
COLOR_WORDS: dict[ColorFamily, tuple[str, ...]] = {
    ColorFamily.BLUE: ("سرمه‌ای", "سرمه ای", "لاجوردی", "نفتی", "آبی تیره", "آبی"),
    ColorFamily.TURQUOISE: ("فیروزه‌ای", "فیروزه ای", "فیروزه", "آبی روشن", "سبزآبی"),
    ColorFamily.RED: ("قرمز", "سرخ", "لاکی", "زرشکی", "عنابی", "آلبالویی"),
    ColorFamily.PINK: ("صورتی", "گلبهی", "بنفش سرخ", "ارغوانی"),
    ColorFamily.ORANGE: ("نارنجی", "پرتقالی", "آجری", "تراکوتا"),
    ColorFamily.GOLD: ("طلایی", "طلائی", "زرد", "خردلی", "عسلی"),
    ColorFamily.CREAM: ("نخودی", "کرم", "کرمی", "بژ", "شیری", "استخوانی", "شتری"),
    ColorFamily.BROWN: ("قهوه‌ای", "قهوه ای", "قهوهای", "دارچینی", "کاکائویی"),
    ColorFamily.GREEN: ("سبز", "زیتونی", "یشمی"),
    ColorFamily.PURPLE: ("بنفش", "یاسی", "ارکیده"),
    ColorFamily.GRAY: ("طوسی", "خاکستری", "دودی", "نقره‌ای", "نقره ای"),
    ColorFamily.BLACK: ("مشکی", "سیاه", "ذغالی", "زغالی"),
    ColorFamily.WHITE: ("سفید", "شیری روشن", "برفی"),
}

PATTERN_WORDS: dict[CarpetPattern, tuple[str, ...]] = {
    CarpetPattern.LACHAK_TORANJ: ("لچک ترنج", "لچک‌ترنج", "لچک و ترنج", "لچک"),
    CarpetPattern.AFSHAN: ("افشان",),
    CarpetPattern.MEDALLION: ("ترنجی", "ترنج دار", "ترنج‌دار", "مدالیون"),
    CarpetPattern.GEOMETRIC: ("هندسی", "خطی", "شکسته"),
    CarpetPattern.TRIBAL: ("عشایری", "ایلیاتی", "قشقایی", "بختیاری", "گبه"),
    CarpetPattern.FLORAL: ("گل دار", "گل‌دار", "گلدار", "گل و بوته", "بوته"),
    CarpetPattern.MODERN: ("مدرن", "امروزی", "فانتزی", "مینیمال"),
    CarpetPattern.VINTAGE: ("وینتیج", "وینتج", "کهنه نما", "کهنه‌نما", "پتینه"),
    CarpetPattern.PLAIN: ("ساده", "بدون نقش", "تک رنگ", "تک‌رنگ"),
}

MATERIAL_WORDS: dict[CarpetMaterial, tuple[str, ...]] = {
    CarpetMaterial.SILK: ("ابریشم", "ابریشمی"),
    CarpetMaterial.WOOL: ("پشم", "پشمی", "کرک"),
    CarpetMaterial.COTTON: ("پنبه", "پنبه‌ای", "پنبه ای", "نخی"),
    CarpetMaterial.ACRYLIC: ("اکریلیک", "اکرولیک"),
    CarpetMaterial.POLYESTER: ("پلی استر", "پلی‌استر", "پلیستر"),
    CarpetMaterial.VISCOSE: ("ویسکوز", "ویسکون"),
    CarpetMaterial.MIXED: ("مخلوط", "ترکیبی"),
}

ROOM_WORDS: dict[RoomType, tuple[str, ...]] = {
    RoomType.LIVING_ROOM: ("پذیرایی", "نشیمن", "هال", "سالن", "مهمان"),
    RoomType.BEDROOM: ("اتاق خواب", "خواب", "اتاقخواب"),
    RoomType.DINING_ROOM: ("ناهارخوری", "نهارخوری", "غذاخوری", "میز ناهار"),
    RoomType.OFFICE: ("اتاق کار", "دفتر", "کار", "مطالعه"),
    RoomType.KIDS_ROOM: ("اتاق کودک", "کودک", "بچه", "نوزاد", "اتاق بچه"),
    RoomType.HALLWAY: ("راهرو", "راه رو", "ورودی", "کریدور"),
}

#: «روشن» and «تیره» are about a whole group of colours rather than one, and
#: they are among the commonest things a shopper says. Mapped to families rather
#: than to a brightness axis the catalogue does not have.
LIGHTNESS_WORDS: dict[str, tuple[ColorFamily, ...]] = {
    "روشن": (ColorFamily.CREAM, ColorFamily.WHITE, ColorFamily.GOLD, ColorFamily.TURQUOISE),
    "کم رنگ": (ColorFamily.CREAM, ColorFamily.WHITE),
    "کم‌رنگ": (ColorFamily.CREAM, ColorFamily.WHITE),
    "تیره": (ColorFamily.BLUE, ColorFamily.BROWN, ColorFamily.BLACK, ColorFamily.GREEN),
    "پررنگ": (ColorFamily.RED, ColorFamily.BLUE, ColorFamily.GREEN),
    "پر رنگ": (ColorFamily.RED, ColorFamily.BLUE, ColorFamily.GREEN),
}

#: Words that put a bound *below* a price, and words that put one above it.
PRICE_UNDER = ("تا", "زیر", "کمتر از", "حداکثر", "ارزان‌تر از", "ارزانتر از", "پایین‌تر از")
PRICE_OVER = ("از", "بالای", "بیشتر از", "حداقل", "گران‌تر از", "گرانتر از", "بالاتر از")

#: Multipliers, so «ده میلیون» and «۵۰۰ هزار» both become toman.
SCALE_WORDS: dict[str, int] = {
    "میلیون": 1_000_000,
    "ملیون": 1_000_000,
    "میلیارد": 1_000_000_000,
    "هزار": 1_000,
}

#: Spelled-out numbers, for «ده میلیون» and «دو در سه». Only as far as anyone
#: writes a carpet price or size in words.
NUMBER_WORDS: dict[str, int] = {
    "یک": 1, "دو": 2, "سه": 3, "چهار": 4, "پنج": 5,
    "شش": 6, "هفت": 7, "هشت": 8, "نه": 9, "ده": 10,
    "یازده": 11, "دوازده": 12, "پانزده": 15, "بیست": 20,
    "بیست و پنج": 25, "سی": 30, "چهل": 40, "پنجاه": 50,
    "شصت": 60, "هفتاد": 70, "هشتاد": 80, "نود": 90, "صد": 100,
}

#: What the shop calls the *cheap* and *expensive* ends when no number is given.
#: Resolved against the catalogue's real price range at parse time, so «فرش
#: ارزان» means cheap in this shop rather than cheap in the abstract.
CHEAP_WORDS = ("ارزان", "ارزون", "اقتصادی", "کم هزینه", "کم‌هزینه", "مقرون به صرفه")
EXPENSIVE_WORDS = ("گران", "گرون", "لاکچری", "نفیس", "فاخر", "اعلا", "درجه یک")
