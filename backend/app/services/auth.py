"""Admin authentication.

Single-admin model: credentials come from the environment, the session is a
signed HttpOnly cookie (itsdangerous), and login attempts are rate limited
in-process. No user table — the attack surface of this product is one shop
owner, and simplicity here is a security feature.
"""

import time

import bcrypt
from fastapi import Cookie, HTTPException, status
from itsdangerous import BadSignature, SignatureExpired, TimestampSigner

from app.core.config import get_settings

SESSION_COOKIE = "farsh_admin_session"

# sliding window: max attempts per window per client key
_MAX_ATTEMPTS = 5
_WINDOW_SECONDS = 300
_attempts: dict[str, list[float]] = {}


def _signer() -> TimestampSigner:
    return TimestampSigner(get_settings().session_secret, salt="admin-session")


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def check_rate_limit(client_key: str) -> None:
    now = time.monotonic()
    window = [t for t in _attempts.get(client_key, []) if now - t < _WINDOW_SECONDS]
    _attempts[client_key] = window
    if len(window) >= _MAX_ATTEMPTS:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            detail="تلاش بیش از حد؛ چند دقیقه بعد دوباره امتحان کنید",
        )


def record_failed_attempt(client_key: str) -> None:
    _attempts.setdefault(client_key, []).append(time.monotonic())


def verify_credentials(username: str, password: str) -> bool:
    settings = get_settings()
    if not settings.admin_password_hash:
        return False
    username_ok = username == settings.admin_username
    password_ok = bcrypt.checkpw(password.encode(), settings.admin_password_hash.encode())
    return username_ok and password_ok


def issue_session() -> str:
    return _signer().sign(b"admin").decode()


def require_admin(
    session: str | None = Cookie(default=None, alias=SESSION_COOKIE),
) -> None:
    """FastAPI dependency guarding every admin route."""
    if not session:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="ورود لازم است")
    max_age = get_settings().session_max_age_hours * 3600
    try:
        _signer().unsign(session.encode(), max_age=max_age)
    except (BadSignature, SignatureExpired) as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="نشست نامعتبر است") from exc
