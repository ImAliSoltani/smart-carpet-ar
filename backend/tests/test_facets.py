"""The filter panel's numbers.

Every assertion here exists because getting it wrong is silent. A facet keyed
the wrong way still returns 200 and still renders — as a chip with no label and
no count — so the failure only shows up as an interface that looks half-built.
"""

from io import BytesIO

from PIL import Image

from app.models.enums import CarpetMaterial, CarpetPattern, ColorFamily, RoomType


def _png(rgb: tuple[int, int, int]) -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (400, 600), rgb).save(buffer, format="PNG")
    return buffer.getvalue()


def _create(admin_client, slug, *, pattern, material, rooms, prices, photo=None):
    response = admin_client.post(
        "/api/v1/admin/carpets",
        json={
            "slug": slug,
            "name": f"فرش {slug}",
            "pattern": pattern,
            "material": material,
            "colors": ["#8b1e1e"],
            "suitable_rooms": rooms,
            "origin": "کاشان",
        },
    )
    assert response.status_code == 201, response.text
    carpet = response.json()
    if photo is not None:
        # Colour families are derived from the photograph, never typed in, so a
        # carpet only enters the colour facet by being photographed.
        uploaded = admin_client.post(
            f"/api/v1/admin/carpets/{carpet['id']}/images",
            files={"file": (f"{slug}.png", _png(photo), "image/png")},
        )
        assert uploaded.status_code == 201, uploaded.text
    for i, price in enumerate(prices):
        created = admin_client.post(
            f"/api/v1/admin/carpets/{carpet['id']}/variants",
            json={
                "width_cm": 150 + i * 50,
                "length_cm": 225 + i * 50,
                "price": str(price),
                "stock": 1,
            },
        )
        assert created.status_code == 201, created.text
    return carpet


def test_facets_count_and_bracket_the_catalogue(client, admin_client) -> None:
    _create(
        admin_client,
        "silk-one",
        pattern="lachak_toranj",
        material="silk",
        rooms=["living_room", "bedroom"],
        prices=[10_000_000, 90_000_000],
    )
    _create(
        admin_client,
        "wool-one",
        pattern="afshan",
        material="wool",
        rooms=["living_room"],
        prices=[5_000_000],
    )

    facets = client.get("/api/v1/carpets/facets")
    assert facets.status_code == 200, facets.text
    body = facets.json()

    assert body["patterns"]["lachak_toranj"] == 1
    assert body["materials"]["silk"] == 1

    # A carpet counts once per room it suits, so the array column has to be
    # unnested rather than grouped whole.
    assert body["rooms"]["living_room"] == 2
    assert body["rooms"]["bedroom"] == 1

    assert float(body["min_price"]) == 5_000_000
    assert float(body["max_price"]) == 90_000_000

    # One bar per bucket, and every purchasable size counted exactly once —
    # the top price must land in the last bucket rather than off the end.
    histogram = body["price_histogram"]
    assert len(histogram) == 32
    assert sum(histogram) == 3


def test_facet_keys_are_the_values_the_api_speaks(client, admin_client) -> None:
    """Not the names Postgres stores.

    The column holds `LIVING_ROOM`; the API speaks `living_room`. Unnesting an
    array column steps outside the Enum type and returns the stored name, which
    made rooms the one facet keyed differently from the rest — invisible until
    a label lookup on the storefront came back undefined.
    """
    _create(
        admin_client,
        "case-check",
        pattern="geometric",
        material="cotton",
        rooms=["office", "kids_room"],
        prices=[3_000_000],
    )

    body = client.get("/api/v1/carpets/facets").json()

    for key in body["rooms"]:
        assert key == RoomType(key).value
    for key in body["patterns"]:
        assert key == CarpetPattern(key).value
    for key in body["materials"]:
        assert key == CarpetMaterial(key).value
    for key in body["colors"]:
        assert key == ColorFamily(key).value


def test_colour_is_a_facet_and_a_filter(client, admin_client) -> None:
    """The pair that could not exist while colour was stored as exact hex.

    Dominant colours are read off each photograph, so grouping the catalogue by
    them gave one carpet per bucket and the filter matched a hex string a
    shopper had no way to know. Both now work off named families, and both have
    to keep working off the same vocabulary — a facet the filter cannot accept
    renders as a chip that returns nothing.
    """
    _create(
        admin_client,
        "navy-one",
        pattern="lachak_toranj",
        material="silk",
        rooms=["living_room"],
        prices=[8_000_000],
        photo=(40, 60, 150),
    )
    _create(
        admin_client,
        "navy-two",
        pattern="afshan",
        material="wool",
        rooms=["bedroom"],
        prices=[6_000_000],
        photo=(35, 55, 140),
    )
    _create(
        admin_client,
        "crimson-one",
        pattern="medallion",
        material="wool",
        rooms=["living_room"],
        prices=[7_000_000],
        photo=(180, 30, 40),
    )

    body = client.get("/api/v1/carpets/facets").json()
    assert body["colors"]["blue"] == 2
    assert body["colors"]["red"] == 1

    # Every key the facet offers is a value the filter accepts.
    for key, count in body["colors"].items():
        narrowed = client.get("/api/v1/carpets", params={"color": [key]}).json()
        assert narrowed["total"] == count, f"facet and filter disagree on {key}"

    # Several colours in one group are alternatives, like every other facet.
    either = client.get("/api/v1/carpets", params={"color": ["blue", "red"]}).json()
    assert either["total"] == 3

    # And colour narrows across groups rather than widening.
    both = client.get(
        "/api/v1/carpets", params={"color": ["blue", "red"], "material": ["wool"]}
    ).json()
    assert {item["slug"] for item in both["items"]} == {"navy-two", "crimson-one"}


def test_facets_is_not_read_as_a_carpet_slug(client) -> None:
    """`/carpets/facets` must not be matched by `/carpets/{slug}`."""
    assert client.get("/api/v1/carpets/facets").status_code == 200


def test_one_facet_takes_several_values_as_alternatives(client, admin_client) -> None:
    """Two ticks in the same group widen; ticks in different groups narrow."""
    _create(
        admin_client,
        "multi-silk",
        pattern="lachak_toranj",
        material="silk",
        rooms=["living_room"],
        prices=[10_000_000],
    )
    _create(
        admin_client,
        "multi-wool",
        pattern="afshan",
        material="wool",
        rooms=["bedroom"],
        prices=[6_000_000],
    )
    _create(
        admin_client,
        "multi-acrylic",
        pattern="modern",
        material="acrylic",
        rooms=["kids_room"],
        prices=[2_000_000],
    )

    only_silk = client.get("/api/v1/carpets", params={"material": ["silk"]}).json()
    assert only_silk["total"] == 1

    # Alternatives inside one facet.
    either = client.get("/api/v1/carpets", params={"material": ["silk", "wool"]}).json()
    assert either["total"] == 2

    # And a second facet still narrows rather than widening.
    both = client.get(
        "/api/v1/carpets", params={"material": ["silk", "wool"], "room": ["bedroom"]}
    ).json()
    assert both["total"] == 1

    # Rooms are an array column, so several rooms must overlap, not equal.
    rooms = client.get(
        "/api/v1/carpets", params={"room": ["bedroom", "kids_room"]}
    ).json()
    assert rooms["total"] == 2


def test_named_ids_are_a_filter_like_any_other(client, admin_client) -> None:
    """Favourites are a list the device holds, not a query it can describe.

    Without this the storefront's only options are one request per carpet or a
    second, parallel endpoint. It is a filter, so it composes: an id outside the
    rest of the query simply does not match.
    """
    first = _create(
        admin_client,
        "picked-silk",
        pattern="lachak_toranj",
        material="silk",
        rooms=["living_room"],
        prices=[9_000_000],
    )
    second = _create(
        admin_client,
        "picked-wool",
        pattern="afshan",
        material="wool",
        rooms=["bedroom"],
        prices=[4_000_000],
    )
    _create(
        admin_client,
        "not-picked",
        pattern="modern",
        material="acrylic",
        rooms=["kids_room"],
        prices=[1_500_000],
    )

    picked = client.get(
        "/api/v1/carpets", params={"id": [first["id"], second["id"]]}
    ).json()
    assert {item["slug"] for item in picked["items"]} == {"picked-silk", "picked-wool"}

    # Narrows with the rest of the query rather than overriding it.
    narrowed = client.get(
        "/api/v1/carpets",
        params={"id": [first["id"], second["id"]], "material": ["wool"]},
    ).json()
    assert [item["slug"] for item in narrowed["items"]] == ["picked-wool"]

    # An id that is not in the catalogue is not an error; it just matches nothing.
    assert client.get("/api/v1/carpets", params={"id": [10_000_000]}).json()["total"] == 0
