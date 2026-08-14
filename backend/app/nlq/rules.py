"""Understanding a Persian carpet query without a language model.

This is the default planner, not the fallback that nobody runs. It exists
because the roadmap's first rule about the demo is that it must not die (§10),
and a feature whose only implementation needs a network call, a foreign payment
method and a key that has not expired is a feature that dies on stage.

It is also enough far more often than it sounds. The queries this box actually
receives are short and made of the shop's own vocabulary — a colour, a room, a
material, a ceiling price — and that is a matching problem rather than a
reasoning one. Where it stops is where reasoning genuinely starts: «فرشی که به
مبل چرم قهوه‌ای بیاد» needs a model, and `OpenAiCompatiblePlanner` is what
answers it when one is configured.

Persian text arrives in more than one shape and all of them have to work:
Arabic ک and ي for Persian ک and ی, Persian and Arabic-Indic digits, the zero
width non-joiner inside «لچک‌ترنج», and «می‌خوام» spelled four ways. Normalising
once at the top is much of what makes the matching below short.
"""

from __future__ import annotations

import re
from decimal import Decimal

from app.nlq.schema import QueryPlan
from app.nlq.vocabulary import (
    CHEAP_WORDS,
    COLOR_WORDS,
    EXPENSIVE_WORDS,
    LIGHTNESS_WORDS,
    MATERIAL_WORDS,
    NUMBER_WORDS,
    PATTERN_WORDS,
    PRICE_OVER,
    PRICE_UNDER,
    ROOM_WORDS,
    SCALE_WORDS,
)

# Persian and Arabic-Indic digits to Latin, and the letters a Persian keyboard
# and an Arabic one disagree about.
_TRANSLATION = str.maketrans(
    {
        **{chr(0x06F0 + i): str(i) for i in range(10)},  # ۰-۹
        **{chr(0x0660 + i): str(i) for i in range(10)},  # ٠-٩
        "ك": "ک",
        "ي": "ی",
        "ة": "ه",
        "‌": " ",  # ZWNJ: «لچک‌ترنج» and «لچک ترنج» are one word
        "‏": " ",
        "ً": "",  # tanwin and the short vowels, which nobody types
        "ّ": "",
    }
)


def normalize(text: str) -> str:
    """One spelling for a sentence that arrives in several."""
    lowered = text.translate(_TRANSLATION).lower()
    # Punctuation to spaces so «۲۰۰×۳۰۰» and «قرمز،آبی» split like words do.
    lowered = re.sub(r"[.,،؛;:!?()\[\]{}\"'«»/\\+*_-]+", " ", lowered)
    return re.sub(r"\s+", " ", lowered).strip()


def _contains(text: str, word: str) -> re.Match | None:
    """Does `word` appear at the start of a word in `text`?

    Plain substring matching is wrong in Persian in a way that is easy to miss
    and hard to see afterwards: «ابریشمی» contains «یشمی», so a silk query came
    back as a *green* one, correctly and silently. Anchoring the front of the
    match to a word boundary fixes that class of collision.

    The *end* is deliberately left open, because Persian attaches its suffixes:
    «ابریشمی», «قرمزه» and «سبزی» are all the words they are built from, and
    demanding a whole-token match would lose every one of them.
    """
    return re.search(rf"(?:^|\s){re.escape(word)}", text)


def _find(text: str, table: dict) -> list:
    """Every member of `table` whose words appear, in the table's own order.

    Order matters twice. Within a member, longer phrases are listed first so
    «آبی تیره» is claimed before «آبی» can claim it. Across members, the table's
    order is what breaks a tie when two share a word.
    """
    found = []
    remaining = text
    for member, words in table.items():
        for word in words:
            match = _contains(remaining, word)
            if match:
                found.append(member)
                # Consume it, so «آبی» inside «آبی تیره» cannot match again as
                # its own colour and put the carpet in two families at once.
                remaining = remaining[: match.start()] + " " + remaining[match.end() :]
                break
    return found


def _number_before(text: str, index: int) -> tuple[int | None, int]:
    """The number written immediately before `index`, digits or words.

    Returns the value and where it started, so the caller can cut the phrase
    out of the sentence once it has been understood.
    """
    head = text[:index].rstrip()
    digits = re.search(r"(\d+(?:\.\d+)?)\s*$", head)
    if digits:
        return int(float(digits.group(1))), len(head) - len(digits.group(0))
    for word, value in sorted(NUMBER_WORDS.items(), key=lambda kv: -len(kv[0])):
        if head.endswith(word):
            return value, len(head) - len(word)
    return None, index


def _prices(text: str, floor: Decimal | None, ceiling: Decimal | None) -> dict:
    """Price bounds, from «تا ده میلیون» and from «ارزان» alike.

    `floor` and `ceiling` are the catalogue's real extremes; without them the
    bare adjectives cannot be answered, because «ارزان» is a claim about this
    shop rather than about money.
    """
    result: dict = {}
    consumed: list[tuple[int, int]] = []

    # A number with a scale word: «تا ده میلیون», «زیر ۵۰۰ هزار».
    for match in re.finditer(
        r"(\d+(?:\.\d+)?|[؀-ۿ ]+?)\s*(میلیون|ملیون|میلیارد|هزار)", text
    ):
        raw, scale = match.group(1).strip(), match.group(2)
        amount: int | None = None
        if re.fullmatch(r"\d+(?:\.\d+)?", raw):
            amount = int(float(raw))
        else:
            for word, value in sorted(NUMBER_WORDS.items(), key=lambda kv: -len(kv[0])):
                if raw.endswith(word):
                    amount = value
                    break
        if amount is None:
            continue
        value = Decimal(amount) * SCALE_WORDS[scale]

        # Which side of the bound this is depends on the word in front of it.
        before = text[: match.start()]
        under = max((before.rfind(w) for w in PRICE_UNDER), default=-1)
        over = max((before.rfind(w) for w in PRICE_OVER), default=-1)
        # Only a preposition within a few words counts; one at the far end of
        # the sentence belongs to something else.
        if under >= 0 and len(before) - under <= 14 and under > over:
            result["max_price"] = value
        elif over >= 0 and len(before) - over <= 14:
            result["min_price"] = value
        else:
            # A bare amount is a budget. Nobody types a price to ask for
            # carpets that cost more than it.
            result.setdefault("max_price", value)
        consumed.append((match.start(), match.end()))

    if "max_price" not in result and "min_price" not in result and floor and ceiling:
        # Rounded to the nearest million, because these bounds are read back to
        # the shopper as «تا ۱۱۷ میلیون تومان» and a third of a price range does
        # not divide into a number anybody would have said.
        def rounded(value: Decimal) -> Decimal:
            return (value / 1_000_000).quantize(Decimal("1")) * 1_000_000

        if any(_contains(text, word) for word in CHEAP_WORDS):
            # The cheapest third of the range, which is what «ارزان» buys here.
            result["max_price"] = rounded(floor + (ceiling - floor) / 3)
        elif any(_contains(text, word) for word in EXPENSIVE_WORDS):
            result["min_price"] = rounded(floor + (ceiling - floor) * 2 / 3)

    return {k: v for k, v in result.items() if v is not None}


def _size(text: str) -> dict:
    """«۲۰۰ در ۳۰۰», «۲۰۰x۳۰۰», «۲ در ۳» — a size written the way labels write it.

    Metres are accepted because people say «دو در سه» far more often than they
    say «دویست در سیصد»; anything under twenty is read as metres, and no carpet
    is twenty centimetres wide.
    """
    words = "|".join(re.escape(w) for w in sorted(NUMBER_WORDS, key=len, reverse=True))
    match = re.search(
        rf"(\d+(?:\.\d+)?|{words})\s*(?:در|x|×|\*)\s*(\d+(?:\.\d+)?|{words})", text
    )
    if not match:
        return {}

    def value(raw: str) -> float:
        return float(raw) if re.fullmatch(r"\d+(?:\.\d+)?", raw) else float(NUMBER_WORDS[raw])

    a, b = value(match.group(1)), value(match.group(2))
    if a < 20 and b < 20:
        a, b = a * 100, b * 100
    width, length = int(min(a, b)), int(max(a, b))
    if not (20 <= width <= 1000 and 20 <= length <= 1000):
        return {}
    # An exact size, expressed as a range of width zero — the same shape the
    # size filter takes everywhere else in the shop.
    return {
        "min_width_cm": width,
        "max_width_cm": width,
        "min_length_cm": length,
        "max_length_cm": length,
    }


_FA_DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def fa(value: int | str) -> str:
    """Persian digits. These strings are shown to a shopper, not logged.

    Done here rather than in the storefront because the numbers are embedded in
    sentences — «تا ۱۰ میلیون تومان» — and a client-side pass would have to
    find them inside the text it was handed.
    """
    return str(value).translate(_FA_DIGITS)


def _toman(value: Decimal) -> str:
    """«۱۰ میلیون» rather than «۱۰۰۰۰۰۰۰», because that is how it was said."""
    amount = int(value)
    if amount >= 1_000_000_000 and amount % 1_000_000_000 == 0:
        return f"{fa(amount // 1_000_000_000)} میلیارد تومان"
    if amount >= 1_000_000 and amount % 1_000_000 == 0:
        return f"{fa(amount // 1_000_000)} میلیون تومان"
    if amount >= 1_000 and amount % 1_000 == 0:
        return f"{fa(amount // 1_000)} هزار تومان"
    return f"{fa(amount)} تومان"


def parse(
    query: str, *, price_floor: Decimal | None = None, price_ceiling: Decimal | None = None
) -> QueryPlan:
    """A Persian sentence, read with the vocabulary and nothing else."""
    text = normalize(query)
    if not text:
        return QueryPlan()

    colors = _find(text, COLOR_WORDS)
    # «روشن» and «تیره» widen rather than replace: someone who wrote «آبی
    # روشن» has already been given turquoise by the colour table, and adding
    # the whole light family on top would bury what they asked for.
    understood: list[str] = []
    if not colors:
        for word, families in LIGHTNESS_WORDS.items():
            if word in text:
                colors = list(families)
                understood.append(f"رنگ {word}")
                break

    patterns = _find(text, PATTERN_WORDS)
    materials = _find(text, MATERIAL_WORDS)
    rooms = _find(text, ROOM_WORDS)
    prices = _prices(text, price_floor, price_ceiling)
    size = _size(text)

    from app.nlq.prompt import label_for

    if colors and not understood:
        understood.append("رنگ " + " یا ".join(label_for(c) for c in colors))
    elif colors and understood:
        understood[-1] += f" ({'، '.join(label_for(c) for c in colors)})"
    if patterns:
        understood.append("نقش " + " یا ".join(label_for(p) for p in patterns))
    if materials:
        understood.append("جنس " + " یا ".join(label_for(m) for m in materials))
    if rooms:
        understood.append("برای " + " یا ".join(label_for(r) for r in rooms))
    if "max_price" in prices:
        understood.append(f"تا {_toman(prices['max_price'])}")
    if "min_price" in prices:
        understood.append(f"از {_toman(prices['min_price'])}")
    if size:
        understood.append(
            f"اندازه‌ی {fa(size['min_width_cm'])} × {fa(size['min_length_cm'])}"
        )

    return QueryPlan(
        color=colors,
        pattern=patterns,
        material=materials,
        room=rooms,
        understood=understood,
        **prices,
        **size,
    )
