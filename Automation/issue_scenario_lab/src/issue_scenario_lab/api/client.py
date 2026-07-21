from __future__ import annotations

from typing import Any

import httpx

from issue_scenario_lab.api.envelopes import ApiEnvelope, parse_envelope
from issue_scenario_lab.config import Settings
from issue_scenario_lab.errors import ApiClientError, ResponseDecodeError

_SENSITIVE_PAYLOAD_KEYS = {"token", "password", "refreshToken", "accessToken"}


def _safe_payload(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: _safe_payload(item) for key, item in value.items() if key.casefold() not in {sensitive.casefold() for sensitive in _SENSITIVE_PAYLOAD_KEYS}
        }
    if isinstance(value, list):
        return [_safe_payload(item) for item in value]
    return value


class ApiClient:
    """One synchronous, cookie-isolated Backend session for one development user."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.access_token: str | None = None
        self._client = httpx.Client(
            base_url=f"{settings.api_base_url}/",
            timeout=settings.request_timeout_seconds,
            verify=settings.verify_tls,
            headers={"Accept": "application/json"},
        )

    @property
    def cookies(self) -> httpx.Cookies:
        return self._client.cookies

    def __enter__(self) -> ApiClient:
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    def close(self) -> None:
        self._client.close()

    def _decode(self, response: httpx.Response, method: str, path: str) -> tuple[Any, ApiEnvelope]:
        if not response.content:
            return None, ApiEnvelope(success=response.is_success, message=None, data=None, error_code=None)
        try:
            payload = response.json()
        except ValueError as error:
            raise ResponseDecodeError(method, path, response.status_code, response.text) from error
        return payload, parse_envelope(payload)

    @staticmethod
    def _refreshable(response: httpx.Response, envelope: ApiEnvelope, has_token: bool) -> bool:
        if response.status_code != 401:
            return False
        message = (envelope.message or "").lower()
        return (
            envelope.error_code == "TOKEN_EXPIRED"
            or "expired" in message
            or (not has_token and (envelope.error_code == "NO_TOKEN" or "does not exist" in message))
        )

    def _send(
        self,
        method: str,
        path: str,
        *,
        json: Any = None,
        authenticated: bool = False,
        allow_refresh: bool = True,
    ) -> Any:
        headers: dict[str, str] = {}
        if authenticated and self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        try:
            response = self._client.request(method, path.lstrip("/"), json=json, headers=headers)
        except httpx.HTTPError as error:
            raise ApiClientError(method=method, path=path, status_code=None, message=str(error), code="NETWORK_ERROR") from error

        payload, envelope = self._decode(response, method, path)
        if authenticated and allow_refresh and self._refreshable(response, envelope, bool(self.access_token)):
            self.refresh()
            return self._send(method, path, json=json, authenticated=True, allow_refresh=False)
        if not response.is_success or not envelope.success:
            raise ApiClientError(
                method=method,
                path=path,
                status_code=response.status_code,
                message=envelope.message or "Backend returned an unsuccessful response",
                code=envelope.error_code,
                payload=_safe_payload(payload),
            )
        return envelope.data

    def request(self, method: str, path: str, *, json: Any = None) -> Any:
        """Send an authenticated request for future scenario steps."""

        return self._send(method, path, json=json, authenticated=True)

    def health(self) -> dict[str, Any]:
        data = self._send("GET", "/health")
        if not isinstance(data, dict):
            raise ApiClientError(method="GET", path="/health", status_code=200, message="health response data must be an object")
        return data

    def login(self, email: str, password: str) -> dict[str, Any]:
        data = self._send("POST", "/auth/login", json={"email": email, "password": password})
        if not isinstance(data, dict) or not isinstance(data.get("token"), str) or not data["token"]:
            raise ApiClientError(method="POST", path="/auth/login", status_code=200, message="login response did not include an access token")
        self.access_token = data["token"]
        return data

    def refresh(self) -> dict[str, Any]:
        data = self._send("GET", "/auth/refresh", authenticated=False, allow_refresh=False)
        if not isinstance(data, dict) or not isinstance(data.get("token"), str) or not data["token"]:
            raise ApiClientError(method="GET", path="/auth/refresh", status_code=200, message="refresh response did not include an access token")
        self.access_token = data["token"]
        return data

    def logout(self) -> None:
        self._send("POST", "/auth/logout", authenticated=False, allow_refresh=False)
        self.access_token = None

    def current_user(self) -> dict[str, Any]:
        data = self._send("GET", "/auth/me", authenticated=True)
        if not isinstance(data, dict):
            raise ApiClientError(method="GET", path="/auth/me", status_code=200, message="profile response data must be an object")
        return data
