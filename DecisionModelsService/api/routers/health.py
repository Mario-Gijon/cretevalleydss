from datetime import datetime, timezone

from fastapi import APIRouter

from registry.model_registry import MODEL_DEFINITIONS
from schemas.common import ModelExecutionResponse

router = APIRouter(tags=["Health"])
STARTED_AT = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


@router.get(
    "/health",
    response_model=ModelExecutionResponse,
    response_model_exclude_none=False,
    summary="Get service health",
    description=(
        "Devuelve el estado de salud básico de DecisionModelsService sin ejecutar "
        "modelos ni consultar servicios externos."
    ),
)
async def get_health():
    return {
        "success": True,
        "message": "DecisionModelsService is healthy",
        "data": {
            "service": "DecisionModelsService",
            "status": "healthy",
            "modelsCount": len(MODEL_DEFINITIONS),
            "startedAt": STARTED_AT,
        },
        "error": None,
    }
