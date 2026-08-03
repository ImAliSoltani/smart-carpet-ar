"""The content types the storefront and the AR viewers depend on.

Not a formality: `mimetypes` answers from whatever the host machine knows, so
this is the kind of thing that is right on the CI runner and wrong on the laptop
running the defense demo. Asserted through a real request so the guarantee is
about what a browser receives, not about a dictionary.
"""

import mimetypes

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app

client = TestClient(app)


@pytest.mark.parametrize(
    ("name", "expected"),
    [
        ("photo.webp", "image/webp"),
        ("photo.avif", "image/avif"),
        # Scene Viewer and Quick Look pick a viewer by content type; served as
        # bytes, the AR button does nothing at all on the phone.
        ("carpet.glb", "model/gltf-binary"),
        ("carpet.usdz", "model/vnd.usdz+zip"),
    ],
)
def test_stored_files_are_served_with_their_real_type(name: str, expected: str) -> None:
    settings = get_settings()
    target = settings.storage_dir / "tests" / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(b"not a real asset, only its extension matters here")

    try:
        response = client.get(f"{settings.storage_public_base}/tests/{name}")
        assert response.status_code == 200
        assert response.headers["content-type"].split(";")[0] == expected
    finally:
        target.unlink()


def test_registration_does_not_depend_on_the_host() -> None:
    """`create_app()` has run by import time, so the mapping is already in place."""
    assert mimetypes.guess_type("x.usdz")[0] == "model/vnd.usdz+zip"
