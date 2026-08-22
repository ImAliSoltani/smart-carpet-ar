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

    # --- conversational search ---
    # Unset means the rule-based planner, which needs no network and no key and
    # is the default on purpose: the demo must survive a dead API (§10). Setting
    # both a key and a base URL upgrades the translation without changing
    # anything else — the model's output is validated against the same schema
    # either way, and any failure falls back to the rules.
    #
    # The base URL is the provider's OpenAI-compatible root, without the path:
    #   DeepSeek    https://api.deepseek.com/v1        deepseek-chat
    #   OpenRouter  https://openrouter.ai/api/v1       <vendor>/<model>
    #   local       http://127.0.0.1:8080/v1           whatever it serves
    llm_base_url: str = ""
    llm_api_key: str = ""
    llm_model: str = "deepseek-chat"

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

    def assert_production_ready(self) -> None:
        """Refuse to start with development defaults outside development.

        Both of these are one forgotten line in a `.env` away, and neither one
        announces itself: a server signing sessions with `dev-only-change-me`
        serves every page correctly while anyone who has read this repository
        can mint an admin cookie, and a server with no admin hash simply has an
        admin panel nobody can reach. A refusal at startup is loud; both of the
        alternatives are silent.

        `testing` is exempt because the suite deliberately runs the production
        branch of `debug=False` code — cookie flags, docs being hidden — without
        wanting a real secret in a fixture.
        """
        if self.debug or self.testing:
            return
        problems = []
        if self.session_secret == Settings.model_fields["session_secret"].default:
            problems.append("SESSION_SECRET هنوز مقدار پیش‌فرض توسعه است")
        if not self.admin_password_hash:
            problems.append("ADMIN_PASSWORD_HASH تنظیم نشده؛ پنل ادمین در دسترس نخواهد بود")
        if problems:
            raise RuntimeError(
                "پیکربندی برای اجرای غیرتوسعه‌ای آماده نیست:\n  - " + "\n  - ".join(problems)
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()
