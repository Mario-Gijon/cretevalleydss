from typing import Any

from fastapi.responses import JSONResponse

from schemas.model_requests import GenericModelExecutionRequest
from services.criteria_weights_consensus.mcc_weights import solve_mcc_weights
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


def _resolve_final_weights(
    *,
    criteria: list[dict[str, str]],
    expert_weights_by_expert: dict[str, dict[str, float]],
) -> tuple[dict[str, float], dict[str, Any]]:
    if len(expert_weights_by_expert) == 0:
        raise ValueError("Manual criteria weights did not produce weights for any expert")

    if len(expert_weights_by_expert) == 1:
        expert_key = next(iter(expert_weights_by_expert))
        return expert_weights_by_expert[expert_key], {
            "useMcc": False,
            "singleExpertKey": expert_key,
        }

    mcc_result = solve_mcc_weights(
        criteria=criteria,
        expert_weights_by_expert=expert_weights_by_expert,
    )

    return mcc_result["weightsByCriterion"], {
        "useMcc": True,
        "mcc": mcc_result,
    }


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

        data = results.get("data", {})
        expert_weights_by_expert = data.get("expertWeightsByExpert", {})
        if not isinstance(expert_weights_by_expert, dict):
            return error_response("Manual criteria weights did not return expert weights")

        try:
            weights_by_criterion, consensus_metadata = _resolve_final_weights(
                criteria=criteria,
                expert_weights_by_expert=expert_weights_by_expert,
            )
        except ValueError as error:
            return error_response(
                f"Error applying MCC to manual criteria weights: {error}",
                details=results,
            )

        raw_output = {
            "useMcc": consensus_metadata["useMcc"],
            "expertWeightsByExpert": expert_weights_by_expert,
            "nExperts": len(expert_weights_by_expert),
        }

        if consensus_metadata["useMcc"]:
            raw_output["mcc"] = consensus_metadata["mcc"]
        else:
            raw_output["singleExpertKey"] = consensus_metadata["singleExpertKey"]

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
            "rawOutput": raw_output,
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
