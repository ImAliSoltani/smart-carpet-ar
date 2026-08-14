"""Catalog vocabularies.

Values are stable English identifiers used by the API and database; the Persian
labels shown in the storefront live in the client, so wording can change without
a migration.
"""

from enum import StrEnum


class CarpetMaterial(StrEnum):
    WOOL = "wool"
    SILK = "silk"
    COTTON = "cotton"
    ACRYLIC = "acrylic"
    POLYESTER = "polyester"
    VISCOSE = "viscose"
    MIXED = "mixed"


class CarpetPattern(StrEnum):
    LACHAK_TORANJ = "lachak_toranj"
    AFSHAN = "afshan"
    MEDALLION = "medallion"
    GEOMETRIC = "geometric"
    TRIBAL = "tribal"
    FLORAL = "floral"
    MODERN = "modern"
    VINTAGE = "vintage"
    PLAIN = "plain"


class ColorFamily(StrEnum):
    """The colours a shopper would name, as opposed to the ones a photo holds.

    Dominant colours are stored as exact hex and are therefore nearly unique —
    useless as a filter. These are the buckets those hexes fall into, assigned
    in `app.services.color`, and the vocabulary is chosen for carpets rather
    than for colour theory: CREAM and TURQUOISE earn their place because Persian
    carpets are full of both and neither survives being called "pale yellow" or
    "cyan", while colours no carpet ground is woven in are simply absent.
    """

    RED = "red"
    PINK = "pink"
    ORANGE = "orange"
    GOLD = "gold"
    CREAM = "cream"
    BROWN = "brown"
    GREEN = "green"
    TURQUOISE = "turquoise"
    BLUE = "blue"
    PURPLE = "purple"
    GRAY = "gray"
    BLACK = "black"
    WHITE = "white"


class RoomType(StrEnum):
    LIVING_ROOM = "living_room"
    BEDROOM = "bedroom"
    DINING_ROOM = "dining_room"
    KIDS_ROOM = "kids_room"
    OFFICE = "office"
    HALLWAY = "hallway"


class OrderStatus(StrEnum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"


class ArAssetStatus(StrEnum):
    """Lifecycle of the automatically generated AR files for a variant."""

    MISSING = "missing"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"
