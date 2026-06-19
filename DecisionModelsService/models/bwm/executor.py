from typing import Any

from fastapi.responses import JSONResponse

from schemas.model_requests import GenericModelExecutionRequest
from services.model_executors.responses import error_response, success_response
from .run import run_bwm


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


def _normalize_bwm_scale_value(value: Any, field: str) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field} must be an integer between 1 and 9")

    if not numeric.is_integer() or numeric < 1 or numeric > 9:
        raise ValueError(f"{field} must be an integer between 1 and 9")

    return numeric


def execute_bwm(payload: GenericModelExecutionRequest) -> dict[str, Any] | JSONResponse:
    try:
        criterion_names = _normalize_criterion_names(payload)
        if len(criterion_names) == 0:
            return error_response("BWM requires context.criteria with criterion names")

        experts_data: dict[str, dict[str, list[float]]] = {}
        for evaluation in payload.evaluations:
            expert = evaluation.get("expert", {}) if isinstance(evaluation, dict) else {}
            eval_payload = evaluation.get("payload", {}) if isinstance(evaluation, dict) else {}

            if not isinstance(expert, dict) or not isinstance(eval_payload, dict):
                continue

            expert_key = str(expert.get("email") or expert.get("id") or "").strip()
            if not expert_key:
                continue

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
            for criterion_name in criterion_names:
                if criterion_name not in best_to_others:
                    return error_response(
                        f"Invalid BWM payload for expert '{expert_key}': missing bestToOthers['{criterion_name}']"
                    )
                if criterion_name not in others_to_worst:
                    return error_response(
                        f"Invalid BWM payload for expert '{expert_key}': missing othersToWorst['{criterion_name}']"
                    )

                try:
                    mic.append(
                        _normalize_bwm_scale_value(
                            best_to_others[criterion_name],
                            f"bestToOthers['{criterion_name}']",
                        )
                    )
                    lic.append(
                        _normalize_bwm_scale_value(
                            others_to_worst[criterion_name],
                            f"othersToWorst['{criterion_name}']",
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

        weights = results.get("weights", [])
        if not isinstance(weights, list) or len(weights) < len(criterion_names):
            return error_response("BWM output does not contain enough weights")

        weights_by_criterion = {
            criterion_name: float(weights[index])
            for index, criterion_name in enumerate(criterion_names)
        }

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
            "rawOutput": results,
        }

        return success_response("BWM executed successfully", response_data)
    except Exception as error:
        return error_response(f"Error executing BWM: {error}", code="INTERNAL_ERROR")
