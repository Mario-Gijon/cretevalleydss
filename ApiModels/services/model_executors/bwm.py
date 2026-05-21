from typing import Any

from fastapi.responses import JSONResponse

from models.bwm.bwm_model import run_bwm
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

            best_to_others = eval_payload.get("bestToOthers", {})
            others_to_worst = eval_payload.get("othersToWorst", {})

            if not isinstance(best_to_others, dict) or not isinstance(others_to_worst, dict):
                continue

            mic = [float(best_to_others[criterion_name]) for criterion_name in criterion_names]
            lic = [float(others_to_worst[criterion_name]) for criterion_name in criterion_names]

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
