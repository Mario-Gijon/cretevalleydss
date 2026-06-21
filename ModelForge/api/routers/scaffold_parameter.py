from fastapi import APIRouter

from schemas.scaffold_parameter import (
    ParameterScaffoldPreviewRequest,
    ParameterScaffoldPreviewResponse,
)
from services.parameter_scaffold_preview import build_parameter_scaffold_preview

router = APIRouter(tags=["Scaffold Parameter"])


@router.post(
    "/scaffold/parameter/preview",
    response_model=ParameterScaffoldPreviewResponse,
    response_model_exclude_none=False,
    summary="Preview parameter scaffold files",
    description=(
        "Renders parameter scaffold templates and returns preview files "
        "without writing them to disk."
    ),
)
async def preview_parameter_scaffold(
    request: ParameterScaffoldPreviewRequest,
) -> ParameterScaffoldPreviewResponse:
    return build_parameter_scaffold_preview(request)
