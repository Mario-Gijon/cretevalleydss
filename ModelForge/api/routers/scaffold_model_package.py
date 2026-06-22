from fastapi import APIRouter

from core.settings import get_settings
from schemas.scaffold_model_package import (
    ModelPackagePreviewRequest,
    ModelPackagePreviewResponse,
)
from services.model_package_preview import build_model_package_preview

router = APIRouter(tags=["Scaffold Model Package"])


@router.post(
    "/scaffold/model-package/preview",
    response_model=ModelPackagePreviewResponse,
    response_model_exclude_none=False,
    summary="Preview model package scaffold files",
    description=(
        "Builds a complete model package preview and only renders scaffold files "
        "for missing model, evaluation structure, and parameter structure parts."
    ),
)
async def preview_model_package_scaffold(
    request: ModelPackagePreviewRequest,
) -> ModelPackagePreviewResponse:
    settings = get_settings()
    return build_model_package_preview(request, project_root=settings.project_root)
