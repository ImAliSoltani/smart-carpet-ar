import json
import struct

from PIL import Image

from app.ar.glb_builder import build_carpet_glb


def _parse_glb(path):
    data = path.read_bytes()
    magic, version, length = struct.unpack("<III", data[:12])
    assert magic == 0x46546C67 and version == 2 and length == len(data)
    json_len, json_type = struct.unpack("<II", data[12:20])
    assert json_type == 0x4E4F534A
    gltf = json.loads(data[20 : 20 + json_len])
    bin_offset = 20 + json_len
    bin_len, bin_type = struct.unpack("<II", data[bin_offset : bin_offset + 8])
    assert bin_type == 0x004E4942
    return gltf, data[bin_offset + 8 : bin_offset + 8 + bin_len]


def test_build_carpet_glb_true_scale(tmp_path):
    texture = Image.new("RGB", (400, 600), (120, 30, 30))
    asset = build_carpet_glb(texture, 2.0, 3.0, tmp_path / "carpet.glb")

    gltf, blob = _parse_glb(asset.glb_path)

    # true real-world scale: a 2×3 m carpet spans exactly ±1.0 × ±1.5 m
    pos = gltf["accessors"][0]
    assert pos["min"] == [-1.0, 0.0, -1.5]
    assert pos["max"] == [1.0, 0.0, 1.5]

    # flat quad: 4 vertices, 6 indices, one doubleSided textured material
    assert pos["count"] == 4
    assert gltf["accessors"][3]["count"] == 6
    assert gltf["materials"][0]["doubleSided"] is True
    assert gltf["images"][0]["mimeType"] == "image/jpeg"

    # binary chunk holds all bufferViews within bounds
    for view in gltf["bufferViews"]:
        assert view["byteOffset"] + view["byteLength"] <= len(blob)


def test_rejects_invalid_dimensions(tmp_path):
    texture = Image.new("RGB", (10, 10))
    try:
        build_carpet_glb(texture, 0, 2.0, tmp_path / "x.glb")
        raise AssertionError("expected ValueError")
    except ValueError:
        pass
