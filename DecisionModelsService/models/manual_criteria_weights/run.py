import math
from typing import Any


WEIGHT_SUM_TOLERANCE = 1e-6


def _extract_expert_key(evaluation: dict[str, Any], index: int) -> str:
    expert = evaluation.get("expert", {}) if isinstance(evaluation, dict) else {}
    if isinstance(expert, dict):
        expert_key = str(expert.get("email") or expert.get("id") or "").strip()
        if expert_key:
            return expert_key

    return f"expert_{index + 1}"


def _validate_weight(value: Any, *, expert_key: str, criterion_id: str) -> float:
    try:
        numeric_weight = float(value)
    except (TypeError, ValueError):
        raise ValueError(
            f"Manual criteria weights payload has invalid "
            f"weightsByCriterion['{criterion_id}'] for expert '{expert_key}'"
        )

    if not math.isfinite(numeric_weight):
        raise ValueError(
            f"Manual criteria weights payload has non-finite "
            f"weightsByCriterion['{criterion_id}'] for expert '{expert_key}'"
        )

    if numeric_weight < 0 or numeric_weight > 1:
        raise ValueError(
            f"Manual criteria weights payload must contain weights between 0 and 1 "
            f"for expert '{expert_key}' and criterion '{criterion_id}'"
        )

    return numeric_weight


def run_manual_criteria_weights(
    *,
    criteria: list[dict[str, str]],
    evaluations: list[Any],
) -> dict[str, Any]:
    if len(criteria) == 0:
        return {
            "success": False,
            "message": "Manual criteria weights require context.criteria with criterion ids and names",
        }

    if len(evaluations) == 0:
        return {
            "success": False,
            "message": "Manual criteria weights require completed evaluations",
        }

    expert_weights_by_expert: dict[str, dict[str, float]] = {}

    try:
        for index, evaluation in enumerate(evaluations):
            if not isinstance(evaluation, dict):
                continue

            expert_key = _extract_expert_key(evaluation, index)
            if expert_key in expert_weights_by_expert:
                return {
                    "success": False,
                    "message": f"Duplicated manual criteria weights evaluation for expert '{expert_key}'",
                }

            eval_payload = evaluation.get("payload", {})
            if not isinstance(eval_payload, dict):
                continue

            weights_by_criterion = eval_payload.get("weightsByCriterion")
            if not isinstance(weights_by_criterion, dict):
                return {
                    "success": False,
                    "message": (
                        "Manual criteria weights require evaluation payloads with "
                        "weightsByCriterion"
                    ),
                }

            expert_weights: dict[str, float] = {}
            for criterion in criteria:
                criterion_id = criterion["id"]
                criterion_name = criterion["name"]

                if criterion_id not in weights_by_criterion:
                    return {
                        "success": False,
                        "message": (
                            "Manual criteria weights payload is missing "
                            f"weightsByCriterion['{criterion_id}'] for '{criterion_name}'"
                        ),
                    }

                expert_weights[criterion_id] = _validate_weight(
                    weights_by_criterion[criterion_id],
                    expert_key=expert_key,
                    criterion_id=criterion_id,
                )

            total = sum(expert_weights.values())
            if abs(total - 1.0) > WEIGHT_SUM_TOLERANCE:
                return {
                    "success": False,
                    "message": (
                        "Manual criteria weights payload for expert "
                        f"'{expert_key}' must sum to 1 (got {total})"
                    ),
                }

            expert_weights_by_expert[expert_key] = expert_weights

        if len(expert_weights_by_expert) == 0:
            return {
                "success": False,
                "message": "Manual criteria weights require valid completed evaluations",
            }

        return {
            "success": True,
            "data": {
                "expertWeightsByExpert": expert_weights_by_expert,
                "nExperts": len(expert_weights_by_expert),
            },
        }
    except ValueError as error:
        return {
            "success": False,
            "message": str(error),
        }
