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
