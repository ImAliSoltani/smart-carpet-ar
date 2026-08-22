import logging
import mimetypes
from contextlib import asynccontextmanager
from io import BytesIO

import anyio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image

from app.api.v1 import router as v1_router
from app.core.config import get_settings
from app.core.security import BodySizeLimitMiddleware, SecurityHeadersMiddleware
from app.services.embeddings import get_embedding_backend

logger = logging.getLogger(__name__)


def _register_media_types() -> None:
    """Name the formats this project serves, instead of asking the machine.

    `mimetypes` is seeded from the host — the Windows registry, `/etc/mime.types`
    on Linux — so the content type of our own files depends on which machine is
    serving them. On the development machine none of these three are known, and
    every one of them was going out as `application/octet-stream`:

    - `.webp`  — the browser copes, but Next's image optimiser cannot tell what
      it received and re-encodes to JPEG, which flattens away the transparency
      the derivative pipeline goes out of its way to keep.
    - `.usdz`  — iOS Quick Look opens a model by content type. Served as bytes,
      it refuses the file, and the AR button silently does nothing on iPhone.
    - `.glb`   — same story for Scene Viewer.

    Two of those three are demo-day failures on a device we cannot test on
    every day, so the mapping is stated here rather than inherited.
    """
    mimetypes.add_type("image/webp", ".webp")
    mimetypes.add_type("image/avif", ".avif")
    mimetypes.add_type("model/gltf-binary", ".glb")
    mimetypes.add_type("model/vnd.usdz+zip", ".usdz")


def _warmup_png() -> bytes:
    """A tiny valid PNG, drawn rather than pasted in as a hex literal.

    It was a hex literal first, and the literal was malformed — which cost
    nothing visible, because the warm-up swallows its own failures by design.
    So the model was never warmed and the log line said so in a place nobody
    reads. Anything whose failure is silent has to be built by code that cannot
    get it subtly wrong.
    """
    buffer = BytesIO()
    Image.new("RGB", (32, 32), (128, 128, 128)).save(buffer, format="PNG")
    return buffer.getvalue()


async def _warm_embeddings() -> None:
    """Load DINOv2 before the first shopper needs it.

    Measured in فاز ۴: the backend loads the model lazily, so the first visual
    search after a restart takes 12.4 s and every one after it 0.3 s. Twelve
    seconds of nothing is not a slow search, it is a broken page — and on demo
    day (§10) it is twelve seconds of silence in front of the examiners. Done
    on a worker thread so the server starts accepting requests immediately;
    a search that arrives during the warm-up simply waits for the same load it
    would have triggered itself.
    """
    try:
        await anyio.to_thread.run_sync(get_embedding_backend().embed_image, _warmup_png())
        logger.info("مدل امبدینگ گرم شد")
    except Exception:  # noqa: BLE001 — warming is an optimisation, never a reason not to start
        logger.warning("گرم کردن مدل امبدینگ ناموفق بود؛ اولین جست‌وجو کند خواهد بود", exc_info=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with anyio.create_task_group() as tasks:
        tasks.start_soon(_warm_embeddings)
        yield


def create_app() -> FastAPI:
    _register_media_types()

    settings = get_settings()
    settings.assert_production_ready()
    app = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
        lifespan=lifespan,
        # The interactive docs describe every admin route, including the shapes
        # that write. They are worth having in development and are one more
        # thing to read in production, so they follow `debug`.
        docs_url="/docs" if settings.debug else None,
        redoc_url=None,
        openapi_url="/openapi.json" if settings.debug else None,
    )

    # Order matters and reads backwards: the last one added is the outermost, so
    # the size limit sees the request first and CORS decorates the response last.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(SecurityHeadersMiddleware, hsts=not settings.debug)
    app.add_middleware(
        BodySizeLimitMiddleware,
        # The largest legitimate request is one image; the slack covers the
        # multipart envelope around it.
        max_bytes=settings.max_upload_mb * 1024 * 1024 + 1024 * 1024,
    )

    app.include_router(v1_router)

    # Development file serving; production puts MinIO/Caddy on the same public base.
    settings.storage_dir.mkdir(parents=True, exist_ok=True)
    app.mount(
        settings.storage_public_base,
        StaticFiles(directory=settings.storage_dir),
        name="files",
    )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
