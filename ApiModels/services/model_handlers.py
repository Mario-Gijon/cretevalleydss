from typing import Any

from fastapi.responses import JSONResponse

from models.aras.aras_model import run_aras
from models.borda.borda_model import run_borda
from models.bwm.bwm_model import run_bwm
from models.cmcc.cmcc_model import run_cmcc
from models.fuzzy_topsis.fuzzy_topsis_model import run_fuzzy_topsis
from models.herrera_viedma_crp.herrera_viedma_crp_model import run_herrera_viedma
from models.topsis.topsis_model import run_topsis
from schemas.model_requests import (
    ArasRequest,
    BordaRequest,
    BwmRequest,
    CmccRequest,
    FuzzyTopsisRequest,
    HerreraViedmaRequest,
    TopsisRequest,
)


def _build_response(
    success: bool,
    message: str,
    data: Any | None = None,
    error: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Construye la respuesta estándar de la API de modelos."""

    response: dict[str, Any] = {
        "success": success,
        "message": message,
        "data": data,
    }

    if error is not None:
        response["error"] = error

    return response


def _success(message: str, data: Any) -> dict[str, Any]:
    """Construye una respuesta de éxito con contrato estándar."""

    return _build_response(success=True, message=message, data=data, error=None)


def _error(
    message: str,
    code: str = "MODEL_EXECUTION_ERROR",
    details: Any | None = None,
) -> JSONResponse:
    """Construye una respuesta de error con contrato estándar."""

    # Los fallos de ejecución conservan HTTP 200; el Backend decide por success=false.
    return JSONResponse(
        status_code=200,
        content={
            "success": False,
            "message": message,
            "data": None,
            "error": {
                "code": code,
                "field": None,
                "details": details,
            },
        },
    )


def execute_herrera_viedma(payload: HerreraViedmaRequest) -> dict[str, Any] | JSONResponse:
    """Ejecuta Herrera-Viedma CRP con el mismo flujo del endpoint legado."""

    try:
        model_parameters = payload.modelParameters

        results = run_herrera_viedma(
            payload.matrices,
            cl=payload.consensusThreshold,
            ag_lq=model_parameters.ag_lq,
            ex_lq=model_parameters.ex_lq,
            b=model_parameters.b,
            beta=model_parameters.beta,
            w_crit=[1.0],
        )

        results["alternatives_rankings"] = (
            results["alternatives_rankings"][-1].tolist()
        )

        return _success("Herrera Viedma CRP executed successfully", results)
    except Exception as error:
        return _error(
            f"Error executing Herrera Viedma CRP: {error}",
            code="INTERNAL_ERROR",
        )


def execute_topsis(payload: TopsisRequest) -> dict[str, Any] | JSONResponse:
    """Ejecuta TOPSIS clásico."""

    try:
        results = run_topsis(
            payload.matrices,
            weights=payload.modelParameters.weights,
            criterion_type=payload.criterionTypes,
        )

        return _success("Topsis executed successfully", results)
    except Exception as error:
        return _error(f"Error executing Topsis: {error}", code="INTERNAL_ERROR")


def execute_borda(payload: BordaRequest) -> dict[str, Any] | JSONResponse:
    """Ejecuta Borda."""

    try:
        results = run_borda(
            payload.matrices,
            criterion_type=payload.criterionTypes,
        )

        return _success("Borda executed successfully", results)
    except Exception as error:
        return _error(f"Error executing Borda: {error}", code="INTERNAL_ERROR")


def execute_aras(payload: ArasRequest) -> dict[str, Any] | JSONResponse:
    """Ejecuta ARAS."""

    try:
        results = run_aras(
            payload.matrices,
            weights=payload.modelParameters.weights,
            criterion_type=payload.criterionTypes,
        )

        return _success("Aras executed successfully", results)
    except Exception as error:
        return _error(f"Error executing Aras: {error}", code="INTERNAL_ERROR")


def execute_fuzzy_topsis(payload: FuzzyTopsisRequest) -> dict[str, Any] | JSONResponse:
    """Ejecuta Fuzzy TOPSIS."""

    try:
        results = run_fuzzy_topsis(
            payload.matrices,
            payload.modelParameters.weights,
            payload.criterionTypes,
        )

        return _success("Fuzzy TOPSIS executed successfully", results)
    except Exception as error:
        return _error(f"Error executing Fuzzy TOPSIS: {error}", code="INTERNAL_ERROR")


def execute_bwm(payload: BwmRequest) -> dict[str, Any] | JSONResponse:
    """Ejecuta BWM preservando la semántica histórica del endpoint."""

    try:
        experts_data = {
            expert_id: expert_data.model_dump()
            for expert_id, expert_data in payload.experts_data.items()
        }

        results = run_bwm(experts_data, payload.eps_penalty)

        if not results.get("success", False):
            error_message = results.get("message")
            return _error(error_message or "Error executing BWM")

        return _success("BWM executed successfully", results)
    except Exception as error:
        return _error(f"Error executing BWM: {error}", code="INTERNAL_ERROR")


def execute_cmcc(payload: CmccRequest) -> dict[str, Any] | JSONResponse:
    """Ejecuta CMCC preservando la semántica histórica del endpoint."""

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
            error_message = results.get("message")
            return _error(
                error_message or "Error executing CMCC",
                details=results,
            )

        return _success("CMCC executed successfully", results)
    except Exception as error:
        return _error(f"Error executing CMCC: {error}", code="INTERNAL_ERROR")
