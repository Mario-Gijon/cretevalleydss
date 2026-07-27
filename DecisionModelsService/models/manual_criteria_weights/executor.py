from typing import Any

from fastapi.responses import JSONResponse

from schemas.model_requests import GenericModelExecutionRequest
from services.criteria_weights_consensus.mcc_weights import solve_mcc_weights
from services.model_executors.responses import error_response, success_response
from .run import run_manual_criteria_weights


def _is_plain_object(value: Any) -> bool:
    return isinstance(value, dict)


def _normalize_criteria(payload: GenericModelExecutionRequest) -> list[dict[str, str]]:
    if not _is_plain_object(payload.context):
        raise ValueError("Manual criteria weights require context to be an object")

    criteria = payload.context.get("criteria")
    if not isinstance(criteria, list) or len(criteria) == 0:
        raise ValueError(
            "Manual criteria weights require a non-empty context.criteria list"
        )

    criterion_items: list[dict[str, str]] = []
    seen_ids: set[str] = set()
    for index, criterion in enumerate(criteria):
        if not isinstance(criterion, dict):
            raise ValueError(
                f"Manual criteria weights context criterion at index {index} must be an object"
            )

        criterion_id_value = criterion.get("id")
        name_value = criterion.get("name")
        criterion_id = (
            criterion_id_value.strip()
            if isinstance(criterion_id_value, str)
            else ""
        )
        name = name_value.strip() if isinstance(name_value, str) else ""
        if not criterion_id:
            raise ValueError(
                f"Manual criteria weights context criterion id at index {index} is invalid"
            )
        if not name:
            raise ValueError(
                f"Manual criteria weights context criterion name at index {index} is invalid"
            )
        if criterion_id in seen_ids:
            raise ValueError(
                f"Manual criteria weights context criterion id '{criterion_id}' is duplicated"
            )

        seen_ids.add(criterion_id)
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
            evaluations=(
                payload.evaluations
                if isinstance(payload.evaluations, list)
                else []
            ),
        )

        if not results.get("success", False):
            return error_response(
                results.get("message") or "Error executing manual criteria weights",
                details=results,
            )

        data = results.get("data", {})
        expert_weights_by_expert = data.get("expertWeightsByExpert", {})
        if not isinstance(expert_weights_by_expert, dict):
            return error_response(
                "Manual criteria weights did not return expert weights"
            )

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
            "rawOutput": raw_output,
        }

        return success_response(
            "Manual criteria weights executed successfully",
            response_data,
        )
    except ValueError as error:
        return error_response(str(error))
    except Exception as error:
        return error_response(
            f"Error executing manual criteria weights: {error}",
            code="INTERNAL_ERROR",
        )
