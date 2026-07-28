"""Inspect a .glb and report its real-world dimensions.

Used to verify that generated AR assets carry true scale, and to compare against
reference/commercial assets in the thesis evaluation chapter.

    uv run python scripts/inspect_glb.py <file.glb> [more.glb ...]
"""

import json
import struct
import sys
from pathlib import Path


def inspect(path: Path) -> None:
    data = path.read_bytes()
    magic, version, length = struct.unpack("<III", data[:12])
    if magic != 0x46546C67:
        print(f"{path.name}: not a GLB file")
        return

    json_len = struct.unpack("<II", data[12:20])[0]
    gltf = json.loads(data[20 : 20 + json_len])

    node = gltf["nodes"][0]
    transform_keys = [k for k in ("scale", "matrix", "rotation", "translation") if k in node]

    print(f"\n=== {path.name}  ({length:,} bytes, glTF {version})")
    print(f"    generator : {gltf['asset'].get('generator', '?')}")
    print(f"    root node : {node.get('name', '(unnamed)')}"
          f"{'  transform: ' + ', '.join(transform_keys) if transform_keys else '  (no transform)'}")

    for mesh_index, mesh in enumerate(gltf.get("meshes", [])):
        for prim in mesh["primitives"]:
            acc = gltf["accessors"][prim["attributes"]["POSITION"]]
            lo, hi = acc["min"], acc["max"]
            print(
                f"    mesh {mesh_index}   : {acc['count']} verts | "
                f"X {hi[0] - lo[0]:.4f} m  Y {hi[1] - lo[1]:.4f} m  Z {hi[2] - lo[2]:.4f} m"
            )

    for image in gltf.get("images", []):
        print(f"    texture   : {image.get('mimeType', '?')}")


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        raise SystemExit(1)
    for arg in sys.argv[1:]:
        inspect(Path(arg))


if __name__ == "__main__":
    main()
