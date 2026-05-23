from typing import Any

from fastapi.responses import JSONResponse

from models.cmcc.cmcc_model import run_cmcc
from schemas.model_requests import CmccRequest
from services.model_executors.responses import error_response, success_response


def execute_cmcc(payload: CmccRequest) -> dict[str, Any] | JSONResponse:
    try:
        results = run_cmcc(
            o=payload.o,
            c=payload.c,
            omega=payload.omega,
            w=payload.w,
            eps=payload.eps,
            mu0=payload.mu0,
            lower_bound=payload.lower_bound,
            upper_bound=payload.upper_bound,
            msg=False,
        )

        if not results.get("success", False):
            return error_response(
                results.get("message") or "Error executing CMCC",
                details=results,
            )

        return success_response("CMCC executed successfully", results)
    except Exception as error:
        return error_response(f"Error executing CMCC: {error}", code="INTERNAL_ERROR")