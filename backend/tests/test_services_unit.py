"""Unit tests that need no database."""

from io import BytesIO

import pytest
from PIL import Image

from app.schemas.orders import normalize_phone
from app.services.auth import hash_password, verify_credentials
from app.services.embeddings import EMBEDDING_DIM, HashEmbeddingBackend
from app.services.images import DERIVATIVE_SPECS, InvalidImageError, process_upload
from app.services.orders import generate_reference
from app.services.storage import Storage


def _png(size=(600, 900), color=(120, 30, 30)) -> bytes:
    buffer = BytesIO()
    Image.new("RGB", size, color).save(buffer, format="PNG")
    return buffer.getvalue()


class TestStorage:
    def test_content_addressed_and_idempotent(self, tmp_path):
        storage = Storage(root=tmp_path, public_base="/files")
        url1 = storage.save(b"hello", kind="thumb", ext="webp")
        url2 = storage.save(b"hello", kind="thumb", ext="webp")
        assert url1 == url2
        assert storage.open_public_url(url1).read_bytes() == b"hello"

    def test_rejects_foreign_and_escaping_urls(self, tmp_path):
        storage = Storage(root=tmp_path, public_base="/files")
        with pytest.raises(ValueError):
            storage.open_public_url("/elsewhere/x.webp")
        with pytest.raises(ValueError):
            storage.open_public_url("/files/../../secret")


class TestImagePipeline:
    def test_derivatives_created_with_bounded_sizes(self, tmp_path):
        storage = Storage(root=tmp_path, public_base="/files")
        result = process_upload(_png(), storage)
        assert set(result.urls) == set(DERIVATIVE_SPECS)
        for name, (edge, _) in DERIVATIVE_SPECS.items():
            with Image.open(storage.open_public_url(result.urls[name])) as derived:
                assert max(derived.size) <= edge
                assert derived.format == "WEBP"

    def test_garbage_rejected(self, tmp_path):
        storage = Storage(root=tmp_path, public_base="/files")
        with pytest.raises(InvalidImageError):
            process_upload(b"not an image at all", storage)

    def test_dominant_colors_reflect_image(self, tmp_path):
        storage = Storage(root=tmp_path, public_base="/files")
        result = process_upload(_png(color=(180, 20, 20)), storage)
        assert result.dominant_colors, "expected at least one dominant color"
        r, g, b = (int(result.dominant_colors[0][i : i + 2], 16) for i in (1, 3, 5))
        assert r > g and r > b, f"dominant color should be reddish: {result.dominant_colors}"


class TestEmbeddings:
    def test_deterministic_normalized_and_sized(self):
        backend = HashEmbeddingBackend()
        data = _png()
        first, second = backend.embed_image(data), backend.embed_image(data)
        assert first == second
        assert len(first) == EMBEDDING_DIM
        norm = sum(v * v for v in first) ** 0.5
        assert abs(norm - 1.0) < 1e-6

    def test_different_images_differ(self):
        backend = HashEmbeddingBackend()
        assert backend.embed_image(_png(color=(200, 10, 10))) != backend.embed_image(
            _png(color=(10, 10, 200))
        )


class TestAuth:
    def test_roundtrip(self, monkeypatch):
        from app.core import config

        hashed = hash_password("s3cret")
        monkeypatch.setenv("ADMIN_PASSWORD_HASH", hashed)
        monkeypatch.setenv("ADMIN_USERNAME", "shopkeeper")
        config.get_settings.cache_clear()
        try:
            assert verify_credentials("shopkeeper", "s3cret")
            assert not verify_credentials("shopkeeper", "wrong")
            assert not verify_credentials("someone", "s3cret")
        finally:
            config.get_settings.cache_clear()


class TestOrders:
    def test_reference_format_and_alphabet(self):
        for _ in range(50):
            reference = generate_reference()
            assert reference.startswith("FR-") and len(reference) == 11
            assert not set(reference[3:]) & set("01OIL")


class TestPhone:
    def test_persian_digits_normalized(self):
        assert normalize_phone("۰۹۱۲۳۴۵۶۷۸۹") == "09123456789"
        assert normalize_phone("+98 912 345 6789") == "+989123456789"

    def test_invalid_rejected(self):
        with pytest.raises(ValueError):
            normalize_phone("12345")
