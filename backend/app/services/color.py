"""Colour as something the shop can search and filter by.

Two problems in the roadmap turn out to be one problem, and this module is the
one answer to both:

- **Visual search ignores colour** (§7). DINOv2 reads a carpet's *structure*
  extremely well — it separates لچک‌ترنج from افشان — but it is close to
  colour-blind, so a green carpet returns structurally identical red ones. The
  fix is a colour descriptor that re-ranks what the embedding proposed.
- **The colour filter does not work** (§3). `Carpet.colors` holds exact hex
  values read off each photograph, so they are very nearly unique: bucketing
  the catalogue by colour gives twenty-four buckets holding one carpet each.
  The fix is bucketing colour into families a shopper would name out loud.

Both need the same thing — pixels described by *where they sit in colour space*
rather than by their exact triple — so both are computed in a single pass here.
The histogram is the continuous form of that description and the families are
its coarse, nameable form; deriving the second from the first is what keeps
them from disagreeing, which two separate implementations eventually would.

**Why HSV and not RGB.** The question a shopper asks is "is this carpet red?",
and in RGB that question has no axis: dark red, the lacquer red of a Kashan
ground, and dusty rose are far apart in RGB and adjacent in hue. HSV puts the
nameable part of colour (hue) on its own axis, which is what makes both the
histogram bins and the family thresholds below writable at all.
"""

from dataclasses import dataclass

from PIL import Image

from app.models.enums import ColorFamily

# The image is reduced to this before counting. Colour is a bulk property — the
# question is what share of the carpet is blue, not which pixel — so the same
# 150×150 reduction `extract_dominant_colors` already uses is plenty, and it
# keeps a backfill over the whole catalogue to seconds rather than minutes.
SAMPLE_EDGE = 150

# Saturation, and saturation only, decides whether a pixel has a hue — which is
# what saturation means. Worth stating because the obvious extra guard is wrong:
# a floor on *value* beside it looks like prudence and quietly destroys the navy
# grounds. A سرمه‌ای field photographed under warm shop light sits near v≈0.15,
# so any value floor above that files it as black, hands the carpet to whatever
# its border happens to be, and six navy carpets came back labelled red, brown
# or cream. Darkness is not absence of colour; only desaturation is.
MIN_SATURATION = 0.12
# The one exception, and it is about the sensor rather than about colour: below
# this there is no image left to read a hue from. JPEG noise in the shadows has
# a hue, and it is not the carpet's.
BLACK_CEILING = 0.08

# Only pixels this opaque are counted. Catalogue photographs are cut out from
# their backdrop, so the transparent margin is not part of the carpet; counting
# it would report the *discarded* backdrop as one of the carpet's colours. Same
# threshold as `extract_dominant_colors`, deliberately.
MIN_ALPHA = 200

HUE_BINS = 12  # 30° each
VALUE_BINS = 3  # dark / mid / light, within a hue
ACHROMATIC_BINS = 6  # black → white, for pixels with no usable hue

HISTOGRAM_DIM = HUE_BINS * VALUE_BINS + ACHROMATIC_BINS  # 42

# A family has to cover at least this share of the carpet before it is claimed.
# Below it, what is being described is a detail — the gold outline of a border,
# a few knots of green in a flower — and a filter that answers «سبز» with a
# carpet holding four green knots is a filter nobody trusts twice.
FAMILY_MIN_SHARE = 0.12
# And at most this many, so «فرش قرمز» stays a claim rather than a list. Three
# is what the busiest carpets in the catalogue actually need: ground, border,
# medallion.
FAMILY_MAX_COUNT = 3


_ACHROMATIC = frozenset({ColorFamily.BLACK, ColorFamily.GRAY, ColorFamily.WHITE})


@dataclass(frozen=True)
class ColorProfile:
    """What one photograph says about colour, in both of its useful forms."""

    histogram: list[float]  # HISTOGRAM_DIM bins, sums to 1 (empty image: all 0)
    families: list[ColorFamily]  # most-covering first, at most FAMILY_MAX_COUNT
    shares: dict[ColorFamily, float]  # every family's coverage, before the cut


def classify_pixel(hue_deg: float, saturation: float, value: float) -> ColorFamily:
    """The family one pixel belongs to, from its HSV coordinates.

    Ordered as a sieve, not a lookup, because the achromatic cases have to be
    taken out before hue is consulted at all — the hue of a grey pixel is noise.

    The one rule here that is about carpets rather than about colour is CREAM.
    In pure colour terms a pale warm pixel is "low-saturation yellow", and left
    to a hue table it lands in GOLD or, once it darkens a little, in ORANGE —
    which is where a third of this catalogue went before the band was widened.
    Persian carpets are cream, ivory and beige often enough that the family has
    to exist, and it is exactly the corner of HSV that a hue table cannot name.
    The band is deliberately generous on saturation and reaches well down the
    value axis, because a beige ground under warm studio light photographs far
    more saturated than the word «کرم» suggests; what keeps it from swallowing
    real terracotta is that a true orange ground clears 0.45 saturation easily.
    """
    if value < BLACK_CEILING:
        return ColorFamily.BLACK
    if saturation < MIN_SATURATION:
        if value < 0.25:
            return ColorFamily.BLACK
        return ColorFamily.GRAY if value < 0.72 else ColorFamily.WHITE
    if 18.0 <= hue_deg < 70.0 and saturation < 0.45 and value > 0.55:
        return ColorFamily.CREAM

    if hue_deg >= 335.0 or hue_deg < 15.0:
        return ColorFamily.RED
    if hue_deg < 45.0:
        # Brown is not a hue, it is a dark orange — the axis that separates a
        # walnut ground from a terracotta one is value, not hue.
        return ColorFamily.BROWN if value < 0.55 else ColorFamily.ORANGE
    if hue_deg < 70.0:
        return ColorFamily.GOLD
    if hue_deg < 160.0:
        return ColorFamily.GREEN
    if hue_deg < 200.0:
        return ColorFamily.TURQUOISE
    if hue_deg < 255.0:
        return ColorFamily.BLUE
    if hue_deg < 300.0:
        return ColorFamily.PURPLE
    # Crimson and maroon sit just below the red boundary and are red to any eye;
    # PINK is the genuinely magenta wedge, not everything left over.
    return ColorFamily.PINK


def _hsv_pixels(image: Image.Image) -> list[tuple[float, float, float]]:
    """Opaque pixels of a reduced copy, as (hue°, saturation, value).

    PIL converts to HSV in C with all three channels on 0–255; doing it in
    Python with `colorsys` would be twenty thousand calls per photograph, and
    this runs once per image at ingest and once per query at search time. The
    channels are read out as raw bytes for the same reason — three per pixel,
    in order — rather than as tuples.
    """
    small = image.resize((SAMPLE_EDGE, SAMPLE_EDGE))
    transparent = small.mode in {"RGBA", "LA", "PA"}
    alpha = small.getchannel("A").tobytes() if transparent else None
    hsv = small.convert("RGB").convert("HSV").tobytes()

    pixels = []
    for index in range(0, len(hsv), 3):
        if alpha is not None and alpha[index // 3] <= MIN_ALPHA:
            continue
        h, s, v = hsv[index], hsv[index + 1], hsv[index + 2]
        pixels.append((h * 360.0 / 256.0, s / 255.0, v / 255.0))
    return pixels


def analyse(image: Image.Image) -> ColorProfile:
    """Describe one photograph's colour, in one pass over its pixels."""
    pixels = _hsv_pixels(image)
    if not pixels:
        # A fully transparent image. Zeros rather than a fabricated grey: the
        # distance functions treat an all-zero histogram as maximally far from
        # everything, which is the honest answer to "what colour is nothing".
        return ColorProfile(histogram=[0.0] * HISTOGRAM_DIM, families=[], shares={})

    histogram = [0.0] * HISTOGRAM_DIM
    counts: dict[ColorFamily, int] = {}

    for hue_deg, saturation, value in pixels:
        family = classify_pixel(hue_deg, saturation, value)
        counts[family] = counts.get(family, 0) + 1

        if family in _ACHROMATIC:
            # Achromatic pixels are laid out along value alone: one axis, because
            # that is the only one they have left.
            index = min(int(value * ACHROMATIC_BINS), ACHROMATIC_BINS - 1)
            histogram[HUE_BINS * VALUE_BINS + index] += 1.0
            continue

        # Hue is assigned *softly*, split between the two nearest bins in
        # proportion to how near. Hard bins make the descriptor brittle exactly
        # where it is asked the most: two reds either side of a 30° boundary
        # would score zero shared colour under the L1 comparison below, which
        # is the opposite of what the eye reports.
        position = (hue_deg / 360.0) * HUE_BINS - 0.5
        lower = int(position // 1)
        upper_weight = position - lower
        value_bin = min(int(value * VALUE_BINS), VALUE_BINS - 1)
        for bin_index, weight in ((lower % HUE_BINS, 1.0 - upper_weight),
                                  ((lower + 1) % HUE_BINS, upper_weight)):
            histogram[bin_index * VALUE_BINS + value_bin] += weight

    total = float(len(pixels))
    histogram = [count / total for count in histogram]
    shares = {family: count / total for family, count in counts.items()}

    ranked = sorted(shares.items(), key=lambda kv: kv[1], reverse=True)
    families = [family for family, share in ranked if share >= FAMILY_MIN_SHARE]
    # Every carpet gets at least one family even when the photograph is so
    # varied that nothing clears the bar — a carpet absent from every colour
    # filter is worse than one filed under its largest colour.
    families = (families or [ranked[0][0]])[:FAMILY_MAX_COUNT]

    return ColorProfile(histogram=histogram, families=families, shares=shares)


def histogram_similarity(left: list[float], right: list[float]) -> float:
    """Histogram intersection, 1 = same colour distribution, 0 = disjoint.

    Intersection rather than cosine because these are distributions, and the
    quantity that means something here is *how much of the two carpets is the
    same colour* — literally the overlapping area. For two histograms that each
    sum to one it equals `1 - L1/2`, which is why the same ranking can be
    computed in SQL by pgvector's `l1_distance` without this function agreeing
    to differ from it.
    """
    return sum(min(a, b) for a, b in zip(left, right, strict=True))
