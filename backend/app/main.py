import mimetypes

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1 import router as v1_router
from app.core.config import get_settings


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


def create_app() -> FastAPI:
    _register_media_types()

    settings = get_settings()
    app = FastAPI(title=settings.app_name, debug=settings.debug)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
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
