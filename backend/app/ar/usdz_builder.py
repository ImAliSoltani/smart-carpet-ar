"""Build a real-scale `.usdz` AR asset for iOS Quick Look.

iOS Safari has no WebXR, so `<model-viewer>` hands iPhones a `.usdz` file. A
USDZ is simply an *uncompressed* zip of a USD scene plus its textures, with
every entry's payload starting on a 64-byte boundary so the runtime can mmap it.
Both facts let us write one from scratch — same approach as `glb_builder`, no
heavy USD toolchain, nothing to install on the server.

Geometry mirrors the GLB exactly: one flat quad in the XZ plane, +Y up, sized in
metres, so Android and iOS place the identical carpet.
"""

from __future__ import annotations

import zipfile
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

from PIL import Image

ALIGNMENT = 64
TEXTURE_NAME = "textures/carpet.jpg"


@dataclass
class UsdzAsset:
    usdz_path: Path
    width_m: float
    length_m: float
    texture_px: tuple[int, int]
    file_size: int


def _usda_scene(name: str, width_m: float, length_m: float) -> str:
    """A single textured quad with a UsdPreviewSurface material.

    Quick Look reads `metersPerUnit`, so writing points in metres and declaring
    1.0 here is what makes the carpet appear at its true size on the floor.
    """
    hw, hl = width_m / 2.0, length_m / 2.0
    material = f"/{name}/Materials/CarpetMaterial"
    return f"""#usda 1.0
(
    defaultPrim = "{name}"
    metersPerUnit = 1
    upAxis = "Y"
)

def Xform "{name}" (
    assetInfo = {{
        string name = "{name}"
    }}
    kind = "component"
)
{{
    def Mesh "Carpet"
    {{
        uniform bool doubleSided = 1
        float3[] extent = [({-hw}, 0, {-hl}), ({hw}, 0, {hl})]
        int[] faceVertexCounts = [4]
        int[] faceVertexIndices = [0, 2, 3, 1]
        point3f[] points = [
            ({-hw}, 0, {-hl}),
            ({hw}, 0, {-hl}),
            ({-hw}, 0, {hl}),
            ({hw}, 0, {hl})
        ]
        normal3f[] normals = [(0, 1, 0), (0, 1, 0), (0, 1, 0), (0, 1, 0)] (
            interpolation = "vertex"
        )
        texCoord2f[] primvars:st = [(0, 1), (1, 1), (0, 0), (1, 0)] (
            interpolation = "vertex"
        )
        rel material:binding = <{material}>
        uniform token subdivisionScheme = "none"
    }}

    def Scope "Materials"
    {{
        def Material "CarpetMaterial"
        {{
            token outputs:surface.connect = <{material}/Surface.outputs:surface>

            def Shader "Surface"
            {{
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor.connect = <{material}/Texture.outputs:rgb>
                float inputs:metallic = 0
                float inputs:roughness = 0.95
                float inputs:opacity = 1
                token outputs:surface
            }}

            def Shader "Texture"
            {{
                uniform token info:id = "UsdUVTexture"
                asset inputs:file = @{TEXTURE_NAME}@
                float2 inputs:st.connect = <{material}/UvReader.outputs:result>
                token inputs:wrapS = "clamp"
                token inputs:wrapT = "clamp"
                float3 outputs:rgb
            }}

            def Shader "UvReader"
            {{
                uniform token info:id = "UsdPrimvarReader_float2"
                token inputs:varname = "st"
                float2 outputs:result
            }}
        }}
    }}
}}
"""


def _write_aligned(archive: zipfile.ZipFile, name: str, data: bytes) -> None:
    """Store `data` uncompressed with its payload 64-byte aligned.

    Padding goes in the local header's extra field, which readers skip.
    """
    info = zipfile.ZipInfo(name)
    info.compress_type = zipfile.ZIP_STORED
    header_end = archive.fp.tell() + 30 + len(name.encode("utf-8"))  # type: ignore[union-attr]
    padding = (ALIGNMENT - header_end % ALIGNMENT) % ALIGNMENT
    info.extra = b"\x00" * padding
    archive.writestr(info, data)


def build_carpet_usdz(
    image: Image.Image | str | Path,
    width_m: float,
    length_m: float,
    out_path: str | Path,
    *,
    name: str = "Carpet",
    max_texture_px: int = 2048,
    quality: int = 92,
) -> UsdzAsset:
    """Write a `width_m` x `length_m` textured quad as a Quick Look-ready USDZ."""
    if width_m <= 0 or length_m <= 0:
        raise ValueError("carpet dimensions must be positive meters")

    if not isinstance(image, Image.Image):
        image = Image.open(image)
    texture = image.convert("RGB")
    if max(texture.size) > max_texture_px:
        texture.thumbnail((max_texture_px, max_texture_px), Image.LANCZOS)

    buffer = BytesIO()
    texture.save(buffer, format="JPEG", quality=quality, optimize=True)
    texture_bytes = buffer.getvalue()

    # USD identifiers cannot contain '-' or start with a digit.
    prim_name = "".join(ch if ch.isalnum() or ch == "_" else "_" for ch in name) or "Carpet"
    if prim_name[0].isdigit():
        prim_name = f"_{prim_name}"

    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_STORED) as archive:
        # The scene must be the first entry in the archive.
        scene = _usda_scene(prim_name, width_m, length_m).encode()
        _write_aligned(archive, f"{prim_name}.usda", scene)
        _write_aligned(archive, TEXTURE_NAME, texture_bytes)

    return UsdzAsset(
        usdz_path=out_path,
        width_m=width_m,
        length_m=length_m,
        texture_px=texture.size,
        file_size=out_path.stat().st_size,
    )
