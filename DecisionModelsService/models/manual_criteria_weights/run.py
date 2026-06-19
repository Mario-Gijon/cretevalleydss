import math
from typing import Any


def run_manual_criteria_weights(
    *,
    criterion_names: list[str],
    evaluations: list[Any],
) -> dict[str, Any]:
    if len(criterion_names) == 0:
        return {
            "success": False,
            "message": "Manual criteria weights require context.criteria with criterion names",
        }

    if len(evaluations) == 0:
        return {
            "success": False,
            "message": "Manual criteria weights require completed evaluations",
        }

    criteria_sums = {criterion_name: 0.0 for criterion_name in criterion_names}

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

        for criterion_name in criterion_names:
            try:
                numeric_weight = float(weights_by_criterion[criterion_name])
            except KeyError:
                return {
                    "success": False,
                    "message": (
                        "Manual criteria weights payload is missing "
                        f"weightsByCriterion['{criterion_name}']"
                    ),
                }
            except (TypeError, ValueError):
                return {
                    "success": False,
                    "message": (
                        "Manual criteria weights payload has invalid "
                        f"weightsByCriterion['{criterion_name}']"
                    ),
                }

            if not math.isfinite(numeric_weight):
                return {
                    "success": False,
                    "message": (
                        "Manual criteria weights payload has non-finite "
                        f"weightsByCriterion['{criterion_name}']"
                    ),
                }

            criteria_sums[criterion_name] += numeric_weight

    averaged_weights_by_criterion = {
        criterion_name: criteria_sums[criterion_name] / len(evaluations)
        for criterion_name in criterion_names
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
        criterion_name: averaged_weights_by_criterion[criterion_name] / total_average
        for criterion_name in criterion_names
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
