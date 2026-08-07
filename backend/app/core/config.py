from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Farsh API"
    debug: bool = False
    # set only by the test suite; switches the engine to NullPool so connections
    # never leak across pytest's short-lived event loops
    testing: bool = False

    database_url: str = "postgresql+asyncpg://farsh:farsh@localhost:5432/farsh"

    # comma-separated list of allowed browser origins
    cors_origins: str = "http://localhost:3000"

    # --- files ---
    # Local disk in development; the same URL contract is served by MinIO in
    # production, so switching backends never touches application code.
    storage_dir: Path = Path("data/storage")
    # Public base under which stored files are exposed (mounted by the app in
    # dev, by Caddy/MinIO in production).
    storage_public_base: str = "/files"
    max_upload_mb: int = 25

    # --- admin ---
    admin_username: str = "admin"
    # bcrypt hash; generate with scripts/hash_password.py. Empty = admin login disabled.
    admin_password_hash: str = ""
    session_secret: str = "dev-only-change-me"
    session_max_age_hours: int = 12
    # Whether the session cookie carries `Secure`. Unset means «follow debug»,
    # which is the right default and stays the production behaviour.
    #
    # It is its own setting because the two things were one, and that made
    # testing the panel over a LAN address cost more than it should: a browser
    # will not store a `Secure` cookie sent over plain http, so logging in from
    # a phone at `http://<laptop-ip>:3000` silently does nothing — and the only
    # lever for it was `debug`, which also turns on SQL echo for every
    # statement the app runs. Cookie security should not be a side effect of
    # logging verbosity.
    session_cookie_secure: bool | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def cookie_secure(self) -> bool:
        if self.session_cookie_secure is not None:
            return self.session_cookie_secure
        return not self.debug


@lru_cache
def get_settings() -> Settings:
    return Settings()
