"""The two read endpoints the admin panel needs that the shop's own API cannot give it.

Both exist because the storefront's view is deliberately narrower than the
shopkeeper's: `/api/v1/carpets` hides deactivated carpets, and `/admin/orders`
caps its response, so neither a management table nor a counter can be built by
reading them.
"""

from io import BytesIO

from PIL import Image


def _png(color, size=(640, 960)) -> bytes:
    buffer = BytesIO()
    Image.new("RGB", size, color).save(buffer, format="PNG")
    return buffer.getvalue()


def _carpet(admin_client, slug: str, name: str) -> dict:
    response = admin_client.post(
        "/api/v1/admin/carpets",
        json={
            "slug": slug,
            "name": name,
            "pattern": "lachak_toranj",
            "material": "wool",
            "colors": ["#8b1e1e"],
            "suitable_rooms": ["living_room"],
            "origin": "کاشان",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_admin_reads_require_auth(client):
    assert client.get("/api/v1/admin/stats").status_code == 401
    assert client.get("/api/v1/admin/carpets").status_code == 401


def test_stats_counts_from_the_database(admin_client):
    empty = admin_client.get("/api/v1/admin/stats").json()
    assert empty["carpets_active"] == 0
    assert empty["orders_pending"] == 0
    # Nothing sold is zero, not null — the dashboard prints this straight out.
    assert empty["confirmed_total"] in (0, "0")

    carpet = _carpet(admin_client, "kashan-red", "فرش کاشان قرمز")
    admin_client.post(
        f"/api/v1/admin/carpets/{carpet['id']}/variants",
        json={"width_cm": 200, "length_cm": 300, "price": "48000000", "stock": 2},
    )
    admin_client.post(
        f"/api/v1/admin/carpets/{carpet['id']}/images",
        files={"file": ("a.png", _png((140, 30, 30)), "image/png")},
    )

    stats = admin_client.get("/api/v1/admin/stats").json()
    assert stats["carpets_active"] == 1
    assert stats["carpets_inactive"] == 0
    assert stats["variants_total"] == 1
    # A size with no AR assets yet is «missing», and the AR counters are per
    # size rather than per carpet because an asset belongs to one size.
    assert stats["ar_missing"] == 1
    assert stats["ar_ready"] == 0

    # Deactivating moves the carpet between counters rather than deleting it.
    admin_client.patch(f"/api/v1/admin/carpets/{carpet['id']}", json={"is_active": False})
    after = admin_client.get("/api/v1/admin/stats").json()
    assert (after["carpets_active"], after["carpets_inactive"]) == (0, 1)


def test_confirmed_total_ignores_pending_orders(admin_client):
    carpet = _carpet(admin_client, "tabriz-blue", "فرش تبریز آبی")
    variant = admin_client.post(
        f"/api/v1/admin/carpets/{carpet['id']}/variants",
        json={"width_cm": 150, "length_cm": 200, "price": "12000000", "stock": 5},
    ).json()

    order = admin_client.post(
        "/api/v1/orders",
        json={
            "customer_name": "علی سلطانی",
            "customer_phone": "09121234567",
            "address": "تهران، خیابان ولیعصر",
            "items": [{"variant_id": variant["id"], "quantity": 1}],
        },
    )
    assert order.status_code == 201, order.text

    listed = admin_client.get("/api/v1/admin/orders").json()[0]
    # The shopkeeper's view carries what fulfilling an order needs and the
    # public tracking response deliberately does not.
    assert listed["customer_phone"] == "09121234567"
    assert listed["address"] == "تهران، خیابان ولیعصر"
    assert listed["created_at"]
    order_id = listed["id"]

    pending = admin_client.get("/api/v1/admin/stats").json()
    assert pending["orders_pending"] == 1
    # Placed but not agreed with the buyer — counting it as a sale would
    # flatter the figure, so it stays out until the status moves.
    assert float(pending["confirmed_total"]) == 0

    admin_client.patch(f"/api/v1/admin/orders/{order_id}", json={"status": "confirmed"})
    confirmed = admin_client.get("/api/v1/admin/stats").json()
    assert confirmed["orders_pending"] == 0
    assert confirmed["orders_confirmed"] == 1
    assert float(confirmed["confirmed_total"]) == 12000000


def test_an_order_line_points_back_at_its_carpet(admin_client):
    """Reported from the panel: an order is a list of names and nothing else.

    The line stores the name, the size and the price it was placed at, and that
    is right — a later catalogue edit must not rewrite the history of an order.
    But a name is not how anybody recognises a rug, and the next thing a
    shopkeeper does after reading an order is go and look at the carpet.

    The two assertions that matter are the id, which is what the panel's own
    link is built from, and the picture. Both hang off the variant the line
    still points at.
    """
    carpet = _carpet(admin_client, "qom-silk", "فرش قم ابریشم")
    variant = admin_client.post(
        f"/api/v1/admin/carpets/{carpet['id']}/variants",
        json={"width_cm": 150, "length_cm": 200, "price": "90000000", "stock": 3},
    ).json()
    admin_client.post(
        f"/api/v1/admin/carpets/{carpet['id']}/images",
        files={"file": ("a.png", _png((30, 60, 140)), "image/png")},
    )

    placed = admin_client.post(
        "/api/v1/orders",
        json={
            "customer_name": "علی سلطانی",
            "customer_phone": "09121234567",
            "address": "تهران، خیابان ولیعصر",
            "items": [{"variant_id": variant["id"], "quantity": 1}],
        },
    )

    # The buyer's own view of the same line stays as narrow as it was: this is
    # a subclass in the panel's schemas, not three more fields on the public
    # one. None of it is secret — it is the catalogue — it is simply not part
    # of the answer to «where is my order».
    assert set(placed.json()["items"][0]) == {
        "carpet_name",
        "width_cm",
        "length_cm",
        "unit_price",
        "quantity",
    }

    order = admin_client.get("/api/v1/admin/orders").json()[0]
    line = order["items"][0]
    assert line["carpet_id"] == carpet["id"]
    assert line["carpet_image"], "the line arrived without the carpet's photograph"

    # The status reply is written straight into the panel's cached list rather
    # than refetched, so it has to carry the same thing — otherwise confirming
    # an order blanks every picture on the screen.
    changed = admin_client.patch(
        f"/api/v1/admin/orders/{order['id']}", json={"status": "confirmed"}
    ).json()
    assert changed["items"][0]["carpet_id"] == carpet["id"]
    assert changed["items"][0]["carpet_image"] == line["carpet_image"]


def test_a_line_whose_size_was_deleted_keeps_its_text(admin_client):
    """Deleting a size must not take the order with it.

    `variant_id` is `ON DELETE SET NULL` so that the order stays readable, which
    means the way back to the carpet is genuinely gone — and the panel has to be
    told that rather than handed a link that leads nowhere.
    """
    carpet = _carpet(admin_client, "kerman-cream", "فرش کرمان کرم")
    variant = admin_client.post(
        f"/api/v1/admin/carpets/{carpet['id']}/variants",
        json={"width_cm": 200, "length_cm": 300, "price": "30000000", "stock": 1},
    ).json()
    admin_client.post(
        f"/api/v1/admin/carpets/{carpet['id']}/images",
        files={"file": ("a.png", _png((200, 190, 160)), "image/png")},
    )
    admin_client.post(
        "/api/v1/orders",
        json={
            "customer_name": "علی سلطانی",
            "customer_phone": "09121234567",
            "address": "تهران، خیابان انقلاب، پلاک ۱۲",
            "items": [{"variant_id": variant["id"], "quantity": 1}],
        },
    )

    assert admin_client.delete(f"/api/v1/admin/variants/{variant['id']}").status_code == 204

    line = admin_client.get("/api/v1/admin/orders").json()[0]["items"][0]
    assert line["carpet_name"] == "فرش کرمان کرم"
    assert line["width_cm"] == 200 and line["length_cm"] == 300
    assert line["carpet_id"] is None
    assert line["carpet_image"] is None


def test_tracking_does_not_echo_the_delivery_address(admin_client):
    """The other half of why the admin order shape is its own.

    Tracking is proven with a reference and a phone number, both of which a
    stranger could guess at; the response must not turn that into an address.
    """
    carpet = _carpet(admin_client, "tabriz-blue", "فرش تبریز آبی")
    variant = admin_client.post(
        f"/api/v1/admin/carpets/{carpet['id']}/variants",
        json={"width_cm": 150, "length_cm": 200, "price": "12000000", "stock": 5},
    ).json()
    created = admin_client.post(
        "/api/v1/orders",
        json={
            "customer_name": "علی سلطانی",
            "customer_phone": "09121234567",
            "address": "تهران، خیابان ولیعصر",
            "items": [{"variant_id": variant["id"], "quantity": 1}],
        },
    ).json()

    tracked = admin_client.post(
        "/api/v1/orders/track",
        json={"reference": created["reference"], "customer_phone": "09121234567"},
    )
    assert tracked.status_code == 200
    body = tracked.json()
    assert "address" not in body
    assert "customer_phone" not in body
    assert "id" not in body


def test_admin_listing_still_finds_a_deactivated_carpet(admin_client):
    """The reason this endpoint exists at all."""
    kept = _carpet(admin_client, "kashan-red", "فرش کاشان قرمز")
    hidden = _carpet(admin_client, "nain-cream", "فرش نایین کرم")
    admin_client.patch(f"/api/v1/admin/carpets/{hidden['id']}", json={"is_active": False})

    shop = admin_client.get("/api/v1/carpets").json()
    assert [item["id"] for item in shop["items"]] == [kept["id"]]

    panel = admin_client.get("/api/v1/admin/carpets").json()
    assert panel["total"] == 2
    assert {row["id"] for row in panel["items"]} == {kept["id"], hidden["id"]}

    only_hidden = admin_client.get(
        "/api/v1/admin/carpets", params={"is_active": False}
    ).json()
    assert [row["id"] for row in only_hidden["items"]] == [hidden["id"]]
    assert only_hidden["items"][0]["is_active"] is False


def test_admin_listing_summarises_each_row(admin_client):
    carpet = _carpet(admin_client, "kashan-red", "فرش کاشان قرمز")
    for width, price in ((150, "9000000"), (200, "24000000")):
        admin_client.post(
            f"/api/v1/admin/carpets/{carpet['id']}/variants",
            json={"width_cm": width, "length_cm": 300, "price": price, "stock": 1},
        )
    admin_client.post(
        f"/api/v1/admin/carpets/{carpet['id']}/images",
        files={"file": ("a.png", _png((140, 30, 30)), "image/png")},
    )

    row = admin_client.get("/api/v1/admin/carpets").json()["items"][0]
    assert row["variants_count"] == 2
    assert row["images_count"] == 1
    assert float(row["min_price"]) == 9000000
    assert float(row["max_price"]) == 24000000
    assert row["primary_image"]
    # Nothing generated yet, so the «۰ از ۲ آماده» the table shows is honest.
    assert row["ar_ready"] == 0


def test_admin_can_open_a_deactivated_carpet(admin_client):
    """The edit screen has to reach the carpet that the shop is hiding."""
    carpet = _carpet(admin_client, "nain-cream", "فرش نایین کرم")
    admin_client.patch(f"/api/v1/admin/carpets/{carpet['id']}", json={"is_active": False})

    # The shop's own lookup is gone, which is correct.
    assert admin_client.get("/api/v1/carpets/nain-cream").status_code == 404

    detail = admin_client.get(f"/api/v1/admin/carpets/{carpet['id']}")
    assert detail.status_code == 200, detail.text
    body = detail.json()
    assert body["slug"] == "nain-cream"
    assert body["name"] == "فرش نایین کرم"
    # Everything the form needs to render itself.
    assert "variants" in body and "images" in body and "suitable_rooms" in body


def test_admin_carpet_detail_404s_for_a_missing_id(admin_client):
    assert admin_client.get("/api/v1/admin/carpets/99999").status_code == 404


def test_admin_listing_searches_by_name(admin_client):
    _carpet(admin_client, "kashan-red", "فرش کاشان قرمز")
    _carpet(admin_client, "nain-cream", "فرش نایین کرم")

    found = admin_client.get("/api/v1/admin/carpets", params={"q": "نایین"}).json()
    assert [row["slug"] for row in found["items"]] == ["nain-cream"]
    assert found["total"] == 1
