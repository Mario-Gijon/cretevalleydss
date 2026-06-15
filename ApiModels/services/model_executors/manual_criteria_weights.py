from typing import Any

from fastapi.responses import JSONResponse

from schemas.model_requests import GenericModelExecutionRequest
from services.model_executors.responses import error_response, success_response


def _is_plain_object(value: Any) -> bool:
    return isinstance(value, dict)


def _normalize_criterion_names(payload: GenericModelExecutionRequest) -> list[str]:
    criteria = payload.context.get("criteria") if _is_plain_object(payload.context) else []
    if not isinstance(criteria, list):
        return []

    criterion_names: list[str] = []
    for criterion in criteria:
        if not isinstance(criterion, dict):
            continue

        name = str(criterion.get("name") or "").strip()
        if name:
            criterion_names.append(name)

    return criterion_names


def execute_manual_criteria_weights(
    payload: GenericModelExecutionRequest,
) -> dict[str, Any] | JSONResponse:
    try:
        criterion_names = _normalize_criterion_names(payload)
        if len(criterion_names) == 0:
            return error_response(
                "Manual criteria weights require context.criteria with criterion names"
            )

        evaluations = payload.evaluations if isinstance(payload.evaluations, list) else []
        if len(evaluations) == 0:
            return error_response(
                "Manual criteria weights require completed evaluations"
            )

        criteria_sums = {criterion_name: 0.0 for criterion_name in criterion_names}

        for evaluation in evaluations:
            eval_payload = evaluation.get("payload", {}) if isinstance(evaluation, dict) else {}
            if not isinstance(eval_payload, dict):
                continue

            weights_by_criterion = eval_payload.get("weightsByCriterion")
            if not isinstance(weights_by_criterion, dict):
                return error_response(
                    "Manual criteria weights require evaluation payloads with weightsByCriterion"
                )

            for criterion_name in criterion_names:
                try:
                    numeric_weight = float(weights_by_criterion[criterion_name])
                except KeyError:
                    return error_response(
                        f"Manual criteria weights payload is missing weightsByCriterion['{criterion_name}']"
                    )
                except (TypeError, ValueError):
                    return error_response(
                        f"Manual criteria weights payload has invalid weightsByCriterion['{criterion_name}']"
                    )

                criteria_sums[criterion_name] += numeric_weight

        averaged_weights_by_criterion = {
            criterion_name: criteria_sums[criterion_name] / len(evaluations)
            for criterion_name in criterion_names
        }

        total_average = sum(averaged_weights_by_criterion.values())
        if total_average <= 0:
            return error_response(
                "Manual criteria weights cannot be normalized because their total is not positive"
            )

        weights_by_criterion = {
            criterion_name: averaged_weights_by_criterion[criterion_name] / total_average
            for criterion_name in criterion_names
        }

        response_data = {
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
        }

        return success_response(
            "Manual criteria weights executed successfully",
            response_data,
        )
    except Exception as error:
        return error_response(
            f"Error executing manual criteria weights: {error}",
            code="INTERNAL_ERROR",
        )
