from collections import defaultdict
from pathlib import Path

from fastapi import HTTPException

from core.settings import get_settings
from schemas.scaffold_common import ScaffoldedFile
from schemas.scaffold_model_package import (
    AppliedScaffoldFile,
    ModelPackageApplyItem,
    ModelPackageApplyRequest,
    ModelPackageApplyResponse,
)
from services.model_package_preview import build_model_package_preview
from services.scaffold_file_writer import write_scaffold_files
from services.scaffold_validation import (
    has_failed_validation,
    validate_rendered_scaffold_files,
    validate_written_scaffold_files,
)


def apply_model_package_scaffold(
    request: ModelPackageApplyRequest,
    *,
    project_root: Path | None = None,
) -> ModelPackageApplyResponse:
    resolved_project_root = (
        project_root.resolve() if project_root is not None else get_settings().project_root
    )
    preview = build_model_package_preview(request, project_root=resolved_project_root)

    partial_items = [item for item in preview.items if item.status == "partial"]
    if partial_items:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Cannot apply scaffold while partial items exist.",
                "items": [item.model_dump(mode="json") for item in partial_items],
            },
        )

    files_to_write: list[ScaffoldedFile] = []
    file_paths_by_item: dict[tuple[str, str], set[str]] = defaultdict(set)
    for item in preview.items:
        if item.status != "toGenerate":
            continue

        for file in item.files:
            files_to_write.append(file)
            file_paths_by_item[(item.kind, item.key)].add(file.path)

    pre_write_validation = validate_rendered_scaffold_files(files_to_write)
    if has_failed_validation(pre_write_validation):
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Scaffold validation failed before files were written.",
                "validation": pre_write_validation.model_dump(mode="json"),
            },
        )

    written_files: list[AppliedScaffoldFile] = []
    written_paths: set[str] = set()
    if files_to_write:
        written_files = write_scaffold_files(
            project_root=resolved_project_root,
            files=files_to_write,
        )
        written_paths = {file.path for file in written_files}

    items: list[ModelPackageApplyItem] = []
    for preview_item in preview.items:
        item_key = (preview_item.kind, preview_item.key)
        preview_paths = file_paths_by_item.get(item_key, set())

        if preview_item.status == "toGenerate" and preview_paths and written_paths:
            item_written_files = [
                AppliedScaffoldFile(path=path)
                for path in sorted(preview_paths)
                if path in written_paths
            ]
            items.append(
                ModelPackageApplyItem(
                    kind=preview_item.kind,
                    key=preview_item.key,
                    status="written",
                    reason=None,
                    targetBasePath=preview_item.targetBasePath,
                    writtenFiles=item_written_files,
                    skippedFiles=[],
                )
            )
            continue

        items.append(
            ModelPackageApplyItem(
                kind=preview_item.kind,
                key=preview_item.key,
                status="skipped",
                reason=preview_item.reason,
                targetBasePath=preview_item.targetBasePath
                if preview_item.status == "toGenerate" and not files_to_write
                else None if preview_item.status == "exists" else preview_item.targetBasePath,
                writtenFiles=[],
                skippedFiles=[],
            )
        )

    post_write_validation = validate_written_scaffold_files(
        project_root=resolved_project_root,
        request_run_full_frontend_build=request.runFullFrontendBuild,
        model_api_key=request.model.apiModelKey,
        written_files=files_to_write,
    )

    return ModelPackageApplyResponse(
        items=items,
        validation=post_write_validation,
    )
