"""Which carpet suits this room, and the sentence that says why.

The reasons are not written after the ranking; they **are** the ranking. Every
rule below contributes both a number and a Persian clause, so a carpet's
position and its explanation cannot disagree — which is the failure mode of
every "AI recommendation" that produces a list first and a justification second.
It also means the advice can be argued with: a shopper who disagrees with
«اتاق شما کم‌رنگ است» has been told the premise rather than handed a verdict.

The rules are a designer's, not a colour wheel's:

* **Be visible.** A carpet that shares its colour *and* its lightness with the
  floor disappears. This is the only rule that subtracts, because it is the only
  one describing a mistake rather than a missed opportunity.
* **Repeat something in the room.** Picking up a colour already present — the
  cushions, the curtain, the wood — is what makes a rug look chosen rather than
  bought. Neutrals do not count: every room contains grey.
* **Balance the room's colour.** A pale room wants the carpet to be the colour
  in it; a room that is already busy wants a quiet floor. Getting this backwards
  is the commonest way a well-matched rug still looks wrong.
* **Agree with its temperature**, and **lift a dim room**.

Nothing here is learned, and that is deliberate: there is no dataset of «this
carpet in this room looked good», so a model would be fitting something else
and calling it taste.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.models.enums import ColorFamily
from app.nlq.prompt import label_for
from app.room.palette import COOL, NEUTRALS, ROOM_NEUTRALS, WARM, RoomPalette

# How dark a carpet family reads, roughly, on the same 0–1 scale as the room's
# lightness. Used only for the "does it disappear into the floor" test and the
# "does it lift a dim room" one, both of which are about lightness rather than
# hue — so an approximate figure per family is the right resolution.
FAMILY_LIGHTNESS: dict[ColorFamily, float] = {
    ColorFamily.WHITE: 0.95,
    ColorFamily.CREAM: 0.82,
    ColorFamily.GOLD: 0.70,
    ColorFamily.TURQUOISE: 0.60,
    ColorFamily.PINK: 0.60,
    ColorFamily.ORANGE: 0.58,
    ColorFamily.GRAY: 0.52,
    ColorFamily.GREEN: 0.42,
    ColorFamily.RED: 0.40,
    ColorFamily.BROWN: 0.35,
    ColorFamily.PURPLE: 0.35,
    ColorFamily.BLUE: 0.28,
    ColorFamily.BLACK: 0.12,
}

LIGHT_FAMILIES = frozenset(
    {ColorFamily.CREAM, ColorFamily.WHITE, ColorFamily.GOLD, ColorFamily.TURQUOISE}
)


@dataclass(frozen=True)
class Advice:
    score: float
    reasons: list[str]
    #: Said separately from the reasons, because a caution is not a selling
    #: point and burying it among four compliments is how it goes unread.
    caution: str | None


def _lightness(families: list[ColorFamily]) -> float:
    if not families:
        return 0.5
    return sum(FAMILY_LIGHTNESS.get(f, 0.5) for f in families) / len(families)


def advise(families: list[ColorFamily], palette: RoomPalette) -> Advice:
    """Score one carpet against one room, and say why in Persian."""
    if not families:
        # A carpet with no colour families is one whose photograph was never
        # read. Silence is the honest answer; a default score would rank it.
        return Advice(score=0.0, reasons=[], caution=None)

    score = 0.0
    reasons: list[str] = []
    caution: str | None = None

    lead = families[0]
    carpet_light = _lightness(families)
    floor_families = palette.floor.families

    # 1. Be visible against the floor.
    shares_floor_colour = bool(set(families[:2]) & set(floor_families[:2]))
    close_in_tone = abs(carpet_light - palette.floor_lightness) < 0.16
    if shares_floor_colour and close_in_tone:
        # Scaled by how much of the floor is that colour: sharing a hue with a
        # tenth of the tiles is not the same mistake as sharing it with all of
        # them, and the difference is what separates two otherwise equal rugs.
        floor_presence = max(
            (palette.floor.shares.get(f, 0.0) for f in families[:2]), default=0.0
        )
        score -= 0.20 + 0.40 * floor_presence
        floor_name = label_for(floor_families[0]) if floor_families else "کف"
        caution = f"با کف {floor_name} اتاق شما هم‌رنگ است و کم‌تر به چشم می‌آید."
    elif abs(carpet_light - palette.floor_lightness) > 0.28:
        score += 0.20
        reasons.append("روی کف اتاق شما جدا می‌نشیند و محو نمی‌شود")

    # 2. Repeat a colour the room already has.
    #
    # Weighted by how much of the room that colour actually is, not merely
    # whether it appears. Without the weight every carpet sharing a family
    # scored identically, and six of them came back tied to three decimal
    # places — a ranking that does not rank, presented as one that does.
    room_colours = [f for f in palette.room.families if f not in ROOM_NEUTRALS]
    shared = [f for f in families if f in room_colours]
    if shared:
        presence = max(palette.room.shares.get(f, 0.0) for f in shared)
        score += 0.30 + 0.40 * presence
        names = " و ".join(label_for(f) for f in shared[:2])
        reasons.append(f"رنگ {names} را از خود اتاق برمی‌دارد")

    # 3. Balance the room's own colourfulness.
    carpet_is_neutral = all(f in NEUTRALS or f == ColorFamily.CREAM for f in families)
    if palette.is_neutral and not carpet_is_neutral:
        score += 0.25
        reasons.append("اتاق شما کم‌رنگ است و این فرش رنگ می‌آورد")
    elif palette.is_busy and carpet_is_neutral:
        score += 0.25
        reasons.append("اتاق شما پُررنگ است و این فرش آرامش می‌دهد")
    elif palette.is_busy and not carpet_is_neutral and len(families) >= 3:
        # Not a mistake, but worth saying out loud.
        score -= 0.15
        caution = caution or "اتاق شما خودش پُررنگ است؛ این فرش هم شلوغ است."

    # 4. Agree with the room's temperature.
    warmth = palette.warmth
    if warmth == "warm" and lead in WARM:
        score += 0.15
        reasons.append("با گرمی رنگ‌های اتاق هم‌خوان است")
    elif warmth == "cool" and lead in COOL:
        score += 0.15
        reasons.append("با سردی رنگ‌های اتاق هم‌خوان است")

    # 5. Lift a dim room.
    if palette.is_dim and lead in LIGHT_FAMILIES:
        score += 0.20
        reasons.append("اتاق کم‌نور است و این فرش روشنش می‌کند")

    return Advice(score=score, reasons=reasons, caution=caution)
