"""AR asset generation: true scale, valid containers, honest corner detection."""

import json
import struct
import zipfile
from io import BytesIO

import pytest
from PIL import Image, ImageDraw

from app.ar.glb_builder import build_carpet_glb
from app.ar.rectify import detect_corners, order_corners, rectify
from app.ar.usdz_builder import ALIGNMENT, build_carpet_usdz


def _photo_of_carpet_on_floor(
    size=(1200, 900), quad=((260, 180), (980, 240), (930, 760), (210, 700))
) -> Image.Image:
    """A carpet photographed at an angle: coloured quad on a plain floor."""
    image = Image.new("RGB", size, (205, 200, 190))
    draw = ImageDraw.Draw(image)
    draw.polygon(quad, fill=(150, 35, 40))
    # inner border so the shape reads as a carpet, not a flat colour blob
    inner = [(x + (size[0] // 2 - x) * 0.12, y + (size[1] // 2 - y) * 0.12) for x, y in quad]
    draw.polygon(inner, outline=(235, 220, 180), width=14)
    return image


class TestUsdz:
    def test_is_quicklook_shaped_archive(self, tmp_path):
        asset = build_carpet_usdz(
            Image.new("RGB", (800, 1200), (120, 40, 40)), 2.0, 3.0, tmp_path / "c.usdz"
        )
        with zipfile.ZipFile(asset.usdz_path) as archive:
            names = archive.namelist()
            assert names[0].endswith(".usda"), "USD scene must be the first entry"
            for info in archive.infolist():
                assert info.compress_type == zipfile.ZIP_STORED
                assert info.header_offset >= 0
                data_start = (
                    info.header_offset + 30 + len(info.filename.encode()) + len(info.extra)
                )
                assert data_start % ALIGNMENT == 0, f"{info.filename} not 64-byte aligned"

            scene = archive.read(names[0]).decode()
        # true scale: a 2x3 m carpet spans +-1.0 x +-1.5 m, and units are metres
        assert "metersPerUnit = 1" in scene
        assert "(-1.0, 0, -1.5)" in scene and "(1.0, 0, 1.5)" in scene

    def test_rejects_invalid_dimensions(self, tmp_path):
        with pytest.raises(ValueError):
            build_carpet_usdz(Image.new("RGB", (10, 10)), 0, 2.0, tmp_path / "x.usdz")


class TestGlbUsdzAgreement:
    def test_both_formats_describe_the_same_carpet(self, tmp_path):
        texture = Image.new("RGB", (600, 900), (90, 60, 30))
        glb = build_carpet_glb(texture, 1.5, 2.25, tmp_path / "c.glb")
        usdz = build_carpet_usdz(texture, 1.5, 2.25, tmp_path / "c.usdz")

        data = glb.glb_path.read_bytes()
        json_len = struct.unpack("<II", data[12:20])[0]
        gltf = json.loads(data[20 : 20 + json_len])
        position = gltf["accessors"][0]
        assert position["max"][0] - position["min"][0] == pytest.approx(1.5)
        assert position["max"][2] - position["min"][2] == pytest.approx(2.25)

        with zipfile.ZipFile(usdz.usdz_path) as archive:
            scene = archive.read(archive.namelist()[0]).decode()
        assert "(-0.75, 0, -1.125)" in scene and "(0.75, 0, 1.125)" in scene


class TestCornerDetection:
    def test_orders_arbitrary_points_consistently(self):
        import numpy as np

        scrambled = np.array([[900, 700], [100, 80], [880, 90], [120, 720]], dtype=np.float32)
        tl, tr, br, bl = order_corners(scrambled)
        assert tl == (100, 80)
        assert tr == (880, 90)
        assert br == (900, 700)
        assert bl == (120, 720)

    def test_finds_the_carpet_in_an_angled_photo(self):
        quad = ((260, 180), (980, 240), (930, 760), (210, 700))
        corners, confidence = detect_corners(_photo_of_carpet_on_floor(quad=quad))
        assert confidence > 0.5, f"expected a confident detection, got {confidence}"
        for detected, expected in zip(corners, quad, strict=True):
            assert abs(detected[0] - expected[0]) < 45
            assert abs(detected[1] - expected[1]) < 45

    def test_reports_no_confidence_on_a_featureless_photo(self):
        _, confidence = detect_corners(Image.new("RGB", (900, 700), (200, 200, 200)))
        assert confidence == 0.0, "a blank frame must not claim a detection"


class TestRectify:
    def test_output_matches_real_aspect_ratio(self):
        result = rectify(_photo_of_carpet_on_floor(), width_cm=200, length_cm=300)
        width, height = result.image.size
        assert width / height == pytest.approx(200 / 300, rel=0.01)

    def test_manual_corners_are_trusted_and_used(self):
        corners = ((100.0, 100.0), (700.0, 100.0), (700.0, 500.0), (100.0, 500.0))
        result = rectify(
            _photo_of_carpet_on_floor(), width_cm=300, length_cm=200, corners=corners
        )
        assert result.automatic is False
        assert result.confidence == 1.0
        assert result.needs_review is False
        assert result.corners == corners

    def test_landscape_and_portrait_both_capped(self):
        photo = _photo_of_carpet_on_floor()
        landscape = rectify(photo, width_cm=400, length_cm=300, max_texture_px=1000)
        portrait = rectify(photo, width_cm=300, length_cm=400, max_texture_px=1000)
        assert max(landscape.image.size) == 1000
        assert max(portrait.image.size) == 1000


class TestRoundTrip:
    def test_pipeline_produces_openable_files(self, tmp_path):
        """The end-to-end shape of Phase 2: photo -> rectified -> both formats."""
        result = rectify(_photo_of_carpet_on_floor(), width_cm=250, length_cm=350)
        glb = build_carpet_glb(result.image, 2.5, 3.5, tmp_path / "r.glb")
        usdz = build_carpet_usdz(result.image, 2.5, 3.5, tmp_path / "r.usdz")

        assert glb.glb_path.stat().st_size > 1000
        assert usdz.usdz_path.stat().st_size > 1000
        with zipfile.ZipFile(usdz.usdz_path) as archive:
            texture = archive.read("textures/carpet.jpg")
        assert Image.open(BytesIO(texture)).size == usdz.texture_px
