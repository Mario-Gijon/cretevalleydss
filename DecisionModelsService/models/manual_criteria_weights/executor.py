from typing import Any

from fastapi.responses import JSONResponse

from schemas.model_requests import GenericModelExecutionRequest
from services.model_executors.responses import error_response, success_response
from .run import run_manual_criteria_weights


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
        results = run_manual_criteria_weights(
            criterion_names=criterion_names,
            evaluations=payload.evaluations if isinstance(payload.evaluations, list) else [],
        )

        if not results.get("success", False):
            return error_response(
                results.get("message") or "Error executing manual criteria weights",
                details=results,
            )

        return success_response(
            "Manual criteria weights executed successfully",
            results["data"],
        )
    except Exception as error:
        return error_response(
            f"Error executing manual criteria weights: {error}",
            code="INTERNAL_ERROR",
        )
