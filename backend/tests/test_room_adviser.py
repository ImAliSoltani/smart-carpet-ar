"""The layout adviser's rules, on rooms built to isolate one rule at a time.

Room photographs cannot test this. A real living room fires four rules at once,
so a passing assertion says nothing about which of them was right — and the two
bugs this suite exists to prevent were both cases where the *wrong* rule was
doing the work and the answer still looked plausible. The palettes here are
constructed instead, one property at a time.
"""

import pytest

from app.models.enums import ColorFamily
from app.room.adviser import advise
from app.room.palette import RoomPalette
from app.services.color import ColorProfile


def profile(*families: ColorFamily, shares: dict | None = None) -> ColorProfile:
    return ColorProfile(
        histogram=[],
        families=list(families),
        shares=shares or {f: 1.0 / max(len(families), 1) for f in families},
    )


def room(
    *,
    floor: tuple[ColorFamily, ...] = (ColorFamily.BROWN,),
    walls: tuple[ColorFamily, ...] = (ColorFamily.WHITE,),
    colourfulness: float = 0.1,
    lightness: float = 0.6,
    floor_lightness: float = 0.35,
    shares: dict | None = None,
) -> RoomPalette:
    return RoomPalette(
        floor=profile(*floor),
        room=profile(*walls, shares=shares),
        colourfulness=colourfulness,
        lightness=lightness,
        floor_lightness=floor_lightness,
    )


class TestBeingVisible:
    def test_a_carpet_that_vanishes_into_the_floor_is_penalised_and_says_so(self) -> None:
        """The only rule that subtracts, because it is the only mistake."""
        result = advise(
            [ColorFamily.CREAM],
            room(floor=(ColorFamily.CREAM,), floor_lightness=0.80),
        )
        assert result.score < 0
        assert result.caution is not None and "کف" in result.caution

    def test_the_penalty_scales_with_how_much_of_the_floor_it_is(self) -> None:
        """Sharing a hue with a tenth of the tiles is not the same mistake."""
        mostly = room(floor=(ColorFamily.CREAM,), floor_lightness=0.80)
        mostly.floor.shares[ColorFamily.CREAM] = 0.9
        barely = room(floor=(ColorFamily.CREAM,), floor_lightness=0.80)
        barely.floor.shares[ColorFamily.CREAM] = 0.15

        assert advise([ColorFamily.CREAM], mostly).score < advise(
            [ColorFamily.CREAM], barely
        ).score

    def test_a_carpet_that_stands_apart_from_the_floor_is_rewarded(self) -> None:
        result = advise(
            [ColorFamily.BLUE], room(floor=(ColorFamily.CREAM,), floor_lightness=0.85)
        )
        assert result.score > 0
        assert any("محو نمی‌شود" in line for line in result.reasons)


class TestPickingUpTheRoom:
    def test_sharing_a_colour_with_the_furniture_is_the_point(self) -> None:
        result = advise(
            [ColorFamily.PINK, ColorFamily.RED],
            room(walls=(ColorFamily.PINK,), colourfulness=0.3),
        )
        assert any("از خود اتاق" in line for line in result.reasons)

    def test_matching_the_wood_or_the_walls_is_not_a_decision(self) -> None:
        """Every room has cream walls and brown wood; matching them says nothing.

        Counting them was what made a quiet beige living room measure 0.75
        colourful, get filed as busy, and be advised to calm down with beige.
        """
        result = advise(
            [ColorFamily.CREAM, ColorFamily.BROWN],
            room(walls=(ColorFamily.CREAM, ColorFamily.BROWN)),
        )
        assert not any("از خود اتاق" in line for line in result.reasons)

    def test_a_bigger_presence_in_the_room_scores_higher(self) -> None:
        """Without this every carpet sharing a family scored identically —
        six of them tied to three decimals, presented as a ranking."""
        dominant = room(
            walls=(ColorFamily.GREEN,),
            colourfulness=0.3,
            shares={ColorFamily.GREEN: 0.8},
        )
        trace = room(
            walls=(ColorFamily.GREEN,),
            colourfulness=0.3,
            shares={ColorFamily.GREEN: 0.15},
        )
        assert advise([ColorFamily.GREEN], dominant).score > advise(
            [ColorFamily.GREEN], trace
        ).score


class TestBalance:
    def test_a_pale_room_is_told_to_take_colour(self) -> None:
        result = advise([ColorFamily.RED], room(colourfulness=0.05))
        assert any("رنگ می‌آورد" in line for line in result.reasons)

    def test_a_busy_room_is_told_to_take_quiet(self) -> None:
        result = advise([ColorFamily.GRAY, ColorFamily.WHITE], room(colourfulness=0.7))
        assert any("آرامش" in line for line in result.reasons)

    def test_a_busy_room_and_a_busy_carpet_is_a_caution_not_a_refusal(self) -> None:
        result = advise(
            [ColorFamily.RED, ColorFamily.GREEN, ColorFamily.GOLD],
            room(colourfulness=0.7),
        )
        assert result.caution is not None


class TestTemperatureAndLight:
    def test_warm_rooms_prefer_warm_carpets(self) -> None:
        warm = room(walls=(ColorFamily.ORANGE,), colourfulness=0.3)
        assert warm.warmth == "warm"
        assert any("گرمی" in line for line in advise([ColorFamily.RED], warm).reasons)

    def test_cool_rooms_prefer_cool_carpets(self) -> None:
        cool = room(walls=(ColorFamily.BLUE,), colourfulness=0.3)
        assert cool.warmth == "cool"
        assert any("سردی" in line for line in advise([ColorFamily.TURQUOISE], cool).reasons)

    def test_the_floor_does_not_decide_the_temperature(self) -> None:
        """Nearly every floor here is warm wood or warm tile. Including it would
        report every room as warm and give everybody the same sentence."""
        assert room(floor=(ColorFamily.BROWN,), walls=(ColorFamily.BLUE,),
                    colourfulness=0.3).warmth == "cool"

    def test_a_dim_room_is_offered_something_light(self) -> None:
        result = advise([ColorFamily.CREAM], room(lightness=0.2, floor_lightness=0.2))
        assert any("روشنش می‌کند" in line for line in result.reasons)


class TestSilence:
    def test_a_carpet_with_no_colours_read_is_not_recommended(self) -> None:
        """A default score would rank a carpet nobody has looked at."""
        result = advise([], room())
        assert result.reasons == []
        assert result.score == 0.0

    @pytest.mark.parametrize("family", list(ColorFamily))
    def test_every_family_can_be_advised_without_raising(self, family) -> None:
        """A new colour family must not crash the adviser on the way in."""
        assert advise([family], room()) is not None
