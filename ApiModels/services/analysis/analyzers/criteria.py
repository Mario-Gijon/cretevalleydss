from __future__ import annotations

from typing import Any


def _to_number(value: Any) -> float | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    return None


def _value_from_collective_payload(payload: Any) -> tuple[float | None, bool]:
    if isinstance(payload, dict):
        payload = payload.get("value")

    if isinstance(payload, list) and len(payload) == 3:
        numbers = [_to_number(item) for item in payload]
        if any(number is None for number in numbers):
            return None, False
        return sum(numbers) / 3.0, True

    number = _to_number(payload)
    return number, False


def _resolve_weights(problem: dict[str, Any]) -> dict[str, float]:
    leaf = problem.get("leafCriteria") or []
    weights = problem.get("weights") or []

    if isinstance(weights, list) and leaf and len(weights) == len(leaf):
        by_name: dict[str, float] = {}
        for index, criterion in enumerate(leaf):
            if not isinstance(criterion, dict):
                continue
            name = criterion.get("name")
            if not isinstance(name, str) or not name.strip():
                continue
            weight = _to_number(weights[index])
            if weight is not None:
                by_name[name] = weight
        if by_name:
            return by_name

    by_name: dict[str, float] = {}
    for criterion in leaf:
        if not isinstance(criterion, dict):
            continue
        name = criterion.get("name")
        if not isinstance(name, str) or not name.strip():
            continue
        weight = _to_number(criterion.get("weight"))
        if weight is not None:
            by_name[name] = weight
    return by_name


def analyze_criteria(context: dict[str, Any], winner: str | None, runner_up: str | None) -> dict[str, Any]:
    used_fields: list[str] = []
    missing_fields: list[str] = []

    problem = context.get("problem") or {}
    result = context.get("result") or {}
    leaf_criteria = problem.get("leafCriteria") or []

    if leaf_criteria:
        used_fields.append("problem.leafCriteria")
    else:
        missing_fields.append("problem.leafCriteria")

    criterion_weights = _resolve_weights(problem)
    if criterion_weights:
        used_fields.append("problem.weights|problem.leafCriteria.weight")
    else:
        missing_fields.append("problem.weights")

    top_weighted = sorted(
        (
            {"criterion": criterion, "weight": weight}
            for criterion, weight in criterion_weights.items()
        ),
        key=lambda item: item["weight"],
        reverse=True,
    )[:3]
    weights = list(criterion_weights.values())
    weight_dominance = {
        "allEqualByWeight": False,
        "maxWeight": None,
        "minWeight": None,
    }
    if weights:
        max_weight = max(weights)
        min_weight = min(weights)
        weight_dominance = {
            "allEqualByWeight": abs(max_weight - min_weight) <= 1e-9,
            "maxWeight": max_weight,
            "minWeight": min_weight,
        }

    collective = result.get("collectiveEvaluations") or {}
    if collective:
        used_fields.append("result.collectiveEvaluations")
    else:
        missing_fields.append("result.collectiveEvaluations")

    winner_strengths: list[dict[str, Any]] = []
    fuzzy_approximated = False

    if winner and runner_up and isinstance(collective, dict):
        winner_row = collective.get(winner) if isinstance(collective.get(winner), dict) else {}
        runner_row = collective.get(runner_up) if isinstance(collective.get(runner_up), dict) else {}

        criterion_type_by_name = {
            item.get("name"): item.get("type")
            for item in leaf_criteria
            if isinstance(item, dict)
        }

        for criterion in criterion_type_by_name.keys():
            winner_value, winner_fuzzy = _value_from_collective_payload(winner_row.get(criterion))
            runner_value, runner_fuzzy = _value_from_collective_payload(runner_row.get(criterion))

            if winner_value is None or runner_value is None:
                continue

            fuzzy_approximated = fuzzy_approximated or winner_fuzzy or runner_fuzzy
            criterion_type = criterion_type_by_name.get(criterion)
            if criterion_type == "cost":
                advantage = runner_value - winner_value
            else:
                advantage = winner_value - runner_value

            winner_strengths.append(
                {
                    "criterion": criterion,
                    "winnerValue": winner_value,
                    "runnerUpValue": runner_value,
                    "advantage": advantage,
                    "criterionType": criterion_type,
                }
            )

    winner_strengths = sorted(
        winner_strengths,
        key=lambda item: abs(item.get("advantage", 0.0)),
        reverse=True,
    )[:5]

    return {
        "criterionInfluence": {
            "topWeightedCriteria": top_weighted,
            "winnerStrengthCriteria": winner_strengths,
            "fuzzyCentroidApproximationUsed": fuzzy_approximated,
            "weightDominance": weight_dominance,
        },
        "used_fields": used_fields,
        "missing_fields": missing_fields,
    }
