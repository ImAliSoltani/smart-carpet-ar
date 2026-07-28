"""Integration tests against real Postgres+pgvector (the Phase-1 completion
criterion as an executable test: add carpet → filter → visual search on a new
image → order → track)."""

from io import BytesIO

from PIL import Image


def _png(color, size=(640, 960)) -> bytes:
    buffer = BytesIO()
    Image.new("RGB", size, color).save(buffer, format="PNG")
    return buffer.getvalue()


def _create_carpet(admin_client, slug="kashan-red", name="فرش کاشان قرمز") -> dict:
    response = admin_client.post(
        "/api/v1/admin/carpets",
        json={
            "slug": slug,
            "name": name,
            "description": "فرش دستباف با نقشه‌ی لچک ترنج",
            "pattern": "lachak_toranj",
            "material": "wool",
            "colors": ["#8b1e1e", "#f0e0c0"],
            "suitable_rooms": ["living_room"],
            "origin": "کاشان",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_admin_requires_auth(client):
    assert client.get("/api/v1/admin/me").status_code == 401
    assert (
        client.post("/api/v1/admin/carpets", json={}).status_code in (401, 422)
    )  # auth runs before body validation → 401


def test_full_shop_cycle(admin_client):
    carpet = _create_carpet(admin_client)
    carpet_id = carpet["id"]

    # two sizes, each will get its own AR asset later
    for width, length, price in ((200, 300, 12_000_000), (250, 350, 18_500_000)):
        response = admin_client.post(
            f"/api/v1/admin/carpets/{carpet_id}/variants",
            json={"width_cm": width, "length_cm": length, "price": price, "stock": 3},
        )
        assert response.status_code == 201, response.text

    red = _png((139, 30, 30))
    response = admin_client.post(
        f"/api/v1/admin/carpets/{carpet_id}/images",
        files={"file": ("carpet.png", red, "image/png")},
    )
    assert response.status_code == 201, response.text
    assert response.json()["is_primary"] is True

    # a second, visually different carpet to make search results meaningful
    other = _create_carpet(admin_client, slug="blue-modern", name="فرش مدرن آبی")
    admin_client.post(
        f"/api/v1/admin/carpets/{other['id']}/variants",
        json={"width_cm": 160, "length_cm": 230, "price": 9_000_000, "stock": 1},
    )
    admin_client.post(
        f"/api/v1/admin/carpets/{other['id']}/images",
        files={"file": ("blue.png", _png((25, 40, 120)), "image/png")},
    )

    # --- public catalog ---
    listing = admin_client.get("/api/v1/carpets").json()
    assert listing["total"] == 2
    assert all(item["primary_image"] for item in listing["items"])

    filtered = admin_client.get(
        "/api/v1/carpets", params={"material": "wool", "min_price": 10_000_000}
    ).json()
    assert [item["slug"] for item in filtered["items"]] == ["kashan-red"]

    text_search = admin_client.get("/api/v1/carpets", params={"q": "کاشان"}).json()
    assert text_search["total"] == 1

    detail = admin_client.get("/api/v1/carpets/kashan-red").json()
    assert len(detail["variants"]) == 2 and len(detail["images"]) == 1

    # --- visual search with a NEW image (near-identical to the red carpet) ---
    query = _png((139, 30, 31))
    response = admin_client.post(
        "/api/v1/search/visual", files={"image": ("query.png", query, "image/png")}
    )
    assert response.status_code == 200, response.text
    results = response.json()["results"]
    assert results and results[0]["carpet"]["slug"] == "kashan-red"

    # --- similar carpets on the product page ---
    similar = admin_client.get(f"/api/v1/carpets/{carpet_id}/similar").json()
    assert [r["carpet"]["slug"] for r in similar["results"]] == ["blue-modern"]

    # --- guest order with Persian-digit phone ---
    variant_id = detail["variants"][0]["id"]
    response = admin_client.post(
        "/api/v1/orders",
        json={
            "customer_name": "مشتری آزمایشی",
            "customer_phone": "۰۹۱۲۳۴۵۶۷۸۹",
            "address": "تهران، خیابان آزادی، پلاک ۱۰",
            "items": [{"variant_id": variant_id, "quantity": 2}],
        },
    )
    assert response.status_code == 201, response.text
    order = response.json()
    assert order["total"] == "24000000"
    reference = order["reference"]

    # stock decremented
    detail_after = admin_client.get("/api/v1/carpets/kashan-red").json()
    assert detail_after["variants"][0]["stock"] == 1

    # over-stock rejected with a Persian message
    response = admin_client.post(
        "/api/v1/orders",
        json={
            "customer_name": "مشتری دوم",
            "customer_phone": "09121112233",
            "address": "اصفهان، خیابان چهارباغ، کوچه‌ی دوم",
            "items": [{"variant_id": variant_id, "quantity": 5}],
        },
    )
    assert response.status_code == 409

    # --- tracking: right pair works, wrong phone leaks nothing ---
    track = admin_client.post(
        "/api/v1/orders/track",
        json={"reference": reference, "customer_phone": "09123456789"},
    )
    assert track.status_code == 200
    assert track.json()["items"][0]["carpet_name"] == "فرش کاشان قرمز"

    wrong = admin_client.post(
        "/api/v1/orders/track",
        json={"reference": reference, "customer_phone": "09999999999"},
    )
    assert wrong.status_code == 404

    # --- admin order management ---
    orders = admin_client.get("/api/v1/admin/orders").json()
    assert len(orders) == 1
    response = admin_client.patch("/api/v1/admin/orders/1", json={"status": "confirmed"})
    assert response.json()["status"] == "confirmed"


def test_variant_duplicate_size_rejected(admin_client):
    carpet = _create_carpet(admin_client)
    payload = {"width_cm": 200, "length_cm": 300, "price": 1_000_000, "stock": 1}
    first = admin_client.post(f"/api/v1/admin/carpets/{carpet['id']}/variants", json=payload)
    assert first.status_code == 201
    duplicate = admin_client.post(
        f"/api/v1/admin/carpets/{carpet['id']}/variants", json=payload
    )
    assert duplicate.status_code == 409


def test_primary_image_switch(admin_client):
    carpet = _create_carpet(admin_client)
    ids = []
    for color in ((150, 20, 20), (20, 150, 20)):
        response = admin_client.post(
            f"/api/v1/admin/carpets/{carpet['id']}/images",
            files={"file": ("x.png", _png(color), "image/png")},
        )
        ids.append(response.json()["id"])

    response = admin_client.patch(f"/api/v1/images/{ids[1]}", json={"is_primary": True})
    assert response.status_code == 404  # wrong prefix — admin routes live under /admin
    response = admin_client.patch(
        f"/api/v1/admin/images/{ids[1]}", json={"is_primary": True}
    )
    assert response.json()["is_primary"] is True

    detail = admin_client.get(f"/api/v1/carpets/{carpet['slug']}").json()
    primary = [img for img in detail["images"] if img["is_primary"]]
    assert len(primary) == 1 and primary[0]["id"] == ids[1]
