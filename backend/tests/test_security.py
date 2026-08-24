"""The hardening layer, tested as an attacker would probe it.

Each of these fails against the code as it stood before فاز ۵, which is the only
reason to write them: a test that passes both before and after a change is
describing the framework, not the work.
"""

import io

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from PIL import Image

from app.core.config import Settings, get_settings
from app.core.security import SecurityHeadersMiddleware, SlidingWindowLimiter
from app.services import auth as auth_service


def _png(size: tuple[int, int] = (64, 64)) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", size, (120, 40, 40)).save(buffer, format="PNG")
    return buffer.getvalue()


# --- headers ----------------------------------------------------------------


def test_security_headers_are_on_api_responses(client: TestClient) -> None:
    response = client.get("/health")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert "frame-ancestors 'none'" in response.headers["content-security-policy"]
    assert response.headers["referrer-policy"] == "strict-origin-when-cross-origin"


def test_security_headers_are_on_uploaded_files_too(client: TestClient) -> None:
    """The mount serving stranger-supplied bytes is the one that needs them most.

    `StaticFiles` answers without going through the routing layer, so a header
    added by a route decorator or an `BaseHTTPMiddleware` response hook would
    reach every JSON response and miss exactly this one.
    """
    # The autouse storage-cleaning fixture removes the mounted directory after
    # every test, and `StaticFiles` stats it per request; recreate it so this
    # test measures headers rather than fixture ordering.
    get_settings().storage_dir.mkdir(parents=True, exist_ok=True)
    response = client.get("/files/does-not-exist.webp")
    assert response.status_code == 404
    assert response.headers["x-content-type-options"] == "nosniff"


@pytest.mark.parametrize("hsts", [True, False])
def test_hsts_follows_the_flag(hsts: bool) -> None:
    """On outside development, off inside it.

    Tested against a bare ASGI app rather than the real one, because the real
    one runs with `debug=False` in the suite (conftest exercises the production
    branches on purpose) and so could only ever demonstrate one of the two
    directions. The direction that must not regress is the *off* one: a
    development server that sends HSTS pins the developer's browser to
    https://localhost, and the next `npm run dev` fails with no clue why.
    """
    from starlette.applications import Starlette
    from starlette.responses import PlainTextResponse
    from starlette.routing import Route

    inner = Starlette(routes=[Route("/", lambda r: PlainTextResponse("ok"))])
    inner.add_middleware(SecurityHeadersMiddleware, hsts=hsts)
    with TestClient(inner) as probe:
        headers = probe.get("/").headers
    assert ("strict-transport-security" in headers) is hsts


# --- body size --------------------------------------------------------------


def test_oversized_body_is_refused_before_the_route_runs(client: TestClient) -> None:
    limit = 25 * 1024 * 1024
    response = client.post(
        "/api/v1/search/visual",
        files={"image": ("huge.png", b"\x00" * (limit + 2 * 1024 * 1024), "image/png")},
    )
    assert response.status_code == 413


def test_a_normal_upload_still_goes_through(client: TestClient) -> None:
    response = client.post(
        "/api/v1/search/visual", files={"image": ("rug.png", _png(), "image/png")}
    )
    assert response.status_code == 200, response.text


# --- rate limiting ----------------------------------------------------------


def test_visual_search_is_rate_limited(client: TestClient) -> None:
    """Twenty a minute; the twenty-first waits.

    The endpoint runs a forward pass through DINOv2 per call, so before this
    limit existed a single client could hold every worker busy indefinitely
    with a loop three lines long.
    """
    from app.core.security import visual_search_limiter

    visual_search_limiter.reset()
    image = _png()
    codes = [
        client.post(
            "/api/v1/search/visual", files={"image": ("rug.png", image, "image/png")}
        ).status_code
        for _ in range(visual_search_limiter.limit + 1)
    ]
    assert codes[:-1] == [200] * visual_search_limiter.limit
    assert codes[-1] == 429
    visual_search_limiter.reset()


def test_limiter_counts_per_client_not_globally() -> None:
    limiter = SlidingWindowLimiter(limit=2, window_seconds=60, name="t")
    limiter.check("a")
    limiter.check("a")
    limiter.check("b")  # a different caller has their own budget
    with pytest.raises(HTTPException) as excinfo:
        limiter.check("a")
    assert excinfo.value.status_code == 429


def test_limiter_reports_when_to_come_back() -> None:
    limiter = SlidingWindowLimiter(limit=1, window_seconds=60, name="t")
    limiter.check("a")
    with pytest.raises(HTTPException) as excinfo:
        limiter.check("a")
    assert excinfo.value.headers["Retry-After"]


def test_a_locked_out_login_says_how_long_and_says_it_is_about_attempts(
    client: TestClient,
) -> None:
    """The two things the login page needs in order to draw its clock.

    `Retry-After` is the number it counts down; the detail is the sentence
    printed beside it. The generic bucket message — «درخواست‌های شما بیش از حد
    مجاز است» — describes a throttled *resource*, which is the wrong thing to
    tell the one person the panel belongs to when what happened is that a
    password was guessed wrong five times.
    """
    auth_service.login_limiter.reset()
    for _ in range(auth_service.login_limiter.limit):
        client.post("/api/v1/admin/login", json={"username": "admin", "password": "wrong"})

    locked = client.post(
        "/api/v1/admin/login", json={"username": "admin", "password": "wrong"}
    )
    assert locked.status_code == 429
    assert 0 < int(locked.headers["Retry-After"]) <= auth_service.login_limiter.window_seconds
    assert "تلاش" in locked.json()["detail"]
    assert locked.json()["detail"] != SlidingWindowLimiter.DEFAULT_DETAIL
    auth_service.login_limiter.reset()


def test_successful_logins_do_not_count_against_the_limit() -> None:
    """A shopkeeper cannot lock themselves out by using their own panel.

    The login limiter counts failures only. Counting every attempt would mean
    the fifth correct sign-in of a morning is refused, which is a lockout with
    no attacker involved.
    """
    auth_service.login_limiter.reset()
    for _ in range(auth_service.login_limiter.limit + 3):
        auth_service.check_rate_limit("1.2.3.4")  # never raises: nothing recorded
    auth_service.login_limiter.reset()


# --- credentials ------------------------------------------------------------


def test_login_rejects_both_halves_the_same_way(client: TestClient) -> None:
    wrong_user = client.post(
        "/api/v1/admin/login", json={"username": "nobody", "password": "test-password"}
    )
    wrong_password = client.post(
        "/api/v1/admin/login", json={"username": "admin", "password": "wrong"}
    )
    assert wrong_user.status_code == wrong_password.status_code == 401
    assert wrong_user.json()["detail"] == wrong_password.json()["detail"]


def test_verify_credentials_hashes_even_when_the_username_is_wrong(monkeypatch) -> None:
    """The wrong username must cost the same bcrypt round as the wrong password.

    Otherwise the response time distinguishes them, and the error message that
    carefully refuses to say which half was wrong is undone by a stopwatch.
    """
    calls: list[bytes] = []
    real = auth_service.bcrypt.checkpw

    def counting(password: bytes, stored: bytes) -> bool:
        calls.append(stored)
        return real(password, stored)

    monkeypatch.setattr(auth_service.bcrypt, "checkpw", counting)
    auth_service.verify_credentials("definitely-not-the-admin", "whatever")
    assert len(calls) == 1


# --- configuration ----------------------------------------------------------


def test_production_refuses_the_default_session_secret() -> None:
    """A forgotten `.env` line lets anyone who read this repository forge a cookie."""
    settings = Settings(
        _env_file=None, debug=False, testing=False,
        session_secret="dev-only-change-me", admin_password_hash="x",
    )
    with pytest.raises(RuntimeError, match="SESSION_SECRET"):
        settings.assert_production_ready()


def test_production_refuses_a_missing_admin_hash() -> None:
    settings = Settings(
        _env_file=None, debug=False, testing=False,
        session_secret="a-real-secret", admin_password_hash="",
    )
    with pytest.raises(RuntimeError, match="ADMIN_PASSWORD_HASH"):
        settings.assert_production_ready()


def test_development_is_left_alone() -> None:
    Settings(_env_file=None, debug=True).assert_production_ready()


def test_the_guard_runs_when_the_server_starts_not_when_it_is_imported(monkeypatch) -> None:
    """Startup enforces it; importing the module does not.

    Both halves matter and they pulled in opposite directions. The check began
    life in `create_app`, which runs at import — and `scripts/export_openapi.py`
    imports `app` only to read its schema, so CI (which has no `.env`) died on
    the contract check with a message about session secrets. Moving it to
    lifespan fixed that and could easily have made it dead code instead, which
    nothing would have noticed until a server was serving forgeable sessions.
    """
    from fastapi.testclient import TestClient

    from app.main import create_app

    # Importing and building the app is not starting it.
    app = create_app()

    broken = Settings(
        _env_file=None, debug=False, testing=False,
        session_secret="dev-only-change-me", admin_password_hash="",
    )
    monkeypatch.setattr("app.main.get_settings", lambda: broken)
    with pytest.raises(RuntimeError, match="SESSION_SECRET"):
        with TestClient(app):  # entering the context is what runs lifespan
            pass
