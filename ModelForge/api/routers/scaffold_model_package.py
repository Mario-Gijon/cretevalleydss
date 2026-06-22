from fastapi import APIRouter

from core.settings import get_settings
from schemas.scaffold_model_package import (
    ModelPackageApplyRequest,
    ModelPackageApplyResponse,
    ModelPackagePreviewRequest,
    ModelPackagePreviewResponse,
)
from services.model_package_apply import apply_model_package_scaffold
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


@router.post(
    "/scaffold/model-package/apply",
    response_model=ModelPackageApplyResponse,
    response_model_exclude_none=False,
    summary="Apply model package scaffold files",
    description=(
        "Builds a complete model package scaffold plan and writes only missing "
        "files, aborting on partial items or file conflicts."
    ),
)
async def apply_model_package(
    request: ModelPackageApplyRequest,
) -> ModelPackageApplyResponse:
    settings = get_settings()
    return apply_model_package_scaffold(request, project_root=settings.project_root)
