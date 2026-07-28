"""Build a real-scale AR asset (.glb) for a carpet from a single top-down image.

A carpet is modeled as a flat textured quad lying on the ground plane (XZ, +Y up),
sized in real-world meters (glTF units are meters). This is what commercial AR
product viewers do for flat goods — here it is generated automatically and at
the true catalog dimensions, which is the core differentiator of this project.

Pure-python GLB writer: no 3D library needed, only Pillow for image handling.
"""

from __future__ import annotations

import json
import struct
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

from PIL import Image

GLB_MAGIC = 0x46546C67  # 'glTF'
CHUNK_JSON = 0x4E4F534A  # 'JSON'
CHUNK_BIN = 0x004E4942  # 'BIN\0'

FLOAT = 5126
UNSIGNED_SHORT = 5123
ARRAY_BUFFER = 34962
ELEMENT_ARRAY_BUFFER = 34963
LINEAR = 9729
LINEAR_MIPMAP_LINEAR = 9987
CLAMP_TO_EDGE = 33071


@dataclass
class CarpetAsset:
    glb_path: Path
    width_m: float
    length_m: float
    texture_px: tuple[int, int]
    file_size: int


def _pad(data: bytes, alignment: int = 4, fill: bytes = b"\x00") -> bytes:
    remainder = len(data) % alignment
    return data if remainder == 0 else data + fill * (alignment - remainder)


def _prepare_texture(image: Image.Image, max_px: int) -> tuple[bytes, str, tuple[int, int]]:
    """Normalize the texture: bounded size, JPEG for photos, PNG if alpha is present."""
    image = image.convert("RGBA") if "A" in image.getbands() else image.convert("RGB")
    if max(image.size) > max_px:
        image.thumbnail((max_px, max_px), Image.LANCZOS)

    buffer = BytesIO()
    if image.mode == "RGBA":
        image.save(buffer, format="PNG", optimize=True)
        return buffer.getvalue(), "image/png", image.size
    image.save(buffer, format="JPEG", quality=92, optimize=True)
    return buffer.getvalue(), "image/jpeg", image.size


def build_carpet_glb(
    image: Image.Image | str | Path,
    width_m: float,
    length_m: float,
    out_path: str | Path,
    *,
    name: str = "Carpet",
    max_texture_px: int = 4096,
) -> CarpetAsset:
    """Write a GLB containing a width_m × length_m textured quad, top of the image
    facing -Z. Returns metadata about the produced asset."""
    if width_m <= 0 or length_m <= 0:
        raise ValueError("carpet dimensions must be positive meters")

    if not isinstance(image, Image.Image):
        image = Image.open(image)
    texture_bytes, mime_type, texture_px = _prepare_texture(image, max_texture_px)

    hw, hl = width_m / 2.0, length_m / 2.0
    positions = [
        (-hw, 0.0, -hl),  # 0: back-left  (texture top-left)
        (hw, 0.0, -hl),  # 1: back-right (texture top-right)
        (-hw, 0.0, hl),  # 2: front-left
        (hw, 0.0, hl),  # 3: front-right
    ]
    normals = [(0.0, 1.0, 0.0)] * 4
    uvs = [(0.0, 0.0), (1.0, 0.0), (0.0, 1.0), (1.0, 1.0)]
    indices = [0, 2, 3, 0, 3, 1]  # CCW seen from +Y (above)

    position_bin = b"".join(struct.pack("<3f", *v) for v in positions)
    normal_bin = b"".join(struct.pack("<3f", *v) for v in normals)
    uv_bin = b"".join(struct.pack("<2f", *v) for v in uvs)
    index_bin = b"".join(struct.pack("<H", i) for i in indices)

    views: list[dict] = []
    blob = b""

    def add_view(data: bytes, target: int | None) -> int:
        nonlocal blob
        blob = _pad(blob)
        view = {"buffer": 0, "byteOffset": len(blob), "byteLength": len(data)}
        if target is not None:
            view["target"] = target
        views.append(view)
        blob += data
        return len(views) - 1

    v_pos = add_view(position_bin, ARRAY_BUFFER)
    v_nrm = add_view(normal_bin, ARRAY_BUFFER)
    v_uv = add_view(uv_bin, ARRAY_BUFFER)
    v_idx = add_view(index_bin, ELEMENT_ARRAY_BUFFER)
    v_img = add_view(texture_bytes, None)

    gltf = {
        "asset": {"version": "2.0", "generator": "farsh-ar-pipeline"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"name": name, "mesh": 0}],
        "meshes": [
            {
                "primitives": [
                    {
                        "attributes": {"POSITION": 0, "NORMAL": 1, "TEXCOORD_0": 2},
                        "indices": 3,
                        "material": 0,
                    }
                ]
            }
        ],
        "accessors": [
            {
                "bufferView": v_pos,
                "componentType": FLOAT,
                "count": 4,
                "type": "VEC3",
                "min": [-hw, 0.0, -hl],
                "max": [hw, 0.0, hl],
            },
            {"bufferView": v_nrm, "componentType": FLOAT, "count": 4, "type": "VEC3"},
            {"bufferView": v_uv, "componentType": FLOAT, "count": 4, "type": "VEC2"},
            {"bufferView": v_idx, "componentType": UNSIGNED_SHORT, "count": 6, "type": "SCALAR"},
        ],
        "materials": [
            {
                "name": f"{name}-material",
                "pbrMetallicRoughness": {
                    "baseColorTexture": {"index": 0},
                    "metallicFactor": 0.0,
                    "roughnessFactor": 0.95,
                },
                "doubleSided": True,
            }
        ],
        "textures": [{"sampler": 0, "source": 0}],
        "samplers": [
            {
                "magFilter": LINEAR,
                "minFilter": LINEAR_MIPMAP_LINEAR,
                "wrapS": CLAMP_TO_EDGE,
                "wrapT": CLAMP_TO_EDGE,
            }
        ],
        "images": [{"bufferView": v_img, "mimeType": mime_type}],
        "bufferViews": views,
        "buffers": [{"byteLength": len(_pad(blob))}],
    }

    json_chunk = _pad(json.dumps(gltf, separators=(",", ":")).encode("utf-8"), fill=b" ")
    bin_chunk = _pad(blob)
    total = 12 + 8 + len(json_chunk) + 8 + len(bin_chunk)

    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "wb") as f:
        f.write(struct.pack("<III", GLB_MAGIC, 2, total))
        f.write(struct.pack("<II", len(json_chunk), CHUNK_JSON))
        f.write(json_chunk)
        f.write(struct.pack("<II", len(bin_chunk), CHUNK_BIN))
        f.write(bin_chunk)

    return CarpetAsset(
        glb_path=out_path,
        width_m=width_m,
        length_m=length_m,
        texture_px=texture_px,
        file_size=total,
    )
