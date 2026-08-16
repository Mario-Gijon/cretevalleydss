from typing import Any

from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse

from schemas.common import ModelExecutionResponse
from services.results_analysis.contexts import build_generic_issue_context, build_model_issue_context
from services.results_analysis.contracts import normalize_analysis_result
from services.results_analysis.generic_analysis import analyze_issue
from services.results_analysis.model_analysis import load_model_analysis_handlers

router = APIRouter(tags=["Results Analysis"])


@router.post(
    "/results-analysis/generic-issue",
    response_model=ModelExecutionResponse,
    response_model_exclude_none=False,
)
async def analyze_generic_issue(analysis_context: dict[str, Any] = Body(...)):
    """Run only the model-independent, issue-level analysis projection."""
    try:
        generic_context = build_generic_issue_context(analysis_context)
        result = normalize_analysis_result(analyze_issue(generic_context))
    except (KeyError, TypeError, ValueError) as error:
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "message": str(error),
                "data": None,
                "error": {
                    "code": "ANALYSIS_CONTEXT_INVALID",
                    "field": "analysisContext",
                    "details": None,
                },
            },
        )

    return {
        "success": True,
        "message": "Generic issue analysis completed successfully",
        "data": result,
        "error": None,
    }


@router.post(
    "/results-analysis/model-issue",
    response_model=ModelExecutionResponse,
    response_model_exclude_none=False,
)
async def analyze_model_issue(payload: dict[str, Any] = Body(...)):
    """Run an optional model-specific issue analysis against frozen evidence."""
    try:
        api_model_key = payload["apiModelKey"]
        analysis_context = payload["analysisContext"]
        if not isinstance(api_model_key, str) or not api_model_key.strip():
            raise ValueError("apiModelKey is required")
        handlers = load_model_analysis_handlers(api_model_key.strip())
        handler = handlers.get("analyze_issue") if handlers else None
        result = None if handler is None else normalize_analysis_result(
            handler(build_model_issue_context(analysis_context))
        )
    except (KeyError, TypeError, ValueError) as error:
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "message": str(error),
                "data": None,
                "error": {
                    "code": "ANALYSIS_CONTEXT_INVALID",
                    "field": "analysisContext",
                    "details": None,
                },
            },
        )

    return {
        "success": True,
        "message": "Model issue analysis completed successfully",
        "data": result,
        "error": None,
    }
