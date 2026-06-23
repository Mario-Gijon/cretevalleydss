from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from core.environment import is_production_environment

router = APIRouter(tags=["System"])

RELOAD_MARKER_PATH = Path(__file__).resolve().parents[2] / "core" / "reload_marker.py"


def _utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _write_reload_marker() -> None:
    marker_value = _utc_timestamp()
    RELOAD_MARKER_PATH.write_text(
        f'RELOAD_MARKER = "{marker_value}"\n',
        encoding="utf-8",
    )


@router.post(
    "/system/reload",
    response_model_exclude_none=False,
    summary="Schedule a local development reload",
    description=(
        "Programa un reinicio del proceso de DecisionModelsService en entornos "
        "locales/desarrollo para que uvicorn --reload reconstruya el registro."
    ),
)
async def reload_system():
    if is_production_environment():
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "success": False,
                "message": "DecisionModelsService reload is disabled in production.",
                "data": None,
                "error": {
                    "code": "DECISION_MODELS_RELOAD_DISABLED",
                    "field": None,
                    "details": None,
                },
            },
        )

    _write_reload_marker()

    return JSONResponse(
        status_code=status.HTTP_202_ACCEPTED,
        content={
            "success": True,
            "message": "DecisionModelsService reload scheduled successfully",
            "data": {
                "service": "DecisionModelsService",
                "reloadScheduled": True,
            },
            "error": None,
        },
    )
