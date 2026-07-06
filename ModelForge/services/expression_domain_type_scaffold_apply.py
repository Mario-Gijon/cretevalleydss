from pathlib import Path

from fastapi import HTTPException

from schemas.scaffold_expression_domain_type import (
    ExpressionDomainTypeApplyItem,
    ExpressionDomainTypeScaffoldApplyRequest,
    ExpressionDomainTypeScaffoldApplyResponse,
    ExpressionDomainTypeScaffoldPreviewRequest,
)
from services.expression_domain_type_scaffold_preview import (
    build_expression_domain_type_scaffold_preview,
)
from services.scaffold_file_writer import write_scaffold_files
from services.scaffold_validation import (
    has_failed_validation,
    validate_rendered_scaffold_files,
    validate_written_scaffold_files,
)


def apply_expression_domain_type_scaffold(
    request: ExpressionDomainTypeScaffoldApplyRequest,
    *,
    project_root: Path,
) -> ExpressionDomainTypeScaffoldApplyResponse:
    preview = build_expression_domain_type_scaffold_preview(
        ExpressionDomainTypeScaffoldPreviewRequest(
            expressionDomainType=request.expressionDomainType
        ),
        project_root=project_root,
    )
    files_to_write = preview.items[0].files if preview.items else []

    pre_write_validation = validate_rendered_scaffold_files(files_to_write)
    if has_failed_validation(pre_write_validation):
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Scaffold validation failed before files were written.",
                "validation": pre_write_validation.model_dump(mode="json"),
            },
        )

    written_files = write_scaffold_files(project_root=project_root, files=files_to_write)
    post_write_validation = validate_written_scaffold_files(
        project_root=project_root,
        request_run_full_frontend_build=request.runFullFrontendBuild,
        model_api_key=None,
        written_files=files_to_write,
    )

    return ExpressionDomainTypeScaffoldApplyResponse(
        backendTargetBasePath=preview.backendTargetBasePath,
        frontendTargetBasePath=preview.frontendTargetBasePath,
        items=[
            ExpressionDomainTypeApplyItem(
                key=request.expressionDomainType.typeKey,
                targetBasePath=preview.backendTargetBasePath,
                writtenFiles=written_files,
                skippedFiles=[],
            )
        ],
        validation=post_write_validation,
    )
