"""DecisionModelsService adapter for AHP criteria weighting."""

from typing import Any

from fastapi.responses import JSONResponse

from schemas.model_requests import GenericModelExecutionRequest
from services.criteria_weights_consensus.mcc_weights import solve_mcc_weights
from services.model_executors.responses import error_response, success_response
from .diagnostics import diagnose_ahp_consistency
from .run import run_ahp_criteria_weights


EXPECTED_STRUCTURE_KEY = "criteriaPairwiseAHP"
EXPECTED_STRUCTURE_STAGE = "criteriaWeighting"


def _normalize_request(payload: GenericModelExecutionRequest) -> tuple[dict[str, Any], list[Any]]:
    context = payload.context
    if not isinstance(context, dict):
        raise ValueError("context must be an object")
    structure = context.get("structure")
    if not isinstance(structure, dict):
        raise ValueError("context.structure must identify the AHP evaluation structure")
    if structure.get("key") != EXPECTED_STRUCTURE_KEY:
        raise ValueError(f"context.structure.key must be '{EXPECTED_STRUCTURE_KEY}'")
    if structure.get("stage") != EXPECTED_STRUCTURE_STAGE:
        raise ValueError(f"context.structure.stage must be '{EXPECTED_STRUCTURE_STAGE}'")
    model_parameters = payload.modelParameters
    if not isinstance(model_parameters, dict):
        raise ValueError("modelParameters must be an object")
    evaluations = payload.evaluations
    if not isinstance(evaluations, list):
        raise ValueError("evaluations must be a list")
    return context, evaluations


def execute_ahp_criteria_weights(
    payload: GenericModelExecutionRequest,
) -> dict[str, Any] | JSONResponse:
    try:
        context, evaluations = _normalize_request(payload)
        result = run_ahp_criteria_weights(context=context, evaluations=evaluations)
        criteria = result["criteria"]
        expert_weights = result["expertWeightsByExpert"]

        if len(expert_weights) == 1:
            expert_key = next(iter(expert_weights))
            weights = expert_weights[expert_key]
            aggregation: dict[str, Any] = {
                "method": "singleExpert",
                "singleExpertKey": expert_key,
            }
        else:
            mcc_result = solve_mcc_weights(
                criteria=criteria,
                expert_weights_by_expert=expert_weights,
            )
            weights = mcc_result["weightsByCriterion"]
            aggregation = {"method": "mcc", "mcc": mcc_result}

        diagnostics = result["expertDiagnosticsByExpert"]
        collective_evaluations = {
            "weightsByCriterion": dict(weights),
            "expertWeightsByExpert": expert_weights,
            "expertDiagnosticsByExpert": diagnostics,
            "aggregation": aggregation,
        }
        raw_output = {
            "priorityMethod": "principalEigenvector",
            "consistencyThreshold": 0.10,
            "nExperts": result["nExperts"],
            "expertWeightsByExpert": expert_weights,
            "expertDiagnosticsByExpert": diagnostics,
            "aggregation": aggregation,
        }
        response_data = {
            "message": "AHP criterion weights computed successfully",
            "consensusMeasure": None,
            "weightsByCriterion": dict(weights),
            "collectiveEvaluations": collective_evaluations,
            "rawOutput": raw_output,
        }
        return success_response("AHP criteria weights executed successfully", response_data)
    except ValueError as error:
        return error_response(str(error))
    except Exception as error:
        return error_response(
            f"Error executing AHP criteria weights: {error}",
            code="INTERNAL_ERROR",
        )


def diagnose_ahp_criteria_weights(
    payload: GenericModelExecutionRequest,
) -> dict[str, Any]:
    """Adapt the generic request contract to the read-only one-expert AHP diagnostic."""

    context, evaluations = _normalize_request(payload)
    if len(evaluations) != 1:
        raise ValueError(
            "AHP consistency diagnosis requires exactly one expert evaluation"
        )

    result = diagnose_ahp_consistency(context=context, evaluation=evaluations[0])
    result["criteria"] = [
        {"id": criterion["id"], "name": criterion["name"]}
        for criterion in context["criteria"]
    ]
    return result
