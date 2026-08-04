"""The filter panel's numbers.

Every assertion here exists because getting it wrong is silent. A facet keyed
the wrong way still returns 200 and still renders — as a chip with no label and
no count — so the failure only shows up as an interface that looks half-built.
"""

from app.models.enums import CarpetMaterial, CarpetPattern, RoomType


def _create(admin_client, slug, *, pattern, material, rooms, prices):
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


def test_facets_is_not_read_as_a_carpet_slug(client) -> None:
    """`/carpets/facets` must not be matched by `/carpets/{slug}`."""
    assert client.get("/api/v1/carpets/facets").status_code == 200
