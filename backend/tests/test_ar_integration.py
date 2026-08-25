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


def test_rebuilding_an_unchanged_carpet_produces_the_same_files(admin_client):
    """Reported from the panel: edit a size, rebuild, and the AR file comes back
    showing a small piece of the carpet as if it were the whole carpet.

    Stated as an invariant rather than as the symptom: rebuilding something
    nobody changed must produce what it produced before. Storage is
    content-addressed — the filename is a hash of the bytes — so an unchanged
    texture is an unchanged URL, and this assertion needs nothing decoded.

    Rectification is not idempotent. Feeding a rectified carpet back through
    corner detection finds a rectangle *inside* it — an inner border, a
    medallion — and crops to that, and every rebuild crops again.
    """
    carpet = _make_carpet(admin_client, slug="rebuild-twice", sizes=((200, 300),))
    admin_client.post(
        f"/api/v1/admin/carpets/{carpet['id']}/images",
        files={"file": ("carpet.png", _carpet_photo(), "image/png")},
    )

    admin_client.post(f"/api/v1/admin/carpets/{carpet['id']}/ar/generate")
    first = admin_client.get(f"/api/v1/admin/carpets/{carpet['id']}/ar").json()[0]
    assert first["ar_status"] == "ready", first

    admin_client.post(f"/api/v1/admin/carpets/{carpet['id']}/ar/generate")
    second = admin_client.get(f"/api/v1/admin/carpets/{carpet['id']}/ar").json()[0]
    assert second["ar_status"] == "ready", second

    assert second["glb_url"] == first["glb_url"], (
        "the rebuild produced a different texture from the same photo and the "
        "same size — the second run read the rectified image as its source"
    )
    assert second["usdz_url"] == first["usdz_url"]


def test_the_panel_and_the_pipeline_read_the_same_photo():
    """The corner editor's coordinates have to mean something to the builder.

    `suggest_corners` reads the original upload, so the handles the shopkeeper
    drags are in that image's pixel space. If the builder resolves its source
    any other way — say, to a rectified copy an earlier run left behind — those
    same numbers land somewhere else entirely, and a *corrected* crop comes out
    worse than the one it was correcting.

    No database here on purpose: this is one function's contract, and the pair
    of URLs is the whole input.
    """
    from app.ar.pipeline import _load_source_image
    from app.models import CarpetImage

    storage = Storage()
    original = storage.save(_carpet_photo(size=(1000, 750)), kind="full", ext="png")
    # A rectified copy is a different shape by construction: it has been warped
    # to the carpet's real proportions, so its size gives it away.
    rectified = storage.save(_carpet_photo(size=(400, 600)), kind="rectified", ext="png")

    image = CarpetImage(url=original, rectified_url=rectified)
    loaded = _load_source_image(storage, image)

    assert (loaded.width, loaded.height) == (1000, 750), (
        "the builder warped the rectified copy instead of the photograph the "
        "panel measures corners against"
    )


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


def test_the_editor_reopens_on_the_crop_the_files_were_built_from(admin_client):
    """Reported from the panel: correct the corners, build, leave, come back —
    and the editor is showing the old automatic crop again.

    Nothing recorded what a build had used, so `suggest_corners` had only one
    answer to give and gave it every time: run detection now. For a carpet
    nobody had corrected that looked right, because detection is deterministic.
    For a corrected one it silently threw the correction away on screen while
    the files on disk kept it — so the one view of the crop disagreed with the
    product, and pressing rebuild from that screen undid the fix.

    Both halves are asserted, because either alone can pass while the bug is
    live: `corners` has to *become* the manual ones, and `detected` has to stay
    what the detector says — that is what «بازگرداندن گوشه‌های تشخیص‌داده‌شده»
    puts back, and a version that simply renamed the field would break it.
    """
    carpet = _make_carpet(admin_client, slug="corners-remembered", sizes=((200, 300),))
    admin_client.post(
        f"/api/v1/admin/carpets/{carpet['id']}/images",
        files={"file": ("carpet.png", _carpet_photo(), "image/png")},
    )
    corners_url = f"/api/v1/admin/carpets/{carpet['id']}/ar/corners"

    before = admin_client.get(corners_url).json()
    assert before["source"] == "detected", "nothing has been built yet"
    assert before["corners"] == before["detected"]

    # Deliberately not where the detector would put them, so that «did it come
    # back» cannot be satisfied by a coincidence.
    manual = [
        {"x": 100.0, "y": 80.0},
        {"x": 700.0, "y": 90.0},
        {"x": 690.0, "y": 500.0},
        {"x": 110.0, "y": 495.0},
    ]
    assert manual != before["detected"]

    built = admin_client.post(
        f"/api/v1/admin/carpets/{carpet['id']}/ar/generate", json={"corners": manual}
    )
    assert built.json()["status"] == "ready", built.text

    after = admin_client.get(corners_url).json()
    assert after["corners"] == manual, (
        "the editor reopened on a fresh detection instead of the crop the AR "
        "files standing on disk were actually built from"
    )
    assert after["source"] == "manual"
    assert after["detected"] == before["detected"], (
        "detection is what the «back to automatic» button puts back; it must "
        "still be reported beside the saved crop"
    )
    # A crop a person placed is not a crop to warn them about, however unsure
    # the detector was about its own answer.
    assert after["needs_review"] is False


def test_an_automatic_build_is_remembered_as_automatic(admin_client):
    """The same memory, for the build nobody touched.

    Worth its own test because the two are stored by one line and told apart by
    one flag: if the pipeline wrote its `corners` argument rather than the
    corners rectification actually used, this case would save nothing at all —
    the argument is `None` here — and the screen would go back to guessing.
    """
    carpet = _make_carpet(admin_client, slug="corners-automatic", sizes=((200, 300),))
    admin_client.post(
        f"/api/v1/admin/carpets/{carpet['id']}/images",
        files={"file": ("carpet.png", _carpet_photo(), "image/png")},
    )
    corners_url = f"/api/v1/admin/carpets/{carpet['id']}/ar/corners"
    detected = admin_client.get(corners_url).json()["detected"]

    admin_client.post(f"/api/v1/admin/carpets/{carpet['id']}/ar/generate")

    after = admin_client.get(corners_url).json()
    assert after["source"] == "automatic"
    assert after["corners"] == detected


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
