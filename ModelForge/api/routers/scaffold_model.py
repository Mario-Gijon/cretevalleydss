from fastapi import APIRouter

from schemas.scaffold_model import (
    ModelScaffoldPreviewRequest,
    ModelScaffoldPreviewResponse,
)
from services.model_scaffold_preview import build_model_scaffold_preview

router = APIRouter(tags=["Scaffold Model"])


@router.post(
    "/scaffold/model/preview",
    response_model=ModelScaffoldPreviewResponse,
    response_model_exclude_none=False,
    summary="Preview model scaffold files",
    description="Renders model scaffold templates and returns preview files without writing them to disk.",
)
async def preview_model_scaffold(
    request: ModelScaffoldPreviewRequest,
) -> ModelScaffoldPreviewResponse:
    return build_model_scaffold_preview(request)
