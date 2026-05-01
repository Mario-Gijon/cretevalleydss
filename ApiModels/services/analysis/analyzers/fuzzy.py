from __future__ import annotations

from typing import Any


def _has_array_value(value: Any) -> bool:
    if isinstance(value, list):
        return True
    if isinstance(value, dict):
        for nested in value.values():
            if _has_array_value(nested):
                return True
    return False


def detect_fuzzy_usage(context: dict[str, Any]) -> dict[str, Any]:
    model = context.get("model") or {}
    result = context.get("result") or {}

    input_kind = str(model.get("inputKind") or "")
    collective = result.get("collectiveEvaluations") or {}

    fuzzy_input_kind = "fuzzy" in input_kind.lower()
    fuzzy_values_detected = _has_array_value(collective)

    fuzzy_used = fuzzy_input_kind or fuzzy_values_detected

    notes = []
    if fuzzy_used:
        notes.append("Fuzzy values were summarized via centroid approximation for selected MVP metrics.")

    return {
        "fuzzyUsed": fuzzy_used,
        "notes": notes,
    }
