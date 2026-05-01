from __future__ import annotations

from typing import Any


def _to_number(value: Any) -> float | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    return None


def _to_scalar(value: Any) -> tuple[float | None, bool]:
    if isinstance(value, dict):
        value = value.get("value")

    if isinstance(value, list) and len(value) == 3:
        numbers = [_to_number(item) for item in value]
        if any(number is None for number in numbers):
            return None, False
        return sum(numbers) / 3.0, True

    number = _to_number(value)
    return number, False


def analyze_expert_agreement(context: dict[str, Any]) -> dict[str, Any]:
    used_fields: list[str] = []
    missing_fields: list[str] = []

    evaluations = context.get("evaluations") or {}
    result = context.get("result") or {}

    canonical_by_expert = evaluations.get("canonicalByExpert") or {}
    collective = result.get("collectiveEvaluations") or {}

    if canonical_by_expert:
        used_fields.append("evaluations.canonicalByExpert")
    else:
        missing_fields.append("evaluations.canonicalByExpert")

    if collective:
        used_fields.append("result.collectiveEvaluations")
    else:
        missing_fields.append("result.collectiveEvaluations")

    if not canonical_by_expert or not collective:
        return {
            "agreement": {
                "status": "insufficient_data",
                "hotspots": [],
                "fuzzyCentroidApproximationUsed": False,
            },
            "used_fields": used_fields,
            "missing_fields": missing_fields,
            "agreement_warning": "Expert agreement analysis requires evaluations.canonicalByExpert and result.collectiveEvaluations.",
        }

    hotspots: list[dict[str, Any]] = []
    fuzzy_approximated = False

    for expert_key, expert_matrix in canonical_by_expert.items():
        if not isinstance(expert_matrix, dict):
            continue

        for alternative_name, by_criterion in expert_matrix.items():
            if not isinstance(by_criterion, dict):
                continue
            collective_by_criterion = collective.get(alternative_name)
            if not isinstance(collective_by_criterion, dict):
                continue

            for criterion_name, expert_value_raw in by_criterion.items():
                collective_raw = collective_by_criterion.get(criterion_name)
                expert_value, expert_fuzzy = _to_scalar(expert_value_raw)
                collective_value, collective_fuzzy = _to_scalar(collective_raw)

                if expert_value is None or collective_value is None:
                    continue

                fuzzy_approximated = fuzzy_approximated or expert_fuzzy or collective_fuzzy
                hotspots.append(
                    {
                        "expert": expert_key,
                        "alternative": alternative_name,
                        "criterion": criterion_name,
                        "distance": abs(expert_value - collective_value),
                        "expertValue": expert_value,
                        "collectiveValue": collective_value,
                    }
                )

    hotspots = sorted(hotspots, key=lambda item: item["distance"], reverse=True)[:10]

    status = "ok" if hotspots else "insufficient_numeric_overlap"

    return {
        "agreement": {
            "status": status,
            "hotspots": hotspots,
            "fuzzyCentroidApproximationUsed": fuzzy_approximated,
        },
        "used_fields": used_fields,
        "missing_fields": missing_fields,
        "agreement_warning": None if status == "ok" else "Expert agreement analysis could not compute numeric distances from provided values.",
    }
