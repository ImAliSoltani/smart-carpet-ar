"""What colour a room is — read in two halves, because a carpet meets two things.

A carpet lands on the **floor** and lives with the **walls and furniture**, and
those are different relationships. Against the floor it needs to be visible at
all: a cream rug on a cream tile is a rug nobody sees, and no amount of
agreement with the curtains repairs that. Against the room it needs to belong,
which is the opposite requirement — there, sharing a colour is the point.

Reading the photograph as one average would collapse both into a single number
that answers neither. So the floor mask the size guide already computes is used
here to split the pixels, and the two halves are described separately with the
same `app.services.color` the catalogue is described with. Same bins, same
families, so a room and a carpet can be compared at all.

Two summary numbers come along, because they carry the advice that is not about
matching:

* **Colourfulness** — what share of the room has a hue worth naming. A room of
  white walls and pale wood wants a carpet to be the colour in it; a room that
  is already patterned wallpaper and a green sofa wants the floor to be quiet.
  Getting this backwards is the commonest way a well-matched rug looks wrong.
* **Lightness** — a dim room takes a light carpet and gets lighter. This is the
  one piece of advice a shopper almost never gives themselves, because they are
  looking at the room with their own eyes adapted to it.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from PIL import Image

from app.models.enums import ColorFamily
from app.services import color as color_service

# The mask and the photograph are reduced to this together before anything is
# counted. Same size as the colour module's own sampling, so the image it
# receives is already at its working resolution and it does not resample a
# masked picture a second time — which would blend a dark sofa into the floor
# beside it and report a floor that is nowhere in the room.
SAMPLE_EDGE = color_service.SAMPLE_EDGE

# Families that carry no hue at all.
NEUTRALS = frozenset({ColorFamily.GRAY, ColorFamily.BLACK, ColorFamily.WHITE})

# What does not count as *the room's* colour, which is a longer list than the
# colourless one. Cream and brown are the walls and the wood, and nearly every
# room in the country has both — counting them made a quiet beige living room
# measure 0.75 colourful, get filed as «busy», and be advised to calm itself
# down with a beige carpet. A room's colour is what somebody chose to put in
# it, so matching the skirting board is not a decision and neither is matching
# the door.
ROOM_NEUTRALS = NEUTRALS | {ColorFamily.CREAM, ColorFamily.BROWN}

# Warm and cool, as a carpet shop means them. CREAM sits with the warm ones
# because a Persian ivory is a warm ivory — it is woven from undyed wool, not
# printed from white ink.
WARM = frozenset(
    {
        ColorFamily.RED,
        ColorFamily.ORANGE,
        ColorFamily.GOLD,
        ColorFamily.CREAM,
        ColorFamily.BROWN,
        ColorFamily.PINK,
    }
)
COOL = frozenset(
    {ColorFamily.BLUE, ColorFamily.TURQUOISE, ColorFamily.GREEN, ColorFamily.PURPLE}
)


@dataclass(frozen=True)
class RoomPalette:
    """One photograph of a room, described the way a carpet has to meet it."""

    floor: color_service.ColorProfile
    room: color_service.ColorProfile
    #: Share of the room's pixels that have a nameable hue, 0–1.
    colourfulness: float
    #: Mean HSV value of the room's pixels, 0–1.
    lightness: float
    #: Mean HSV value of the floor's pixels — what the carpet is seen against.
    floor_lightness: float

    @property
    def is_neutral(self) -> bool:
        """Little enough colour that the carpet should bring some."""
        return self.colourfulness < 0.15

    @property
    def is_busy(self) -> bool:
        """Enough colour already that the carpet should not compete."""
        return self.colourfulness > 0.4

    @property
    def is_dim(self) -> bool:
        return self.lightness < 0.38

    @property
    def warmth(self) -> str:
        """«warm», «cool», or «neutral» — from the room, never from the floor.

        The floor is excluded on purpose: nearly every floor in the country is
        warm wood or warm tile, so including it would report every room as warm
        and the advice would be the same sentence for everybody.
        """
        warm = sum(share for f, share in self.room.shares.items() if f in WARM)
        cool = sum(share for f, share in self.room.shares.items() if f in COOL)
        if warm > cool * 1.6 and warm > 0.15:
            return "warm"
        if cool > warm * 1.6 and cool > 0.15:
            return "cool"
        return "neutral"


def _masked(image: Image.Image, mask: np.ndarray) -> Image.Image:
    """The photograph with everything outside `mask` made transparent.

    Both are reduced with nearest-neighbour rather than a smooth filter, which
    matters more than it looks: interpolating a mask boundary invents pixels
    that are half floor and half sofa, and those land in the histogram as a
    colour that is in neither.
    """
    small = image.convert("RGB").resize((SAMPLE_EDGE, SAMPLE_EDGE), Image.NEAREST)
    alpha = Image.fromarray((mask > 0.5).astype(np.uint8) * 255).resize(
        (SAMPLE_EDGE, SAMPLE_EDGE), Image.NEAREST
    )
    out = small.convert("RGBA")
    out.putalpha(alpha)
    return out


def _mean_value(image: Image.Image, mask: np.ndarray) -> float:
    """Mean HSV value over the masked pixels, 0 when the mask is empty."""
    small = np.asarray(
        image.convert("RGB").resize((SAMPLE_EDGE, SAMPLE_EDGE), Image.NEAREST).convert("HSV")
    )
    selected = np.asarray(
        Image.fromarray((mask > 0.5).astype(np.uint8)).resize(
            (SAMPLE_EDGE, SAMPLE_EDGE), Image.NEAREST
        )
    ).astype(bool)
    if not selected.any():
        return 0.0
    return float(small[..., 2][selected].mean() / 255.0)


def read_palette(image: Image.Image, floor_mask: np.ndarray) -> RoomPalette:
    """Split a room photograph into the floor and everything else, and read both."""
    room_mask = 1.0 - np.clip(floor_mask.astype(float), 0.0, 1.0)

    floor = color_service.analyse(_masked(image, floor_mask))
    room = color_service.analyse(_masked(image, room_mask))

    chromatic = sum(
        share for family, share in room.shares.items() if family not in ROOM_NEUTRALS
    )

    return RoomPalette(
        floor=floor,
        room=room,
        colourfulness=chromatic,
        lightness=_mean_value(image, room_mask),
        floor_lightness=_mean_value(image, floor_mask),
    )
