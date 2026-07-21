from __future__ import annotations

from typing import Any


class ScenarioLabError(Exception):
    """Base error for expected CLI and library failures."""


class ConfigurationError(ScenarioLabError):
    """Raised when local configuration is missing or unsafe."""


class UnknownUserAliasError(ConfigurationError):
    """Raised when a requested configured alias does not exist."""


class ManifestError(ScenarioLabError):
    """Raised when the local generated-issue manifest cannot be used safely."""


class ResponseDecodeError(ScenarioLabError):
    """Raised when an endpoint expected to return JSON returns malformed content."""

    def __init__(self, method: str, path: str, status_code: int, body: str) -> None:
        self.method = method
        self.path = path
        self.status_code = status_code
        self.body = body[:500]
        super().__init__(f"{method} {path} returned malformed JSON (HTTP {status_code}): {self.body}")


class ApiClientError(ScenarioLabError):
    """An HTTP failure carrying the safe details useful for local diagnosis."""

    def __init__(
        self,
        *,
        method: str,
        path: str,
        status_code: int | None,
        message: str,
        code: str | None = None,
        payload: Any = None,
    ) -> None:
        self.method = method
        self.path = path
        self.status_code = status_code
        self.message = message
        self.code = code
        self.payload = payload
        status = "network error" if status_code is None else f"HTTP {status_code}"
        code_suffix = f" [{code}]" if code else ""
        super().__init__(f"{method} {path} failed ({status}){code_suffix}: {message}")
