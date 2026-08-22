"""Admin authentication.

Single-admin model: credentials come from the environment, the session is a
signed HttpOnly cookie (itsdangerous), and login attempts are rate limited
in-process. No user table — the attack surface of this product is one shop
owner, and simplicity here is a security feature.
"""

import secrets

import bcrypt
from fastapi import Cookie, HTTPException, status
from itsdangerous import BadSignature, SignatureExpired, TimestampSigner

from app.core.config import get_settings
from app.core.security import SlidingWindowLimiter

SESSION_COOKIE = "farsh_admin_session"

#: Failed logins only — see `SlidingWindowLimiter.check(record=False)`. Five in
#: five minutes is generous for a person and hopeless for a dictionary.
login_limiter = SlidingWindowLimiter(limit=5, window_seconds=300, name="admin-login")


def _signer() -> TimestampSigner:
    return TimestampSigner(get_settings().session_secret, salt="admin-session")


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def check_rate_limit(client_key: str) -> None:
    login_limiter.check(client_key, record=False)


def record_failed_attempt(client_key: str) -> None:
    login_limiter.record(client_key)


#: Compared against when no admin password is configured, purely so that the
#: "no admin exists" path costs the same bcrypt round as a wrong password.
_DUMMY_HASH = b"$2b$12$eImiTXuWVxfM37uY4JANjQ.cD1YbLBn9K7pF0k5HBtwqA0LOX/rGm"


def verify_credentials(username: str, password: str) -> bool:
    """Constant-work credential check.

    Both halves are always evaluated and the hash is always computed, even when
    the username is wrong or no admin is configured at all. The short-circuit
    that was here before answered a wrong *username* in microseconds and a wrong
    *password* in the ~200 ms bcrypt takes — so the response time said which of
    the two was wrong, which is precisely what the login error message goes out
    of its way not to say.
    """
    settings = get_settings()
    stored = settings.admin_password_hash.encode() if settings.admin_password_hash else _DUMMY_HASH
    password_ok = bcrypt.checkpw(password.encode(), stored)
    username_ok = secrets.compare_digest(username, settings.admin_username)
    return bool(settings.admin_password_hash) and username_ok and password_ok


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
