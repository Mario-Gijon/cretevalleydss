from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from schemas.analysis import AnalysisContext, ResultsAnalysisResponse
from services.analysis import analyze_results_context

router = APIRouter(tags=["Results Analysis"])


def _build_response(
    success: bool,
    message: str,
    data: Any | None = None,
    error: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build the standard API envelope used by analysis endpoints."""
    response: dict[str, Any] = {
        "success": success,
        "message": message,
        "data": data,
    }
    if error is not None:
        response["error"] = error
    return response


def _success(message: str, data: Any) -> dict[str, Any]:
    """Build a successful analysis response payload."""
    return _build_response(success=True, message=message, data=data)


def _error(message: str, code: str = "ANALYSIS_INTERNAL_ERROR", details: Any | None = None) -> JSONResponse:
    """Build a non-throwing error response that preserves the API contract."""
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


@router.post(
    "/analysis/results",
    response_model=ResultsAnalysisResponse,
    response_model_exclude_none=False,
    summary="Analyze decision results",
    description="Ejecuta análisis determinista (no LLM) sobre el contexto de resultados DSS.",
    operation_id="analyzeDecisionResults",
)
async def analyze_results(payload: AnalysisContext):
    """Generate deterministic results analysis from a resolved DSS context payload."""
    try:
        data = analyze_results_context(payload.model_dump())
        return _success("Results analysis generated successfully", data)
    except Exception as error:
        return _error("Error generating results analysis", details=str(error))
