from __future__ import annotations

import httpx
import pytest
import respx

from issue_scenario_lab.api.client import ApiClient
from issue_scenario_lab.config import Settings
from issue_scenario_lab.errors import ApiClientError, ResponseDecodeError

API = "http://localhost:5000/api"


def settings() -> Settings:
    return Settings(api_base_url=API)


@respx.mock
def test_health_reads_the_backend_envelope() -> None:
    respx.get(f"{API}/health").respond(
        200,
        json={"success": True, "message": "Backend is healthy", "data": {"service": "backend", "status": "ok"}},
    )
    with ApiClient(settings()) as client:
        assert client.health() == {"service": "backend", "status": "ok"}


@respx.mock
def test_login_keeps_cookie_and_attaches_bearer_token() -> None:
    respx.post(f"{API}/auth/login").respond(
        200,
        json={"success": True, "message": "ok", "data": {"token": "token-a"}},
        headers={"set-cookie": "refreshToken=cookie-a; Path=/; HttpOnly"},
    )
    profile_route = respx.get(f"{API}/auth/me").respond(200, json={"success": True, "message": "ok", "data": {"user": {"email": "a@example.test"}}})
    with ApiClient(settings()) as client:
        client.login("a@example.test", "password-a")
        assert client.cookies.get("refreshToken") == "cookie-a"
        assert client.current_user()["user"]["email"] == "a@example.test"
    assert profile_route.calls[0].request.headers["Authorization"] == "Bearer token-a"


@respx.mock
def test_expired_token_refreshes_once_then_retries() -> None:
    respx.get(f"{API}/auth/me").mock(
        side_effect=[
            httpx.Response(401, json={"success": False, "message": "Token expired.", "error": {"code": "TOKEN_EXPIRED"}}),
            httpx.Response(200, json={"success": True, "message": "ok", "data": {"user": {"email": "a@example.test"}}}),
        ]
    )
    refresh_route = respx.get(f"{API}/auth/refresh").respond(200, json={"success": True, "message": "ok", "data": {"token": "token-new"}})
    with ApiClient(settings()) as client:
        client.access_token = "token-expired"
        assert client.current_user()["user"]["email"] == "a@example.test"
        assert client.access_token == "token-new"
    assert refresh_route.called


@respx.mock
def test_refresh_failure_is_clear_and_does_not_loop() -> None:
    respx.get(f"{API}/auth/me").respond(401, json={"success": False, "message": "Token expired.", "error": {"code": "TOKEN_EXPIRED"}})
    refresh_route = respx.get(f"{API}/auth/refresh").respond(
        401, json={"success": False, "message": "Token does not exist.", "error": {"code": "NO_REFRESH_TOKEN"}}
    )
    with ApiClient(settings()) as client:
        client.access_token = "token-expired"
        with pytest.raises(ApiClientError, match="GET /auth/refresh failed"):
            client.current_user()
    assert refresh_route.call_count == 1


@respx.mock
def test_malformed_json_raises_a_clear_error() -> None:
    respx.get(f"{API}/health").respond(200, content=b"not-json")
    with ApiClient(settings()) as client:
        with pytest.raises(ResponseDecodeError, match="GET /health returned malformed JSON"):
            client.health()


@respx.mock
def test_clients_keep_tokens_and_cookies_isolated() -> None:
    login_route = respx.post(f"{API}/auth/login").mock(
        side_effect=[
            httpx.Response(200, json={"success": True, "message": "ok", "data": {"token": "token-a"}}, headers={"set-cookie": "refreshToken=cookie-a; Path=/"}),
            httpx.Response(200, json={"success": True, "message": "ok", "data": {"token": "token-b"}}, headers={"set-cookie": "refreshToken=cookie-b; Path=/"}),
        ]
    )
    with ApiClient(settings()) as first, ApiClient(settings()) as second:
        first.login("a@example.test", "password-a")
        assert second.access_token is None
        assert second.cookies.get("refreshToken") is None
        second.login("b@example.test", "password-b")
        assert first.access_token == "token-a"
        assert first.cookies.get("refreshToken") == "cookie-a"
        assert second.access_token == "token-b"
        assert second.cookies.get("refreshToken") == "cookie-b"
    assert login_route.call_count == 2
