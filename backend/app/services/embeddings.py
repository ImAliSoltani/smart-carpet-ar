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
import math
from io import BytesIO
from typing import Protocol

from PIL import Image

EMBEDDING_DIM = 768


class EmbeddingBackend(Protocol):
    def embed_image(self, data: bytes) -> list[float]:
        """Return an L2-normalized EMBEDDING_DIM vector for the image bytes."""
        ...


def _normalize(vector: list[float]) -> list[float]:
    norm = math.sqrt(sum(v * v for v in vector)) or 1.0
    return [v / norm for v in vector]


class HashEmbeddingBackend:
    """Deterministic fake for tests/CI — see module docstring."""

    def embed_image(self, data: bytes) -> list[float]:
        # 32x32 grayscale sketch keeps "visually identical bytes" stable,
        # then a seeded hash expands it to the full dimensionality.
        image = Image.open(BytesIO(data)).convert("L").resize((32, 32))
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
        image = Image.open(BytesIO(data)).convert("RGB")
        tensor = self._transform(image).unsqueeze(0)
        with self._torch.inference_mode():
            features = self._model(tensor)
        vector = features.squeeze(0).tolist()
        return _normalize(vector)


_backend: EmbeddingBackend | None = None


def get_embedding_backend() -> EmbeddingBackend:
    """App-wide backend. Tests override this via dependency injection."""
    global _backend
    if _backend is None:
        try:
            import torch  # noqa: F401

            _backend = DinoV2Backend()
        except ImportError:
            _backend = HashEmbeddingBackend()
    return _backend


def set_embedding_backend(backend: EmbeddingBackend | None) -> None:
    global _backend
    _backend = backend
