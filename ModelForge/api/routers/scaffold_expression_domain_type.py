from fastapi import APIRouter

from core.settings import get_settings
from schemas.scaffold_expression_domain_type import (
    ExpressionDomainTypeScaffoldApplyRequest,
    ExpressionDomainTypeScaffoldApplyResponse,
    ExpressionDomainTypeScaffoldPreviewRequest,
    ExpressionDomainTypeScaffoldPreviewResponse,
)
from services.expression_domain_type_scaffold_apply import (
    apply_expression_domain_type_scaffold,
)
from services.expression_domain_type_scaffold_preview import (
    build_expression_domain_type_scaffold_preview,
)

router = APIRouter(tags=["Scaffold Expression Domain Type"])


@router.post(
    "/scaffold/expression-domain-type/preview",
    response_model=ExpressionDomainTypeScaffoldPreviewResponse,
    response_model_exclude_none=False,
    summary="Preview expression domain type scaffold files",
    description=(
        "Builds a new global expression domain type plugin scaffold and returns "
        "rendered backend/frontend files without writing them to disk."
    ),
)
async def preview_expression_domain_type_scaffold(
    request: ExpressionDomainTypeScaffoldPreviewRequest,
) -> ExpressionDomainTypeScaffoldPreviewResponse:
    settings = get_settings()
    return build_expression_domain_type_scaffold_preview(
        request,
        project_root=settings.project_root,
    )


@router.post(
    "/scaffold/expression-domain-type/apply",
    response_model=ExpressionDomainTypeScaffoldApplyResponse,
    response_model_exclude_none=False,
    summary="Apply expression domain type scaffold files",
    description=(
        "Builds and writes a new global expression domain type plugin scaffold, "
        "aborting on existing targets or validation failures."
    ),
)
async def apply_expression_domain_type(
    request: ExpressionDomainTypeScaffoldApplyRequest,
) -> ExpressionDomainTypeScaffoldApplyResponse:
    settings = get_settings()
    return apply_expression_domain_type_scaffold(
        request,
        project_root=settings.project_root,
    )
