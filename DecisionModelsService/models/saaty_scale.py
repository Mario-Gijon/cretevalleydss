"""Canonical numeric values accepted by Saaty AHP comparisons."""

from __future__ import annotations

import math
from typing import Any

SAATY_SCALE_TOLERANCE = 1e-12
SAATY_SCALE_VALUES = tuple(
    sorted([float(value) for value in range(1, 10)] + [1.0 / value for value in range(2, 10)])
)
SAATY_SCALE = frozenset(SAATY_SCALE_VALUES)


def is_saaty_scale_value(value: Any) -> bool:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return False
    numeric = float(value)
    return math.isfinite(numeric) and any(
        math.isclose(numeric, allowed, rel_tol=0, abs_tol=SAATY_SCALE_TOLERANCE)
        for allowed in SAATY_SCALE_VALUES
    )
