from typing import Any

from fastapi.responses import JSONResponse

from models.bwm.bwm_model import run_bwm
from schemas.model_requests import BwmRequest
from services.model_executors.responses import error_response, success_response


def execute_bwm(payload: BwmRequest) -> dict[str, Any] | JSONResponse:
    try:
        experts_data = {
            expert_id: expert_data.model_dump()
            for expert_id, expert_data in payload.experts_data.items()
        }

        results = run_bwm(experts_data, payload.eps_penalty)

        if not results.get("success", False):
            return error_response(results.get("message") or "Error executing BWM")

        return success_response("BWM executed successfully", results)
    except Exception as error:
        return error_response(f"Error executing BWM: {error}", code="INTERNAL_ERROR")