"""Image embeddings for visual search.

The product interface is `EmbeddingBackend`; the app depends only on that.

- `DinoV2Backend` — the real model (DINOv2 ViT-B/14, 768-d), loaded lazily on
  first use so importing this module never pulls torch. Chosen over CLIP
  because carpet identity is pattern/texture, which self-supervised DINOv2
  represents markedly better than text-aligned encoders.
- `HashEmbeddingBackend` — deterministic, dependency-free stand-in used by the
  test suite and CI. It is NOT a quality substitute; it only preserves the
  contract "same image → same vector, similar bytes stay stable".

Vectors are L2-normalized so pgvector cosine distance behaves.
"""

import hashlib
import logging
import math
from io import BytesIO
from typing import Protocol

from PIL import Image

logger = logging.getLogger(__name__)

EMBEDDING_DIM = 768


class EmbeddingBackend(Protocol):
    def embed_image(self, data: bytes) -> list[float]:
        """Return an L2-normalized EMBEDDING_DIM vector for the image bytes."""
        ...


def _normalize(vector: list[float]) -> list[float]:
    norm = math.sqrt(sum(v * v for v in vector)) or 1.0
    return [v / norm for v in vector]


def _flatten(image: Image.Image) -> Image.Image:
    """Drop transparency onto white before the model sees the image.

    Catalogue photographs are cut out from their backdrop, and `convert("RGB")`
    on its own keeps whatever colour hid behind the transparent pixels — the very
    backdrop we removed. Compositing onto white gives every carpet the same
    neutral surround, so the query image and the catalogue meet on equal terms.
    """
    if image.mode not in {"RGBA", "LA", "PA"} and "transparency" not in image.info:
        return image.convert("RGB")
    rgba = image.convert("RGBA")
    canvas = Image.new("RGB", rgba.size, (255, 255, 255))
    canvas.paste(rgba, mask=rgba.getchannel("A"))
    return canvas


class HashEmbeddingBackend:
    """Deterministic fake for tests/CI — see module docstring."""

    def embed_image(self, data: bytes) -> list[float]:
        # 32x32 grayscale sketch keeps "visually identical bytes" stable,
        # then a seeded hash expands it to the full dimensionality.
        image = _flatten(Image.open(BytesIO(data))).convert("L").resize((32, 32))
        sketch = list(image.tobytes())
        vector: list[float] = []
        counter = 0
        while len(vector) < EMBEDDING_DIM:
            seed = hashlib.sha256(bytes(sketch) + counter.to_bytes(4, "little")).digest()
            vector.extend(b / 255.0 - 0.5 for b in seed)
            counter += 1
        return _normalize(vector[:EMBEDDING_DIM])


class DinoV2Backend:
    """Real embeddings. Requires the `ml` dependency group (torch)."""

    def __init__(self) -> None:
        self._model = None
        self._transform = None

    def _ensure_loaded(self) -> None:
        if self._model is not None:
            return
        import torch  # deferred: heavy import only when real embeddings are used

        self._torch = torch
        self._model = torch.hub.load("facebookresearch/dinov2", "dinov2_vitb14")
        self._model.eval()

        from torchvision import transforms

        self._transform = transforms.Compose(
            [
                transforms.Resize(256, interpolation=transforms.InterpolationMode.BICUBIC),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)
                ),
            ]
        )

    def embed_image(self, data: bytes) -> list[float]:
        self._ensure_loaded()
        image = _flatten(Image.open(BytesIO(data)))
        tensor = self._transform(image).unsqueeze(0)
        with self._torch.inference_mode():
            features = self._model(tensor)
        vector = features.squeeze(0).tolist()
        return _normalize(vector)


_backend: EmbeddingBackend | None = None


def get_embedding_backend() -> EmbeddingBackend:
    """App-wide backend. Tests override this via dependency injection.

    The fallback is deliberate and the noise around it is too. A missing torch
    is normal — CI and the test suite run without it on purpose — but a torch
    that is *present and broken* looks identical to this `except`, and the
    consequence is not a crash: it is a visual search that answers, quickly,
    with nonsense. The stored vectors are DINOv2's; a hash vector is orthogonal
    to all of them, so every ranking becomes noise while every response stays
    200. That happened here, from an interrupted install, and nothing said so.

    So the fallback now announces itself, and says which of the two it is.
    """
    global _backend
    if _backend is None:
        try:
            import torch  # noqa: F401

            _backend = DinoV2Backend()
        except ImportError as exc:
            _backend = HashEmbeddingBackend()
            logger.warning(
                "جست‌وجوی بصری روی بک‌اند قلابی اجرا می‌شود: %s. "
                "امبدینگ‌های ذخیره‌شده از DINOv2 هستند، پس نتایج بی‌معنا خواهند بود. "
                "برای اجرای واقعی: uv sync --group ml",
                exc,
            )
    return _backend


def set_embedding_backend(backend: EmbeddingBackend | None) -> None:
    global _backend
    _backend = backend
