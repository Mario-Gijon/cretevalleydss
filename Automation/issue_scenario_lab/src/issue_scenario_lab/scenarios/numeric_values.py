from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any

from issue_scenario_lab.errors import ScenarioLabError


def _decimal(value: Any, field: str) -> Decimal:
    try:
        parsed = Decimal(str(value))
    except (InvalidOperation, ValueError) as error:
        raise ScenarioLabError(f"expression domain {field} must be finite") from error
    if not parsed.is_finite():
        raise ScenarioLabError(f"expression domain {field} must be finite")
    return parsed


def numeric_levels(domain: dict[str, Any]) -> tuple[float, float, float]:
    """Return domain-valid low/medium/high values without stepped float drift."""

    type_key = domain.get("typeKey")
    minimum, maximum = _decimal(domain.get("min"), "min"), _decimal(domain.get("max"), "max")
    if maximum <= minimum:
        raise ScenarioLabError("expression domain max must be greater than min")
    if type_key == "numericContinuous":
        delta = (maximum - minimum) / Decimal(4)
        return float(minimum + delta), float(minimum + delta * 2), float(minimum + delta * 3)
    if type_key != "numericDiscrete":
        raise ScenarioLabError(f"unsupported numeric expression domain type: {type_key!r}")
    step = _decimal(domain.get("step"), "step")
    if step <= 0:
        raise ScenarioLabError("numericDiscrete expression domain step must be positive")
    count = int((maximum - minimum) / step) + 1
    if count < 2:
        raise ScenarioLabError("numericDiscrete domain needs at least two representable values")
    values = [minimum + step * index for index in range(count) if minimum + step * index <= maximum]
    low, high = values[0], values[-1]
    medium = values[len(values) // 2] if len(values) >= 3 else high
    return float(low), float(medium), float(high)
