"""The forty carpets the shop is going to be made of.

Written rather than scraped, and designed rather than sampled. The catalogue it
replaces came from a public dataset and an online shop, at whatever quality
those happened to have; this one is generated from photographs we ask for, which
means the only thing standing between the shop and an incoherent catalogue is
whether this list was thought about.

**Coverage is the point, not realism alone.** Every filter the storefront offers
has to be worth pressing: nine patterns, seven materials, thirteen colour
families and six rooms all have to appear, several times each, and no chip may
come back with one carpet in it. So the forty are laid out as a matrix and not
drawn at random — a random forty leaves two or three filters empty and nothing
in the code notices.

**What is authored here and what is not.** The intent is authored: what the
carpet is, where it is from, what it is woven of, which colours it should carry.
The *facts read off the photograph* are not — `colors` and `color_families` are
extracted at ingest by the same pipeline every other carpet goes through, so the
shop's colour filter describes the image it actually has rather than the image
we meant to ask for. When the two disagree, the disagreement is information.

**Prices are computed, not typed.** A rate per square metre per weave tier,
multiplied by area, nudged by a per-carpet factor derived from the slug so it is
varied but reproducible. That is what keeps the ladder honest: a silk Qom cannot
accidentally cost less than a machine-made runner, and the ratios survive
somebody asking about them in a defence.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from decimal import Decimal

from app.models.enums import CarpetMaterial, CarpetPattern, ColorFamily, RoomType

# --- prices -------------------------------------------------------------------

#: Toman per square metre, by weave tier. Anchored to the 1404–1405 Iranian
#: market: a 70-raj all-silk Qom قالیچه (1.5 × 2.25) lands near 210 million,
#: a 1200-shoulder machine-made شش‌متری near 13 million. The ratio between those
#: two — roughly thirty to one — is the fact worth preserving; the absolute
#: numbers age, and a note in the thesis says when they were set.
RATE_PER_SQM: dict[str, int] = {
    "silk_qom": 62_000_000,
    "silk_isfahan": 54_000_000,
    "kork_silk": 32_000_000,  # کرک و ابریشم — Nain, fine Isfahan
    "wool_fine": 18_000_000,  # Tabriz 50 raj, Kashan
    "wool_medium": 12_000_000,  # Mashhad, Kerman, Arak, Birjand
    "wool_village": 7_500_000,  # Hamedan, Ardabil
    "tribal": 9_000_000,  # Qashqai, Baluch — priced on rarity, not knot count
    "vintage": 11_000_000,
    "cotton_flat": 5_000_000,
    "machine_1500": 3_100_000,
    "machine_1200": 2_050_000,
    "machine_1000": 1_450_000,
    "machine_700": 850_000,
    "machine_viscose": 2_700_000,
}

#: Standard sizes as this market names them, in centimetres.
SIZE_SETS: dict[str, tuple[tuple[int, int], ...]] = {
    # A design offered across the whole range — the ones a shop builds on.
    "full": ((100, 150), (140, 200), (150, 225), (200, 300), (250, 350), (300, 400)),
    "standard": ((100, 150), (150, 225), (200, 300), (250, 350)),
    "large": ((200, 300), (250, 350), (300, 400)),
    "medium": ((140, 200), (150, 225), (200, 300)),
    "small": ((60, 90), (100, 150), (140, 200)),
    # کناره — the long narrow runner a hallway takes.
    "runner": ((80, 200), (80, 300), (80, 400)),
}


def _jitter(slug: str, low: float, high: float) -> float:
    """A stable pseudo-random factor for one carpet.

    Derived from the slug so the same catalogue is produced on every machine and
    every run — a price that moved between two ingests would make the shop look
    like it was haggling with itself.
    """
    digest = hashlib.sha256(slug.encode()).digest()
    unit = int.from_bytes(digest[:4], "big") / 0xFFFFFFFF
    return low + unit * (high - low)


def _stock(slug: str, index: int) -> int:
    """How many of this size are on the shelf.

    A few zeros are deliberate. Every size in stock makes a shop that has never
    sold anything, and it also means the sold-out path in the interface is never
    seen by anybody until a real customer finds it.
    """
    digest = hashlib.sha256(f"{slug}:{index}".encode()).digest()
    roll = digest[0] % 10
    return 0 if roll == 0 else roll


@dataclass(frozen=True)
class CarpetProfile:
    """One carpet, as everything downstream needs it.

    `colors` and `color_families` are absent on purpose — they are read off the
    photograph at ingest. What is here is what a photograph cannot say: where it
    was woven, what it is made of, and what it costs.
    """

    slug: str
    name: str
    description: str
    pattern: CarpetPattern
    material: CarpetMaterial
    rooms: tuple[RoomType, ...]
    origin: str
    #: True for دستباف. Drives the price tier and most of the prompt's language.
    handmade: bool
    #: رج for handmade, شانه for machine-made — the number this market judges by.
    density: str
    tier: str
    size_set: str
    #: The colours the photograph is *asked* for. Compared after ingest against
    #: what the pipeline actually read, which is how a wrong image is caught.
    lead_color: ColorFamily
    accent_colors: tuple[ColorFamily, ...]
    #: One clause of design detail, for the image prompt. Written in English
    #: because it is spoken to the image model, never to a shopper.
    motif: str
    #: Extra prompt notes when the default sentence would get it wrong.
    prompt_note: str = ""
    variants: tuple[tuple[int, int, Decimal, int], ...] = field(default_factory=tuple)

    @property
    def has_fringe(self) -> bool:
        """Whether this carpet ends in ریشه, the fringe at its two short ends.

        Derived rather than authored, because it follows from what the carpet
        already is. On a hand-knotted rug the fringe is not a trim: it is the
        warp itself, tied off where the weaving stops, so every one of them has
        it. A machine-woven carpet is cut from a roll and finished at the ends,
        and the mill adds a fringe only when the design is a traditional one —
        a modern or plain machine rug gets a bound edge instead, and a fringe on
        it would look like fancy dress.
        """
        return self.handmade or self.pattern not in {P.MODERN, P.PLAIN}


def _priced(profile: CarpetProfile) -> CarpetProfile:
    """Fill in the size ladder, priced from the tier and the area."""
    rate = RATE_PER_SQM[profile.tier]
    factor = _jitter(profile.slug, 0.88, 1.16)
    rows = []
    for index, (width, length) in enumerate(SIZE_SETS[profile.size_set]):
        area = (width * length) / 10_000
        raw = rate * area * factor
        # Rounded to a hundred thousand toman. Nobody prices a carpet to the
        # rial, and a price ending in 7,431 reads as a computed number, which
        # is exactly what it must not look like.
        price = Decimal(round(raw / 100_000) * 100_000)
        rows.append((width, length, price, _stock(profile.slug, index)))
    return CarpetProfile(**{**profile.__dict__, "variants": tuple(rows)})


# --- the forty ----------------------------------------------------------------

P = CarpetPattern
M = CarpetMaterial
R = RoomType
C = ColorFamily

_RAW: list[CarpetProfile] = [
    # ---- دستباف (16) ---------------------------------------------------------
    CarpetProfile(
        slug="qom-silk-lachak-sormei",
        name="فرش دستباف ابریشم قم — لچک‌ترنج زمینه سرمه‌ای",
        description=(
            "تمام‌ابریشم قم با ۷۰ رج، بافته‌شده روی چله‌ی ابریشم. زمینه‌ی سرمه‌ای "
            "عمیق با ترنج مرکزی نخودی و لچک‌های قرینه، و حاشیه‌ی باریکی که نقش را "
            "قاب می‌گیرد. زیر نور، ابریشم رنگ را از دو جهت متفاوت نشان می‌دهد."
        ),
        pattern=P.LACHAK_TORANJ,
        material=M.SILK,
        rooms=(R.LIVING_ROOM,),
        origin="قم",
        handmade=True,
        density="۷۰ رج",
        tier="silk_qom",
        size_set="medium",
        lead_color=C.BLUE,
        accent_colors=(C.CREAM, C.GOLD),
        motif=(
            "deep indigo field, ivory central medallion with fine curvilinear "
            "arabesques, symmetrical corner spandrels, narrow ivory-and-gold border"
        ),
    ),
    CarpetProfile(
        slug="qom-silk-afshan-firoozei",
        name="فرش دستباف ابریشم قم — افشان فیروزه‌ای",
        description=(
            "نقش افشان روی زمینه‌ی فیروزه‌ای؛ گل و بند بدون ترنج مرکزی در تمام "
            "سطح فرش پخش شده و چشم را جایی متوقف نمی‌کند. تمام‌ابریشم قم، ۶۰ رج."
        ),
        pattern=P.AFSHAN,
        material=M.SILK,
        rooms=(R.LIVING_ROOM,),
        origin="قم",
        handmade=True,
        density="۶۰ رج",
        tier="silk_qom",
        size_set="medium",
        lead_color=C.TURQUOISE,
        accent_colors=(C.CREAM, C.GOLD),
        motif=(
            "turquoise field with an all-over afshan scatter of flowering vines, "
            "no central medallion, ivory and soft gold blossoms"
        ),
    ),
    CarpetProfile(
        slug="esfahan-kork-lachak-kerem",
        name="فرش دستباف اصفهان — کرک و ابریشم، لچک‌ترنج نخودی",
        description=(
            "کرک مرغوب با گل‌های ابریشم، زمینه‌ی نخودی روشن و ترنج لاکی. "
            "برجستگی ابریشم روی کرک، نقش را در نور کم هم خوانا نگه می‌دارد."
        ),
        pattern=P.LACHAK_TORANJ,
        material=M.MIXED,
        rooms=(R.LIVING_ROOM, R.DINING_ROOM),
        origin="اصفهان",
        handmade=True,
        density="۵۵ رج",
        tier="kork_silk",
        size_set="standard",
        lead_color=C.CREAM,
        accent_colors=(C.RED, C.BLUE),
        motif=(
            "pale ivory field, lacquer-red medallion with silk highlights, "
            "indigo corner spandrels, dense floral tracery"
        ),
    ),
    CarpetProfile(
        slug="naeen-9la-afshan-sormei",
        name="فرش دستباف نایین ۹ لا — افشان سرمه‌ای",
        description=(
            "نایین نُه‌لا با گل ابریشم؛ زمینه‌ی سرمه‌ای و نقش افشان با غلبه‌ی "
            "سفید و آبی. نایین را از همین ترکیب کم‌رنگِ آرام می‌شناسند."
        ),
        pattern=P.AFSHAN,
        # کرک و ابریشم, like the Isfahan above it: the description says «با گل
        # ابریشم» and the price tier says `kork_silk`, so WOOL here was the odd
        # one out of three. It also left MIXED with a single carpet in it, and a
        # filter chip that returns one product is the thing §4.5 set out to
        # avoid.
        material=M.MIXED,
        rooms=(R.LIVING_ROOM, R.OFFICE),
        origin="نایین",
        handmade=True,
        density="۹ لا",
        tier="kork_silk",
        size_set="standard",
        lead_color=C.BLUE,
        accent_colors=(C.WHITE, C.CREAM),
        motif=(
            "navy field with an all-over afshan of white and pale blue vine work, "
            "silk-highlighted outlines, restrained palette"
        ),
    ),
    CarpetProfile(
        slug="tabriz-50raj-toranji-laki",
        name="فرش دستباف تبریز ۵۰ رج — ترنجی لاکی",
        description=(
            "تبریز پنجاه رج با ترنج مرکزی درشت و زمینه‌ی لاکی. بافت محکم و "
            "پرزِ کوتاه، همان‌طور که تبریز را می‌شناسند."
        ),
        pattern=P.MEDALLION,
        material=M.WOOL,
        rooms=(R.LIVING_ROOM,),
        origin="تبریز",
        handmade=True,
        density="۵۰ رج",
        tier="wool_fine",
        size_set="full",
        lead_color=C.RED,
        accent_colors=(C.BLUE, C.CREAM),
        motif=(
            "lacquer-red field, large navy-and-ivory central medallion, "
            "tight symmetrical floral field, short dense pile"
        ),
    ),
    CarpetProfile(
        slug="kashan-lachak-laki",
        name="فرش دستباف کاشان — لچک‌ترنج لاکی",
        description=(
            "کاشانِ کلاسیک: زمینه‌ی لاکی، ترنج سرمه‌ای و لچک‌های نخودی. "
            "همان فرشی که در ذهن بیشتر مردم تصویر «فرش ایرانی» است."
        ),
        pattern=P.LACHAK_TORANJ,
        material=M.WOOL,
        rooms=(R.LIVING_ROOM, R.DINING_ROOM),
        origin="کاشان",
        handmade=True,
        density="۴۰ رج",
        tier="wool_fine",
        size_set="full",
        lead_color=C.RED,
        accent_colors=(C.BLUE, C.CREAM),
        motif=(
            "classic Kashan: madder-red field, indigo medallion, ivory spandrels, "
            "palmette-and-vine field, wide main border"
        ),
    ),
    CarpetProfile(
        slug="mashhad-afshan-arghavani",
        name="فرش دستباف مشهد — افشان ارغوانی",
        description=(
            "مشهدِ ارغوانی با نقش افشان و گل‌های درشت. رنگ ارغوانی در فرش مشهد "
            "کهنه‌شدنی است و با گذر سال‌ها به گلبهی می‌نشیند."
        ),
        pattern=P.AFSHAN,
        material=M.WOOL,
        rooms=(R.LIVING_ROOM, R.BEDROOM),
        origin="مشهد",
        handmade=True,
        density="۴۰ رج",
        tier="wool_medium",
        size_set="full",
        lead_color=C.PINK,
        accent_colors=(C.RED, C.PURPLE),
        motif=(
            "magenta-plum field with large-scale afshan blossoms, navy outlines, "
            "generous open spacing between motifs"
        ),
    ),
    CarpetProfile(
        slug="kerman-golfarang-kerem",
        name="فرش دستباف کرمان — گل فرنگ زمینه نخودی",
        description=(
            "نقش گل فرنگ کرمان روی زمینه‌ی نخودی؛ دسته‌گل‌های رز به سبک اروپایی "
            "که کرمان در دوره‌ی قاجار وارد نقشه‌ی فرش ایرانی کرد."
        ),
        pattern=P.FLORAL,
        material=M.WOOL,
        rooms=(R.BEDROOM, R.LIVING_ROOM),
        origin="کرمان",
        handmade=True,
        density="۴۰ رج",
        tier="wool_medium",
        size_set="standard",
        lead_color=C.CREAM,
        accent_colors=(C.PINK, C.GREEN),
        motif=(
            "ivory field with European-style rose bouquets (gol farang), "
            "soft pink and sage green, scrolling leaf border"
        ),
    ),
    CarpetProfile(
        slug="arak-sultanabad-golfarang",
        name="فرش دستباف اراک — سلطان‌آباد گل‌دار",
        description=(
            "سلطان‌آباد با نقش گل‌دار درشت و رنگ‌های گیاهی. بافت روستایی و "
            "پرزِ بلندتر، مناسب فضایی که زیر پا زیاد راه می‌روند."
        ),
        pattern=P.FLORAL,
        material=M.WOOL,
        rooms=(R.DINING_ROOM, R.LIVING_ROOM),
        origin="اراک",
        handmade=True,
        density="۳۵ رج",
        tier="wool_medium",
        size_set="large",
        lead_color=C.RED,
        accent_colors=(C.BLUE, C.GOLD),
        motif=(
            "Sultanabad village weave: large-scale angular floral sprays, "
            "brick-red field, indigo and gold, long soft pile, vegetable dyes"
        ),
    ),
    CarpetProfile(
        slug="birjand-toranji-sabz",
        name="فرش دستباف بیرجند — ترنجی سبز",
        description=(
            "بیرجند با زمینه‌ی سبز زیتونی و ترنج نخودی. سبز در فرش دستباف کم‌یاب "
            "است و همین آن را برای فضایی که می‌خواهد متفاوت باشد انتخاب می‌کند."
        ),
        pattern=P.MEDALLION,
        material=M.WOOL,
        rooms=(R.OFFICE, R.LIVING_ROOM),
        origin="بیرجند",
        handmade=True,
        density="۴۰ رج",
        tier="wool_medium",
        size_set="standard",
        lead_color=C.GREEN,
        accent_colors=(C.CREAM, C.GOLD),
        motif=(
            "olive-green field, ivory central medallion, gold vine border, "
            "restrained and symmetrical"
        ),
    ),
    CarpetProfile(
        slug="qashqai-ashayeri-ghermez",
        name="گبه‌ی دستباف قشقایی — عشایری قرمز",
        description=(
            "بافت عشایری قشقایی؛ نقشی که از حفظ بافته می‌شود نه از روی نقشه، "
            "پس هیچ دو نیمه‌اش دقیقاً قرینه نیست. همین بی‌قرینگی امضای آن است."
        ),
        pattern=P.TRIBAL,
        material=M.WOOL,
        rooms=(R.LIVING_ROOM, R.BEDROOM),
        origin="شیراز — قشقایی",
        handmade=True,
        density="۳۰ رج",
        tier="tribal",
        size_set="medium",
        lead_color=C.RED,
        accent_colors=(C.ORANGE, C.BROWN),
        motif=(
            "Qashqai nomadic weave: brick-red ground, angular geometric medallions "
            "and stylised animals, slightly asymmetric, hand-spun wool"
        ),
        prompt_note="deliberately imperfect symmetry, as a nomadic weave from memory",
    ),
    CarpetProfile(
        slug="baluch-kenareh-ghahvei",
        name="کناره‌ی دستباف بلوچ — عشایری قهوه‌ای",
        description=(
            "کناره‌ی بلوچ با زمینه‌ی قهوه‌ای تیره و نقش هندسی ریز. باریک و بلند، "
            "برای راهرو یا کنار تخت."
        ),
        pattern=P.TRIBAL,
        material=M.WOOL,
        rooms=(R.HALLWAY, R.BEDROOM),
        origin="سیستان — بلوچ",
        handmade=True,
        density="۳۰ رج",
        tier="tribal",
        size_set="runner",
        lead_color=C.BROWN,
        accent_colors=(C.BLACK, C.RED),
        motif=(
            "Baluch nomadic runner: dark brown-black ground, small repeating geometric "
            "motifs, deep madder accents, dark tonal palette"
        ),
    ),
    CarpetProfile(
        slug="hamedan-hendesi-ghermez",
        name="فرش دستباف همدان — هندسی قرمز",
        description=(
            "همدان با نقش هندسی و بافت تک‌پود؛ محکم، ساده و بی‌ادعا. "
            "فرشی که برای کار کردن بافته شده نه برای قاب گرفتن."
        ),
        pattern=P.GEOMETRIC,
        material=M.WOOL,
        rooms=(R.OFFICE, R.HALLWAY),
        origin="همدان",
        handmade=True,
        density="۳۰ رج",
        tier="wool_village",
        size_set="medium",
        lead_color=C.RED,
        accent_colors=(C.GRAY, C.CREAM),
        motif=(
            "Hamedan village rug: rust-red field, bold angular geometric lattice, "
            "single-weft coarse weave, camel and ivory accents"
        ),
    ),
    CarpetProfile(
        slug="ardabil-hendesi-abi",
        name="فرش دستباف اردبیل — هندسی آبی",
        description=(
            "اردبیل با نقش هندسی آبی و سفید و بافت شمال‌غربی. خطوط شکسته و "
            "رنگ‌بندی سردی که در اتاق خواب آرام می‌نشیند."
        ),
        pattern=P.GEOMETRIC,
        material=M.WOOL,
        rooms=(R.BEDROOM, R.OFFICE),
        origin="اردبیل",
        handmade=True,
        density="۳۵ رج",
        tier="wool_village",
        size_set="medium",
        lead_color=C.BLUE,
        accent_colors=(C.WHITE, C.GRAY),
        motif=(
            "north-west Persian geometric: blue and white stepped lattice, "
            "crisp angular medallions, cool restrained palette"
        ),
    ),
    CarpetProfile(
        slug="tabriz-patineh-vintage-tousi",
        name="فرش دستباف تبریز — پتینه‌ی طوسی",
        description=(
            "فرش دستباف تبریز که رنگ‌برداری و پتینه شده؛ نقش زیر لایه‌ای از "
            "خاکستری محو می‌شود و فرش قدیمی‌تر از سنش به نظر می‌رسد."
        ),
        pattern=P.VINTAGE,
        material=M.WOOL,
        rooms=(R.LIVING_ROOM, R.OFFICE),
        origin="تبریز",
        handmade=True,
        density="۴۰ رج",
        tier="vintage",
        size_set="standard",
        lead_color=C.GRAY,
        accent_colors=(C.PINK, C.PURPLE),
        motif=(
            "overdyed patina rug: classical Persian medallion faded under a wash "
            "of soft grey, muted rose and bone showing through, worn low pile"
        ),
    ),
    CarpetProfile(
        slug="yazd-sadeh-nokhodi",
        name="فرش دستباف یزد — ساده‌ی نخودی",
        description=(
            "زمینه‌ی یک‌دستِ نخودی با حاشیه‌ی باریک و بافت پنبه‌ای. برای فضایی "
            "که خودش پُر است و فرش باید ساکت بماند."
        ),
        pattern=P.PLAIN,
        material=M.COTTON,
        rooms=(R.BEDROOM, R.OFFICE),
        origin="یزد",
        handmade=True,
        density="۳۰ رج",
        tier="cotton_flat",
        size_set="standard",
        lead_color=C.CREAM,
        accent_colors=(C.WHITE,),
        motif=(
            "undyed ivory flat field with a single narrow woven border, "
            "visible cotton texture, no medallion, minimal"
        ),
    ),
    # ---- ماشینی (24) ---------------------------------------------------------
    CarpetProfile(
        slug="kashan-1200-lachak-sormei",
        name="فرش ماشینی کاشان ۱۲۰۰ شانه — لچک‌ترنج سرمه‌ای",
        description=(
            "۱۲۰۰ شانه با تراکم ۳۶۰۰، اکریلیک هیت‌ست. لچک‌ترنج کلاسیک روی زمینه‌ی "
            "سرمه‌ای؛ پرکاربردترین ترکیب فرش ماشینی ایرانی."
        ),
        pattern=P.LACHAK_TORANJ,
        material=M.ACRYLIC,
        rooms=(R.LIVING_ROOM, R.DINING_ROOM),
        origin="کاشان",
        handmade=False,
        density="۱۲۰۰ شانه",
        tier="machine_1200",
        size_set="full",
        lead_color=C.BLUE,
        accent_colors=(C.CREAM, C.RED),
        motif=(
            "navy field, ivory medallion and corner spandrels, dense classical "
            "floral tracery, crisp machine-woven definition"
        ),
    ),
    CarpetProfile(
        slug="kashan-1200-afshan-talaei",
        name="فرش ماشینی کاشان ۱۲۰۰ شانه — افشان طلایی",
        description=(
            "زمینه‌ی طلایی گرم با نقش افشان و بدون ترنج مرکزی. زیر نور مصنوعی "
            "طلایی‌تر و زیر نور روز به نخودی نزدیک می‌شود."
        ),
        pattern=P.AFSHAN,
        material=M.ACRYLIC,
        rooms=(R.LIVING_ROOM,),
        origin="کاشان",
        handmade=False,
        density="۱۲۰۰ شانه",
        tier="machine_1200",
        size_set="full",
        lead_color=C.GOLD,
        accent_colors=(C.CREAM, C.BROWN),
        motif=(
            "warm gold field with all-over afshan vine scatter, no medallion, "
            "bronze and cream tones"
        ),
    ),
    CarpetProfile(
        slug="kashan-1500-lachak-firoozei",
        name="فرش ماشینی کاشان ۱۵۰۰ شانه — لچک‌ترنج فیروزه‌ای",
        description=(
            "۱۵۰۰ شانه با تراکم ۴۵۰۰؛ خط نقش تیزتر از ۱۲۰۰ شانه است و از "
            "فاصله‌ی نزدیک هم پیکسلی به نظر نمی‌رسد. زمینه‌ی فیروزه‌ای."
        ),
        pattern=P.LACHAK_TORANJ,
        material=M.ACRYLIC,
        rooms=(R.LIVING_ROOM,),
        origin="کاشان",
        handmade=False,
        density="۱۵۰۰ شانه",
        tier="machine_1500",
        size_set="large",
        lead_color=C.TURQUOISE,
        accent_colors=(C.CREAM, C.GOLD),
        motif=(
            "turquoise field, ivory medallion with gold outline, very fine "
            "machine-woven detail, classical spandrels"
        ),
    ),
    CarpetProfile(
        slug="aran-1000-toranji-laki",
        name="فرش ماشینی آران و بیدگل ۱۰۰۰ شانه — ترنجی لاکی",
        description=(
            "هزار شانه با ترنج درشت و زمینه‌ی لاکی. انتخاب متعارف پذیرایی‌های "
            "بزرگ که فرش باید فضا را پر کند."
        ),
        pattern=P.MEDALLION,
        material=M.POLYESTER,
        rooms=(R.LIVING_ROOM, R.DINING_ROOM),
        origin="آران و بیدگل",
        handmade=False,
        density="۱۰۰۰ شانه",
        tier="machine_1000",
        size_set="full",
        lead_color=C.RED,
        accent_colors=(C.BLUE, C.CREAM),
        motif=(
            "lacquer-red field, large navy medallion, ivory border, "
            "traditional machine-woven Persian layout"
        ),
    ),
    CarpetProfile(
        slug="aran-700-goldar-laki",
        name="فرش ماشینی آران و بیدگل ۷۰۰ شانه — گل‌دار لاکی",
        description=(
            "هفتصد شانه، اقتصادی و سبک. نقش گل‌دار درشت که از فاصله‌ی معمول "
            "اتاق خواب کاملاً خوانا است."
        ),
        pattern=P.FLORAL,
        material=M.POLYESTER,
        rooms=(R.BEDROOM, R.KIDS_ROOM),
        origin="آران و بیدگل",
        handmade=False,
        density="۷۰۰ شانه",
        tier="machine_700",
        size_set="medium",
        lead_color=C.RED,
        accent_colors=(C.CREAM, C.GREEN),
        motif=(
            "red field with large simple floral repeat, cream border, "
            "lower-density machine weave, softer motif edges"
        ),
    ),
    CarpetProfile(
        slug="kashan-1200-goldar-surati",
        name="فرش ماشینی کاشان ۱۲۰۰ شانه — گل‌دار صورتی",
        description=(
            "زمینه‌ی صورتی کم‌رنگ با دسته‌گل‌های ریز. برای اتاق خوابی که "
            "می‌خواهد روشن و آرام بماند."
        ),
        pattern=P.FLORAL,
        material=M.ACRYLIC,
        rooms=(R.BEDROOM,),
        origin="کاشان",
        handmade=False,
        density="۱۲۰۰ شانه",
        tier="machine_1200",
        size_set="medium",
        lead_color=C.PINK,
        accent_colors=(C.CREAM, C.GREEN),
        motif=(
            "dusty pink field, small scattered rose bouquets, ivory border, "
            "light and airy"
        ),
    ),
    CarpetProfile(
        slug="mashhad-modern-tousi",
        name="فرش ماشینی مشهد — مدرن طوسی",
        description=(
            "طرح مدرن با خطوط محو و رنگ‌بندی طوسی و سفید. بدون حاشیه‌ی سنتی، "
            "برای فضایی که مبلمانش امروزی است."
        ),
        pattern=P.MODERN,
        material=M.POLYESTER,
        rooms=(R.LIVING_ROOM, R.OFFICE),
        origin="مشهد",
        handmade=False,
        density="۱۰۰۰ شانه",
        tier="machine_1000",
        size_set="large",
        lead_color=C.GRAY,
        accent_colors=(C.WHITE, C.CREAM),
        motif=(
            "modern abstract: soft grey and white blurred bands, no traditional "
            "border, low-contrast contemporary design"
        ),
    ),
    CarpetProfile(
        slug="kashan-1500-modern-abi",
        name="فرش ماشینی کاشان ۱۵۰۰ شانه — مدرن آبی‌خاکستری",
        description=(
            "ویسکوز با درخشش ملایم و طرح مدرن آبی‌خاکستری. سطحی که با زاویه‌ی "
            "دید رنگش کمی عوض می‌شود."
        ),
        pattern=P.MODERN,
        material=M.VISCOSE,
        rooms=(R.OFFICE, R.LIVING_ROOM),
        origin="کاشان",
        handmade=False,
        density="۱۵۰۰ شانه",
        tier="machine_viscose",
        size_set="standard",
        lead_color=C.GRAY,
        accent_colors=(C.BLUE, C.WHITE),
        motif=(
            "contemporary abstract in slate blue and grey, viscose sheen, "
            "soft gradient wash, no border"
        ),
    ),
    CarpetProfile(
        slug="aran-modern-meshki",
        name="فرش ماشینی آران و بیدگل — مدرن مشکی",
        description=(
            "زمینه‌ی مشکی با نقش هندسی ریز سفید. تیره‌ترین فرش کاتالوگ و "
            "مناسب اتاق کاری که دیوارهایش روشن است."
        ),
        pattern=P.MODERN,
        material=M.POLYESTER,
        rooms=(R.OFFICE,),
        origin="آران و بیدگل",
        handmade=False,
        density="۱۰۰۰ شانه",
        tier="machine_1000",
        size_set="medium",
        lead_color=C.BLACK,
        accent_colors=(C.GRAY, C.WHITE),
        motif=(
            "near-black field with fine white geometric line work, "
            "high contrast, contemporary, no traditional border"
        ),
    ),
    CarpetProfile(
        slug="kashan-modern-sefid",
        name="فرش ماشینی کاشان — مدرن سفید",
        description=(
            "سفید شکسته با بافت برجسته‌ی هندسی. رنگ ندارد، سایه دارد — نقش "
            "فقط از اختلاف ارتفاع پرز دیده می‌شود."
        ),
        pattern=P.MODERN,
        material=M.VISCOSE,
        rooms=(R.BEDROOM, R.LIVING_ROOM),
        origin="کاشان",
        handmade=False,
        density="۱۲۰۰ شانه",
        tier="machine_viscose",
        size_set="medium",
        lead_color=C.WHITE,
        accent_colors=(C.CREAM,),
        motif=(
            "off-white carved-pile rug: pattern readable only as relief and "
            "shadow, tonal, no colour contrast"
        ),
    ),
    CarpetProfile(
        slug="kashan-sadeh-nokhodi",
        name="فرش ماشینی کاشان — ساده‌ی نخودی",
        description=(
            "تک‌رنگ نخودی بدون هیچ نقشی. ساده‌ترین گزینه‌ی کاتالوگ و "
            "بی‌خطرترین برای اتاقی که هنوز چیده نشده."
        ),
        pattern=P.PLAIN,
        material=M.VISCOSE,
        rooms=(R.LIVING_ROOM, R.BEDROOM),
        origin="کاشان",
        handmade=False,
        density="۱۲۰۰ شانه",
        tier="machine_viscose",
        size_set="full",
        lead_color=C.CREAM,
        accent_colors=(C.WHITE,),
        motif="completely plain solid ivory pile, no pattern, no border, even colour",
    ),
    CarpetProfile(
        slug="aran-sadeh-tousi",
        name="فرش ماشینی آران و بیدگل — ساده‌ی طوسی",
        description="تک‌رنگ طوسی متوسط، بدون نقش و بدون حاشیه.",
        pattern=P.PLAIN,
        material=M.POLYESTER,
        rooms=(R.BEDROOM, R.OFFICE),
        origin="آران و بیدگل",
        handmade=False,
        density="۷۰۰ شانه",
        tier="machine_700",
        size_set="standard",
        lead_color=C.GRAY,
        accent_colors=(),
        motif="completely plain solid mid-grey pile, no pattern, even colour",
    ),
    CarpetProfile(
        slug="kashan-sadeh-sabz",
        name="فرش ماشینی کاشان — ساده‌ی سبز زیتونی",
        description=(
            "تک‌رنگ سبز زیتونی. سبز در کاتالوگ کم است و این یکی برای فضایی "
            "است که عمداً دنبال رنگ می‌گردد."
        ),
        pattern=P.PLAIN,
        material=M.ACRYLIC,
        rooms=(R.LIVING_ROOM, R.OFFICE),
        origin="کاشان",
        handmade=False,
        density="۱۲۰۰ شانه",
        tier="machine_1200",
        size_set="medium",
        lead_color=C.GREEN,
        accent_colors=(),
        motif="completely plain solid olive-green pile, no pattern, even colour",
    ),
    CarpetProfile(
        slug="mashhad-vintage-narenji",
        name="فرش ماشینی مشهد — وینتیج نارنجی",
        description=(
            "طرح وینتیج با رنگ‌های سوخته‌ی نارنجی و قهوه‌ای؛ نقش عمداً "
            "ساییده چاپ شده تا فرش قدیمی به نظر برسد."
        ),
        pattern=P.VINTAGE,
        material=M.POLYESTER,
        rooms=(R.LIVING_ROOM,),
        origin="مشهد",
        handmade=False,
        density="۱۰۰۰ شانه",
        tier="machine_1000",
        size_set="standard",
        lead_color=C.ORANGE,
        accent_colors=(C.BROWN, C.CREAM),
        motif=(
            "distressed vintage print: burnt orange and rust, deliberately worn "
            "and faded pattern, low contrast"
        ),
    ),
    CarpetProfile(
        slug="kashan-vintage-abi",
        name="فرش ماشینی کاشان — وینتیج آبی",
        description="وینتیج آبی محو با حاشیه‌ی رنگ‌رفته و نقش کهنه‌نما.",
        pattern=P.VINTAGE,
        material=M.ACRYLIC,
        rooms=(R.LIVING_ROOM, R.BEDROOM),
        origin="کاشان",
        handmade=False,
        density="۱۲۰۰ شانه",
        tier="machine_1200",
        size_set="standard",
        lead_color=C.BLUE,
        accent_colors=(C.CREAM, C.GRAY),
        motif=(
            "faded vintage blue: washed-out classical pattern, distressed border, "
            "muted and dusty"
        ),
    ),
    CarpetProfile(
        slug="aran-hendesi-meshki-sefid",
        name="فرش ماشینی آران و بیدگل — هندسی مشکی و سفید",
        description="نقش هندسی پرکنتراست مشکی و سفید، بدون حاشیه‌ی سنتی.",
        pattern=P.GEOMETRIC,
        material=M.POLYESTER,
        rooms=(R.OFFICE, R.HALLWAY),
        origin="آران و بیدگل",
        handmade=False,
        density="۱۰۰۰ شانه",
        tier="machine_1000",
        size_set="medium",
        lead_color=C.BLACK,
        accent_colors=(C.WHITE, C.GRAY),
        motif=(
            "bold black and white geometric repeat, sharp edges, "
            "high contrast, contemporary"
        ),
    ),
    CarpetProfile(
        slug="kashan-hendesi-banafsh",
        name="فرش ماشینی کاشان — هندسی بنفش",
        description=(
            "هندسی بنفش و طوسی؛ تنها فرش بنفش کاتالوگ و انتخابی برای "
            "اتاق کودکی که نمی‌خواهد صورتی باشد."
        ),
        pattern=P.GEOMETRIC,
        material=M.ACRYLIC,
        rooms=(R.KIDS_ROOM, R.BEDROOM),
        origin="کاشان",
        handmade=False,
        density="۱۲۰۰ شانه",
        tier="machine_1200",
        size_set="small",
        lead_color=C.PURPLE,
        accent_colors=(C.GRAY, C.WHITE),
        motif=(
            "violet and grey geometric blocks, playful but not childish, "
            "clean modern lines"
        ),
    ),
    CarpetProfile(
        slug="kashan-kodak-firoozei",
        name="فرش ماشینی کاشان — اتاق کودک فیروزه‌ای",
        description=(
            "فیروزه‌ای روشن با نقش ساده‌ی هندسی و پرز نرم. برای اتاق کودک، "
            "با رنگی که سریع خسته‌کننده نمی‌شود."
        ),
        pattern=P.MODERN,
        material=M.POLYESTER,
        rooms=(R.KIDS_ROOM,),
        origin="کاشان",
        handmade=False,
        density="۱۰۰۰ شانه",
        tier="machine_1000",
        size_set="small",
        lead_color=C.TURQUOISE,
        accent_colors=(C.WHITE, C.GOLD),
        motif=(
            "bright turquoise with simple rounded geometric shapes, "
            "soft high pile, cheerful but not cartoonish"
        ),
    ),
    CarpetProfile(
        slug="aran-kodak-surati",
        name="فرش ماشینی آران و بیدگل — اتاق کودک صورتی",
        description="صورتی روشن با نقش ابری نرم و پرز بلند، مخصوص اتاق کودک.",
        pattern=P.MODERN,
        material=M.POLYESTER,
        rooms=(R.KIDS_ROOM,),
        origin="آران و بیدگل",
        handmade=False,
        density="۷۰۰ شانه",
        tier="machine_700",
        size_set="small",
        lead_color=C.PINK,
        accent_colors=(C.WHITE,),
        motif=(
            "soft pink with cloud-like abstract shapes in white, "
            "long plush pile, gentle"
        ),
    ),
    CarpetProfile(
        slug="kashan-kenareh-afshan-sormei",
        name="کناره‌ی ماشینی کاشان ۱۲۰۰ شانه — افشان سرمه‌ای",
        description=(
            "کناره‌ی سرمه‌ای با نقش افشان، در سه طول. برای راهروی بلند که "
            "یک فرش معمولی در آن جا نمی‌شود."
        ),
        pattern=P.AFSHAN,
        material=M.ACRYLIC,
        rooms=(R.HALLWAY,),
        origin="کاشان",
        handmade=False,
        density="۱۲۰۰ شانه",
        tier="machine_1200",
        size_set="runner",
        lead_color=C.BLUE,
        accent_colors=(C.RED, C.CREAM),
        motif=(
            "narrow navy runner with continuous afshan vine pattern along its "
            "length, red and ivory accents"
        ),
    ),
    CarpetProfile(
        slug="aran-kenareh-hendesi-ghahvei",
        name="کناره‌ی ماشینی آران و بیدگل — هندسی قهوه‌ای",
        description="کناره‌ی قهوه‌ای با نقش هندسی تکرارشونده و بافت متراکم.",
        pattern=P.GEOMETRIC,
        material=M.POLYESTER,
        rooms=(R.HALLWAY, R.OFFICE),
        origin="آران و بیدگل",
        handmade=False,
        density="۱۰۰۰ شانه",
        tier="machine_1000",
        size_set="runner",
        lead_color=C.BROWN,
        accent_colors=(C.CREAM, C.GOLD),
        motif=(
            "brown runner with repeating angular geometric bands, "
            "cream and gold accents, dense weave"
        ),
    ),
    CarpetProfile(
        slug="kashan-naharkhori-lachak-ghermez",
        name="فرش ماشینی کاشان — لچک‌ترنج قرمز ناهارخوری",
        description=(
            "لچک‌ترنج قرمز و طلایی در اندازه‌های بزرگ. زیر میز ناهارخوری، "
            "نقش شلوغ لکه‌ها را کمتر نشان می‌دهد."
        ),
        pattern=P.LACHAK_TORANJ,
        material=M.ACRYLIC,
        rooms=(R.DINING_ROOM, R.LIVING_ROOM),
        origin="کاشان",
        handmade=False,
        density="۱۲۰۰ شانه",
        tier="machine_1200",
        size_set="large",
        lead_color=C.RED,
        accent_colors=(C.GOLD, C.CREAM),
        motif=(
            "red field, gold medallion and spandrels, busy classical floral "
            "field that hides marks"
        ),
    ),
    CarpetProfile(
        slug="mashhad-naharkhori-modern-ghahvei",
        name="فرش ماشینی مشهد — مدرن قهوه‌ای ناهارخوری",
        description=(
            "طرح مدرن قهوه‌ای و طلایی با پرز کوتاه. پرز کوتاه زیر صندلی "
            "ناهارخوری کمتر گیر می‌کند."
        ),
        pattern=P.MODERN,
        material=M.VISCOSE,
        rooms=(R.DINING_ROOM,),
        origin="مشهد",
        handmade=False,
        density="۱۲۰۰ شانه",
        tier="machine_viscose",
        size_set="large",
        lead_color=C.BROWN,
        accent_colors=(C.GOLD, C.CREAM),
        motif=(
            "contemporary brown and gold abstract, very short pile, "
            "subtle sheen, no traditional border"
        ),
    ),
    CarpetProfile(
        slug="kashan-padari-ashayeri-narenji",
        name="پادری ماشینی کاشان — عشایری نارنجی",
        description=(
            "پادری کوچک با نقش عشایری نارنجی و قرمز. جلوی در ورودی یا "
            "کنار آشپزخانه."
        ),
        pattern=P.TRIBAL,
        material=M.POLYESTER,
        rooms=(R.HALLWAY, R.KIDS_ROOM),
        origin="کاشان",
        handmade=False,
        density="۷۰۰ شانه",
        tier="machine_700",
        size_set="small",
        lead_color=C.ORANGE,
        accent_colors=(C.RED, C.BROWN),
        motif=(
            "small doormat-sized rug with tribal Qashqai-style geometric motifs, "
            "burnt orange and madder red"
        ),
    ),
]

#: The catalogue, with every size priced. Import this, not `_RAW`.
PROFILES: list[CarpetProfile] = [_priced(profile) for profile in _RAW]

CATALOGUE_SIZE = len(PROFILES)
