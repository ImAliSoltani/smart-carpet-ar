"""File storage with a stable URL contract.

Files are written under a content-addressed path (`{kind}/{digest}.{ext}`) and
exposed at `{storage_public_base}/{relative_path}`. Development serves the
directory from the app itself; production points the same public base at
MinIO/Caddy. Content addressing makes uploads idempotent and URLs cacheable
forever.
"""

import hashlib
from pathlib import Path

from app.core.config import get_settings


class Storage:
    def __init__(self, root: Path | None = None, public_base: str | None = None) -> None:
        settings = get_settings()
        self.root = root if root is not None else settings.storage_dir
        self.public_base = (
            public_base if public_base is not None else settings.storage_public_base
        ).rstrip("/")

    def save(self, data: bytes, *, kind: str, ext: str) -> str:
        """Store bytes and return the public URL path."""
        digest = hashlib.sha256(data).hexdigest()[:32]
        relative = Path(kind) / f"{digest}.{ext.lstrip('.')}"
        target = self.root / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():  # content-addressed → identical bytes, identical path
            target.write_bytes(data)
        return f"{self.public_base}/{relative.as_posix()}"

    def open_public_url(self, url: str) -> Path:
        """Map a public URL back to the local file (dev + tests)."""
        prefix = f"{self.public_base}/"
        if not url.startswith(prefix):
            raise ValueError(f"not a storage url: {url}")
        path = (self.root / url.removeprefix(prefix)).resolve()
        root = self.root.resolve()
        if not path.is_relative_to(root):
            raise ValueError("path escapes storage root")
        return path
