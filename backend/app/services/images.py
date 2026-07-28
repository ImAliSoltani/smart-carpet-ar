"""Image derivative pipeline.

Every uploaded photo is normalized into WebP at the sizes the product actually
uses, so the storefront never ships a 2K original to a listing page:

- thumb   400px  — cart rows, admin tables, compare tray
- card    800px  — catalog cards
- full   1600px  — product gallery (zoom fetches the original)
- texture 2048px — AR pipeline input (kept near-lossless)

Sizes are the longest edge; aspect ratio is always preserved.
"""

from dataclasses import dataclass
from io import BytesIO

from PIL import Image, ImageOps

from app.services.storage import Storage

DERIVATIVE_SPECS: dict[str, tuple[int, int]] = {
    # name -> (longest edge px, webp quality)
    "thumb": (400, 78),
    "card": (800, 82),
    "full": (1600, 85),
    "texture": (2048, 95),
}

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


class InvalidImageError(ValueError):
    """Raised when an upload is not a usable image."""


@dataclass
class ImageSet:
    original_url: str
    urls: dict[str, str]  # spec name -> public url
    width: int
    height: int


def load_image(data: bytes) -> Image.Image:
    """Validate upload bytes and return a normalized RGB image (public API)."""
    return _load(data)


def _load(data: bytes) -> Image.Image:
    try:
        image = Image.open(BytesIO(data))
        image.load()
    except Exception as exc:
        raise InvalidImageError("فایل تصویر قابل خواندن نیست") from exc
    if image.format not in ALLOWED_FORMATS:
        raise InvalidImageError(f"قالب تصویر پشتیبانی نمی‌شود: {image.format}")
    # honor camera rotation EXIF before any resizing
    image = ImageOps.exif_transpose(image)
    return image.convert("RGB")


def process_upload(data: bytes, storage: Storage) -> ImageSet:
    """Validate an upload, store the original and all WebP derivatives."""
    image = _load(data)

    original_url = storage.save(data, kind="originals", ext="bin")
    urls: dict[str, str] = {}
    for name, (edge, quality) in DERIVATIVE_SPECS.items():
        derived = image.copy()
        derived.thumbnail((edge, edge), Image.LANCZOS)
        buffer = BytesIO()
        derived.save(buffer, format="WEBP", quality=quality, method=6)
        urls[name] = storage.save(buffer.getvalue(), kind=name, ext="webp")

    return ImageSet(original_url=original_url, urls=urls, width=image.width, height=image.height)
