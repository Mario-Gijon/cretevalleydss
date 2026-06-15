from fastapi import APIRouter

from schemas.model_manifest import ModelManifestResponse
from services.model_manifest_service import build_model_manifest

router = APIRouter(tags=["Model Manifest"])


@router.get(
    "/models/manifest",
    response_model=ModelManifestResponse,
    response_model_exclude_none=False,
    summary="Get model manifest",
    description="Devuelve el manifest técnico read-only de modelos publicados por ApiModels.",
)
async def get_model_manifest():
    """Devuelve el manifest técnico sin ejecutar modelos ni consultar servicios externos."""

    return {
        "success": True,
        "message": "Model manifest fetched successfully",
        "data": build_model_manifest(),
    }
