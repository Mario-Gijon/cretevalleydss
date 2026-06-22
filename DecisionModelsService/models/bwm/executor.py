from typing import Any

from fastapi.responses import JSONResponse

from schemas.model_requests import GenericModelExecutionRequest
from services.criteria_weights_consensus.mcc_weights import solve_mcc_weights
from services.model_executors.responses import error_response, success_response
from .run import run_bwm


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


def _normalize_bwm_scale_value(value: Any, field: str) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field} must be an integer between 1 and 9")

    if not numeric.is_integer() or numeric < 1 or numeric > 9:
        raise ValueError(f"{field} must be an integer between 1 and 9")

    return numeric


def _build_weights_by_expert(
    *,
    criteria: list[dict[str, str]],
    expert_weights: dict[str, list[float]],
) -> dict[str, dict[str, float]]:
    weights_by_expert: dict[str, dict[str, float]] = {}

    for expert_key, weights in expert_weights.items():
        if not isinstance(weights, list) or len(weights) != len(criteria):
            raise ValueError(
                f"BWM output for expert '{expert_key}' does not match criteria length"
            )

        weights_by_expert[expert_key] = {
            criterion["id"]: float(weights[index])
            for index, criterion in enumerate(criteria)
        }

    return weights_by_expert


def _resolve_final_weights(
    *,
    criteria: list[dict[str, str]],
    expert_weights_by_expert: dict[str, dict[str, float]],
) -> tuple[dict[str, float], dict[str, Any]]:
    if len(expert_weights_by_expert) == 0:
        raise ValueError("BWM did not produce weights for any expert")

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


def execute_bwm(payload: GenericModelExecutionRequest) -> dict[str, Any] | JSONResponse:
    try:
        criteria = _normalize_criteria(payload)
        if len(criteria) == 0:
            return error_response("BWM requires context.criteria with criterion ids and names")

        experts_data: dict[str, dict[str, list[float]]] = {}
        for evaluation in payload.evaluations:
            expert = evaluation.get("expert", {}) if isinstance(evaluation, dict) else {}
            eval_payload = evaluation.get("payload", {}) if isinstance(evaluation, dict) else {}

            if not isinstance(expert, dict) or not isinstance(eval_payload, dict):
                continue

            expert_key = str(expert.get("email") or expert.get("id") or "").strip()
            if not expert_key:
                continue

            if expert_key in experts_data:
                return error_response(f"Duplicated BWM evaluation for expert '{expert_key}'")

            best_to_others = eval_payload.get("bestToOthers")
            others_to_worst = eval_payload.get("othersToWorst")

            if not isinstance(best_to_others, dict):
                return error_response(
                    f"Invalid BWM payload for expert '{expert_key}': bestToOthers must be an object"
                )
            if not isinstance(others_to_worst, dict):
                return error_response(
                    f"Invalid BWM payload for expert '{expert_key}': othersToWorst must be an object"
                )

            mic: list[float] = []
            lic: list[float] = []
            for criterion in criteria:
                criterion_id = criterion["id"]
                criterion_name = criterion["name"]
                if criterion_id not in best_to_others:
                    return error_response(
                        f"Invalid BWM payload for expert '{expert_key}': missing bestToOthers['{criterion_id}'] for '{criterion_name}'"
                    )
                if criterion_id not in others_to_worst:
                    return error_response(
                        f"Invalid BWM payload for expert '{expert_key}': missing othersToWorst['{criterion_id}'] for '{criterion_name}'"
                    )

                try:
                    mic.append(
                        _normalize_bwm_scale_value(
                            best_to_others[criterion_id],
                            f"bestToOthers['{criterion_id}']",
                        )
                    )
                    lic.append(
                        _normalize_bwm_scale_value(
                            others_to_worst[criterion_id],
                            f"othersToWorst['{criterion_id}']",
                        )
                    )
                except ValueError as error:
                    return error_response(
                        f"Invalid BWM payload for expert '{expert_key}': {error}"
                    )

            experts_data[expert_key] = {
                "mic": mic,
                "lic": lic,
            }

        if len(experts_data) == 0:
            return error_response("BWM requires completed evaluations with bestToOthers/othersToWorst")

        model_parameters = payload.modelParameters if _is_plain_object(payload.modelParameters) else {}
        eps_penalty = model_parameters.get("eps_penalty", 1)
        eps_penalty = float(eps_penalty) if eps_penalty is not None else 1

        results = run_bwm(experts_data, eps_penalty)

        if not results.get("success", False):
            return error_response(results.get("message") or "Error executing BWM")

        expert_weights = results.get("expertWeights", {})
        if not isinstance(expert_weights, dict):
            return error_response("BWM output does not contain expert weights")

        expert_weights_by_expert = _build_weights_by_expert(
            criteria=criteria,
            expert_weights=expert_weights,
        )

        try:
            weights_by_criterion, consensus_metadata = _resolve_final_weights(
                criteria=criteria,
                expert_weights_by_expert=expert_weights_by_expert,
            )
        except ValueError as error:
            return error_response(f"Error applying MCC to BWM weights: {error}")

        raw_output = {
            **results,
            "useMcc": consensus_metadata["useMcc"],
            "expertWeightsByExpert": expert_weights_by_expert,
        }

        if consensus_metadata["useMcc"]:
            raw_output["mcc"] = consensus_metadata["mcc"]
        else:
            raw_output["singleExpertKey"] = consensus_metadata["singleExpertKey"]

        response_data = {
            "message": f"Criteria weights for '{payload.context.get('issue', {}).get('name', 'issue')}' successfully computed.",
            "weightsByCriterion": weights_by_criterion,
            "collectiveEvaluations": {
                "weightsByCriterion": weights_by_criterion,
            },
            "consensusMeasure": None,
            "modelExecution": {
                "kind": "apiModels",
                "apiModelKey": "bwm",
                "apiEndpointPath": "/bwm",
            },
            "rawOutput": raw_output,
        }

        return success_response("BWM executed successfully", response_data)
    except Exception as error:
        return error_response(f"Error executing BWM: {error}", code="INTERNAL_ERROR")
