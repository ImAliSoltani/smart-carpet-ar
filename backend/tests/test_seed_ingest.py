"""Guards on the bulk-ingest helpers and on the seed catalog itself.

The regression that motivated these: display names are Persian, and the slug
helper strips non-ASCII, so deriving a slug from the name collapsed all 44
carpets onto the same slug and 43 of them were silently skipped as duplicates.
"""

import csv
import importlib.util
from decimal import Decimal
from pathlib import Path

import pytest

from app.models.enums import CarpetMaterial, CarpetPattern, RoomType

BACKEND = Path(__file__).resolve().parents[1]
SEED_CSV = BACKEND.parent / "data" / "catalog-seed" / "images" / "metadata.csv"


def _load_ingest():
    spec = importlib.util.spec_from_file_location(
        "ingest_folder", BACKEND / "scripts" / "ingest_folder.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


ingest = _load_ingest()


def test_slugify_drops_persian_and_needs_an_ascii_source():
    # Persian in, nothing usable out -- which is exactly why the slug must come
    # from the metadata column or the file name, never from the display name.
    assert ingest.slugify("فرش دستباف کاشان طرح افشان") == "carpet"
    assert ingest.slugify("toranj-ghom-sormei-tala") == "toranj-ghom-sormei-tala"
    assert ingest.slugify("Afshan_Kashan 02") == "afshan-kashan-02"


def test_parse_sizes_reads_dimensions_and_price():
    assert ingest.parse_sizes("200x300:14000000; 250x350:19300000") == [
        (200, 300, Decimal("14000000")),
        (250, 350, Decimal("19300000")),
    ]


def test_parse_sizes_falls_back_to_a_placeholder_price():
    assert ingest.parse_sizes("200x300:") == [(200, 300, Decimal("15000000"))]


def test_parse_rooms_accepts_an_empty_column():
    assert ingest.parse_rooms("") == []
    assert ingest.parse_rooms("living_room; bedroom") == [
        RoomType.LIVING_ROOM,
        RoomType.BEDROOM,
    ]


@pytest.mark.skipif(not SEED_CSV.exists(), reason="seed catalog not present")
class TestSeedCatalog:
    @staticmethod
    def rows():
        with open(SEED_CSV, encoding="utf-8-sig") as f:
            return list(csv.DictReader(f))

    def test_every_carpet_gets_its_own_slug(self):
        rows = self.rows()
        slugs = [ingest.slugify(r["slug"] or Path(r["filename"]).stem) for r in rows]
        assert len(set(slugs)) == len(rows)
        assert "carpet" not in slugs

    def test_vocabularies_are_valid(self):
        for row in self.rows():
            CarpetPattern(row["pattern"])
            CarpetMaterial(row["material"])
            ingest.parse_rooms(row["suitable_rooms"])

    def test_every_carpet_is_priced_and_sized(self):
        for row in self.rows():
            sizes = ingest.parse_sizes(row["sizes"])
            assert sizes, row["filename"]
            for width, length, price in sizes:
                assert width > 0 and length > 0
                assert price > 0
            assert int(row["stock"]) >= 0

    def test_image_files_and_metadata_agree(self):
        listed = {r["filename"] for r in self.rows()}
        on_disk = {p.name for p in SEED_CSV.parent.glob("*.jpg")}
        assert listed == on_disk
