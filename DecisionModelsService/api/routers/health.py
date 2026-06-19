from fastapi import APIRouter

from registry.model_registry import MODEL_DEFINITIONS
from schemas.common import ModelExecutionResponse

router = APIRouter(tags=["Health"])


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
        },
        "error": None,
    }
