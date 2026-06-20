from typing import Any

from fastapi.responses import JSONResponse

from schemas.model_requests import GenericModelExecutionRequest
from services.model_executors.responses import error_response, success_response
from .run import run_manual_criteria_weights


def _is_plain_object(value: Any) -> bool:
    return isinstance(value, dict)


def _normalize_criteria(payload: GenericModelExecutionRequest) -> list[dict[str, str]]:
    criteria = payload.context.get("criteria") if _is_plain_object(payload.context) else []
    if not isinstance(criteria, list):
        return []

    criterion_items: list[dict[str, str]] = []
    for criterion in criteria:
        if not isinstance(criterion, dict):
            continue

        criterion_id = str(criterion.get("id") or "").strip()
        name = str(criterion.get("name") or "").strip()
        if criterion_id and name:
            criterion_items.append({
                "id": criterion_id,
                "name": name,
            })

    return criterion_items


def execute_manual_criteria_weights(
    payload: GenericModelExecutionRequest,
) -> dict[str, Any] | JSONResponse:
    try:
        criteria = _normalize_criteria(payload)
        results = run_manual_criteria_weights(
            criteria=criteria,
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
