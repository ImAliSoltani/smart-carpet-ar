"""Phase 2's completion criterion as an executable test.

A shopkeeper uploads one ordinary photo and registers the sizes they stock;
every size must come back with its own AR files carrying its own real
dimensions, and the storefront must serve those files to the buyer.
"""

import struct
import zipfile
from io import BytesIO

from PIL import Image, ImageDraw

from app.services.storage import Storage


def _carpet_photo(size=(1000, 750)) -> bytes:
    """A carpet shot at an angle on a plain floor."""
    image = Image.new("RGB", size, (208, 202, 192))
    draw = ImageDraw.Draw(image)
    quad = [(190, 140), (830, 190), (790, 620), (150, 570)]
    draw.polygon(quad, fill=(140, 32, 38))
    inner = [(x + (size[0] // 2 - x) * 0.14, y + (size[1] // 2 - y) * 0.14) for x, y in quad]
    draw.polygon(inner, outline=(232, 214, 172), width=12)
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _make_carpet(admin_client, slug="ar-test", sizes=((200, 300), (250, 350))) -> dict:
    carpet = admin_client.post(
        "/api/v1/admin/carpets",
        json={
            "slug": slug,
            "name": "فرش آزمایش واقعیت افزوده",
            "pattern": "medallion",
            "material": "wool",
            "colors": [],
            "suitable_rooms": ["living_room"],
        },
    ).json()
    for width, length in sizes:
        response = admin_client.post(
            f"/api/v1/admin/carpets/{carpet['id']}/variants",
            json={"width_cm": width, "length_cm": length, "price": 10_000_000, "stock": 2},
        )
        assert response.status_code == 201, response.text
    return carpet


def _glb_dimensions(path):
    data = path.read_bytes()
    import json

    json_len = struct.unpack("<II", data[12:20])[0]
    gltf = json.loads(data[20 : 20 + json_len])
    accessor = gltf["accessors"][0]
    lo, hi = accessor["min"], accessor["max"]
    return round(hi[0] - lo[0], 4), round(hi[2] - lo[2], 4)


def test_one_photo_becomes_ar_assets_for_every_size(admin_client):
    carpet = _make_carpet(admin_client)
    upload = admin_client.post(
        f"/api/v1/admin/carpets/{carpet['id']}/images",
        files={"file": ("carpet.png", _carpet_photo(), "image/png")},
    )
    assert upload.status_code == 201, upload.text

    response = admin_client.post(f"/api/v1/admin/carpets/{carpet['id']}/ar/generate")
    assert response.status_code == 202, response.text

    statuses = admin_client.get(f"/api/v1/admin/carpets/{carpet['id']}/ar").json()
    assert len(statuses) == 2
    assert {s["ar_status"] for s in statuses} == {"ready"}, statuses

    storage = Storage()
    by_size = {(s["width_cm"], s["length_cm"]): s for s in statuses}

    # each size carries ITS OWN real dimensions — this is the whole point
    for (width_cm, length_cm), status in by_size.items():
        glb = storage.open_public_url(status["glb_url"])
        assert _glb_dimensions(glb) == (width_cm / 100, length_cm / 100)

        usdz = storage.open_public_url(status["usdz_url"])
        with zipfile.ZipFile(usdz) as archive:
            scene = archive.read(archive.namelist()[0]).decode()
        assert f"({-width_cm / 200}, 0, {-length_cm / 200})" in scene

    assert by_size[(200, 300)]["glb_url"] != by_size[(250, 350)]["glb_url"]

    # and the buyer-facing catalog serves them
    detail = admin_client.get(f"/api/v1/carpets/{carpet['slug']}").json()
    assert all(v["glb_url"] and v["usdz_url"] for v in detail["variants"])
    assert all(v["ar_status"] == "ready" for v in detail["variants"])


def test_manual_corners_are_applied_inline(admin_client):
    carpet = _make_carpet(admin_client, slug="manual-corners", sizes=((200, 300),))
    admin_client.post(
        f"/api/v1/admin/carpets/{carpet['id']}/images",
        files={"file": ("carpet.png", _carpet_photo(), "image/png")},
    )

    response = admin_client.post(
        f"/api/v1/admin/carpets/{carpet['id']}/ar/generate",
        json={
            "corners": [
                {"x": 100, "y": 80},
                {"x": 700, "y": 90},
                {"x": 690, "y": 500},
                {"x": 110, "y": 495},
            ]
        },
    )
    assert response.status_code == 202, response.text
    assert response.json()["status"] == "ready"  # human corners run synchronously

    statuses = admin_client.get(f"/api/v1/admin/carpets/{carpet['id']}/ar").json()
    assert statuses[0]["ar_status"] == "ready"
    assert statuses[0]["glb_url"]


def test_corner_suggestion_reports_confidence(admin_client):
    carpet = _make_carpet(admin_client, slug="corner-suggest", sizes=((200, 300),))
    admin_client.post(
        f"/api/v1/admin/carpets/{carpet['id']}/images",
        files={"file": ("carpet.png", _carpet_photo(), "image/png")},
    )

    suggestion = admin_client.get(f"/api/v1/admin/carpets/{carpet['id']}/ar/corners").json()
    assert len(suggestion["corners"]) == 4
    assert 0.0 <= suggestion["confidence"] <= 1.0
    assert suggestion["image_width"] > 0 and suggestion["image_height"] > 0
    # needs_review must agree with the confidence it reported
    assert suggestion["needs_review"] == (suggestion["confidence"] < 0.55)


def test_generation_refuses_without_photo_or_sizes(admin_client):
    sizeless = admin_client.post(
        "/api/v1/admin/carpets",
        json={
            "slug": "no-sizes",
            "name": "بدون سایز",
            "pattern": "modern",
            "material": "acrylic",
            "colors": [],
            "suitable_rooms": [],
        },
    ).json()
    response = admin_client.post(f"/api/v1/admin/carpets/{sizeless['id']}/ar/generate")
    assert response.status_code == 409

    photoless = _make_carpet(admin_client, slug="no-photo", sizes=((150, 225),))
    response = admin_client.post(f"/api/v1/admin/carpets/{photoless['id']}/ar/generate")
    assert response.status_code == 409


def test_ar_endpoints_require_admin(client):
    assert client.get("/api/v1/admin/carpets/1/ar").status_code == 401
    assert client.post("/api/v1/admin/carpets/1/ar/generate").status_code == 401
    assert client.get("/api/v1/admin/carpets/1/ar/corners").status_code == 401
