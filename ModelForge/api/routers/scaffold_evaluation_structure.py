from fastapi import APIRouter

from schemas.scaffold_evaluation_structure import (
    EvaluationStructureScaffoldPreviewRequest,
    EvaluationStructureScaffoldPreviewResponse,
)
from services.evaluation_structure_scaffold_preview import (
    build_evaluation_structure_scaffold_preview,
)

router = APIRouter(tags=["Scaffold Evaluation Structure"])


@router.post(
    "/scaffold/evaluation-structure/preview",
    response_model=EvaluationStructureScaffoldPreviewResponse,
    response_model_exclude_none=False,
    summary="Preview evaluation structure scaffold files",
    description=(
        "Renders evaluation structure scaffold templates and returns preview "
        "files without writing them to disk."
    ),
)
async def preview_evaluation_structure_scaffold(
    request: EvaluationStructureScaffoldPreviewRequest,
) -> EvaluationStructureScaffoldPreviewResponse:
    return build_evaluation_structure_scaffold_preview(request)
