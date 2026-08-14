"""What the colour descriptor has to keep getting right.

Every case here is one the catalogue actually got wrong at some point during the
pass that built this module, and each was found by looking at seventy carpets
rather than by reading the code — so the cost of a regression is not a red test
but a shop where «سرمه‌ای» returns cream rugs and nobody notices for a phase.
"""

from io import BytesIO

from PIL import Image

from app.models.carpet import COLOR_HISTOGRAM_DIM
from app.models.enums import ColorFamily
from app.services import color as color_service


def _solid(rgb: tuple[int, int, int], size=(200, 300)) -> Image.Image:
    return Image.new("RGB", size, rgb)


def _png(rgb: tuple[int, int, int]) -> bytes:
    buffer = BytesIO()
    _solid(rgb).save(buffer, format="PNG")
    return buffer.getvalue()


class TestPixelClassification:
    def test_navy_is_blue_not_black(self) -> None:
        """The bug that cost six carpets their colour.

        A navy ground photographed under shop light is dark *and* saturated. A
        value floor reads the first half and files the field as black, after
        which the carpet inherits whatever its border is — which is how navy
        carpets came back labelled red, brown and cream.
        """
        assert color_service.classify_pixel(225.0, 0.75, 0.22) is ColorFamily.BLUE
        assert color_service.classify_pixel(225.0, 0.35, 0.13) is ColorFamily.BLUE

    def test_beige_ground_is_cream_not_orange(self) -> None:
        """Warm and pale is a carpet colour, and a hue table cannot name it.

        Left to hue alone these land in ORANGE or GOLD, which is where a third
        of the catalogue went: twelve carpets a shopper would call «نخودی».
        """
        assert color_service.classify_pixel(35.0, 0.30, 0.80) is ColorFamily.CREAM
        assert color_service.classify_pixel(40.0, 0.42, 0.62) is ColorFamily.CREAM

    def test_saturated_warm_stays_orange(self) -> None:
        """And the cream band must not swallow real terracotta."""
        assert color_service.classify_pixel(25.0, 0.85, 0.75) is ColorFamily.ORANGE
        assert color_service.classify_pixel(25.0, 0.85, 0.40) is ColorFamily.BROWN

    def test_desaturated_is_achromatic_by_lightness(self) -> None:
        assert color_service.classify_pixel(200.0, 0.03, 0.95) is ColorFamily.WHITE
        assert color_service.classify_pixel(200.0, 0.03, 0.50) is ColorFamily.GRAY
        assert color_service.classify_pixel(200.0, 0.03, 0.10) is ColorFamily.BLACK

    def test_crimson_is_red_not_pink(self) -> None:
        """Hue 340 is a Kashan ground, not a rose."""
        assert color_service.classify_pixel(340.0, 0.80, 0.45) is ColorFamily.RED
        assert color_service.classify_pixel(315.0, 0.80, 0.70) is ColorFamily.PINK


class TestHistogram:
    def test_dimension_matches_the_column(self) -> None:
        """The model repeats this number and cannot import the service."""
        assert color_service.HISTOGRAM_DIM == COLOR_HISTOGRAM_DIM
        profile = color_service.analyse(_solid((180, 40, 40)))
        assert len(profile.histogram) == COLOR_HISTOGRAM_DIM

    def test_is_a_distribution(self) -> None:
        profile = color_service.analyse(_solid((40, 90, 170)))
        assert abs(sum(profile.histogram) - 1.0) < 1e-6
        assert all(bin_value >= 0.0 for bin_value in profile.histogram)

    def test_identical_images_intersect_completely(self) -> None:
        left = color_service.analyse(_solid((90, 140, 60))).histogram
        assert abs(color_service.histogram_similarity(left, left) - 1.0) < 1e-6

    def test_opposite_hues_barely_intersect(self) -> None:
        red = color_service.analyse(_solid((200, 30, 30))).histogram
        blue = color_service.analyse(_solid((30, 30, 200))).histogram
        assert color_service.histogram_similarity(red, blue) < 0.05

    def test_neighbouring_hues_still_intersect(self) -> None:
        """Soft hue assignment, and the reason for it.

        With hard bins two reds either side of a 30° boundary share nothing at
        all, so the descriptor is at its most brittle exactly where it is asked
        the most. Splitting each pixel between its two nearest bins is what
        keeps a scarlet and a vermilion recognisably the same colour.
        """
        one = color_service.analyse(_solid((200, 40, 30))).histogram
        two = color_service.analyse(_solid((200, 70, 30))).histogram
        assert color_service.histogram_similarity(one, two) > 0.3

    def test_transparent_padding_is_not_the_carpet(self) -> None:
        """Catalogue photographs are cut out; the discarded backdrop must not vote."""
        canvas = Image.new("RGBA", (200, 200), (0, 0, 0, 0))
        canvas.paste(Image.new("RGBA", (80, 80), (200, 30, 30, 255)), (60, 60))
        assert color_service.analyse(canvas).families == [ColorFamily.RED]

    def test_fully_transparent_image_claims_nothing(self) -> None:
        empty = Image.new("RGBA", (50, 50), (0, 0, 0, 0))
        profile = color_service.analyse(empty)
        assert profile.families == []
        assert sum(profile.histogram) == 0.0


class TestFamilies:
    def test_every_carpet_gets_at_least_one(self) -> None:
        """Even a photograph too varied for anything to clear the share bar.

        A carpet filed under no colour is absent from every colour filter, which
        is a worse answer than filing it under its largest colour.
        """
        noisy = Image.new("RGB", (60, 60))
        noisy.putdata(
            [((i * 37) % 256, (i * 91) % 256, (i * 53) % 256) for i in range(60 * 60)]
        )
        assert len(color_service.analyse(noisy).families) >= 1

    def test_capped_so_the_answer_stays_a_claim(self) -> None:
        assert (
            len(color_service.analyse(_solid((150, 60, 40))).families)
            <= color_service.FAMILY_MAX_COUNT
        )

    def test_a_detail_does_not_earn_a_family(self) -> None:
        """A few knots of green must not file the carpet under «سبز»."""
        canvas = Image.new("RGB", (200, 200), (190, 40, 40))
        canvas.paste(Image.new("RGB", (20, 20), (30, 160, 60)), (10, 10))  # 1% of the area
        assert ColorFamily.GREEN not in color_service.analyse(canvas).families


class TestPipelineWiring:
    def test_upload_carries_both_forms(self, tmp_path) -> None:
        from app.services.images import process_upload
        from app.services.storage import Storage

        storage = Storage(root=tmp_path, public_base="/files")
        result = process_upload(_png((40, 60, 150)), storage)
        assert len(result.color_histogram) == COLOR_HISTOGRAM_DIM
        assert result.color_families == [ColorFamily.BLUE]
