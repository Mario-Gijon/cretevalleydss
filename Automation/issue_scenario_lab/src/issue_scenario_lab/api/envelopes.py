from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class ApiEnvelope:
    success: bool
    message: str | None
    data: Any
    error_code: str | None


def parse_envelope(payload: Any) -> ApiEnvelope:
    """Read the Backend's flexible `{success, message, data, error}` envelope."""

    if not isinstance(payload, dict):
        return ApiEnvelope(success=False, message=None, data=None, error_code=None)
    error = payload.get("error")
    error_code = error.get("code") if isinstance(error, dict) else None
    return ApiEnvelope(
        success=payload.get("success") is True,
        message=payload.get("message") if isinstance(payload.get("message"), str) else None,
        data=payload.get("data"),
        error_code=error_code if isinstance(error_code, str) else None,
    )
