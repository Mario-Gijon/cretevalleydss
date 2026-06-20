import math
from typing import Any


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

    criteria_sums = {criterion["id"]: 0.0 for criterion in criteria}

    for evaluation in evaluations:
        eval_payload = evaluation.get("payload", {}) if isinstance(evaluation, dict) else {}
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

        for criterion in criteria:
            criterion_id = criterion["id"]
            criterion_name = criterion["name"]
            try:
                numeric_weight = float(weights_by_criterion[criterion_id])
            except KeyError:
                return {
                    "success": False,
                    "message": (
                        "Manual criteria weights payload is missing "
                        f"weightsByCriterion['{criterion_id}'] for '{criterion_name}'"
                    ),
                }
            except (TypeError, ValueError):
                return {
                    "success": False,
                    "message": (
                        "Manual criteria weights payload has invalid "
                        f"weightsByCriterion['{criterion_id}'] for '{criterion_name}'"
                    ),
                }

            if not math.isfinite(numeric_weight):
                return {
                    "success": False,
                    "message": (
                        "Manual criteria weights payload has non-finite "
                        f"weightsByCriterion['{criterion_id}'] for '{criterion_name}'"
                    ),
                }

            criteria_sums[criterion_id] += numeric_weight

    averaged_weights_by_criterion = {
        criterion["id"]: criteria_sums[criterion["id"]] / len(evaluations)
        for criterion in criteria
    }

    total_average = sum(averaged_weights_by_criterion.values())
    if not math.isfinite(total_average) or total_average <= 0:
        return {
            "success": False,
            "message": (
                "Manual criteria weights cannot be normalized because their total "
                "is not positive"
            ),
        }

    weights_by_criterion = {
        criterion["id"]: averaged_weights_by_criterion[criterion["id"]] / total_average
        for criterion in criteria
    }

    return {
        "success": True,
        "data": {
            "message": "Criteria weights computed successfully",
            "consensusMeasure": None,
            "weightsByCriterion": weights_by_criterion,
            "collectiveEvaluations": {
                "weightsByCriterion": weights_by_criterion,
            },
            "modelExecution": {
                "kind": "apiModels",
                "apiModelKey": "manual_criteria_weights",
                "apiEndpointPath": "/manual_criteria_weights",
            },
            "rawOutput": {
                "averagedWeightsByCriterion": averaged_weights_by_criterion,
            },
        },
    }
