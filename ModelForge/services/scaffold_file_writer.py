from pathlib import Path

from fastapi import HTTPException

from schemas.scaffold_common import ScaffoldedFile
from schemas.scaffold_model_package import AppliedScaffoldFile


def write_scaffold_files(
    *,
    project_root: Path,
    files: list[ScaffoldedFile],
) -> list[AppliedScaffoldFile]:
    resolved_project_root = project_root.resolve()
    prepared_targets: list[tuple[ScaffoldedFile, Path]] = []
    seen_targets: set[Path] = set()

    for file in files:
        relative_path = Path(file.path)

        if relative_path.is_absolute():
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Scaffold file path must be relative.",
                    "path": file.path,
                },
            )

        if ".." in relative_path.parts:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Scaffold file path must not contain parent traversal.",
                    "path": file.path,
                },
            )

        target_path = (resolved_project_root / relative_path).resolve()
        if not _is_within_root(target_path, resolved_project_root):
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Scaffold file path resolves outside project root.",
                    "path": file.path,
                },
            )

        if target_path in seen_targets:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "Duplicate scaffold file target detected.",
                    "path": file.path,
                },
            )
        seen_targets.add(target_path)
        prepared_targets.append((file, target_path))

    conflicts = [
        {"path": file.path}
        for file, target_path in prepared_targets
        if target_path.exists()
    ]
    if conflicts:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "One or more scaffold target files already exist.",
                "conflicts": conflicts,
            },
        )

    written_files: list[AppliedScaffoldFile] = []
    for file, target_path in prepared_targets:
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_text(file.content, encoding="utf-8")
        written_files.append(AppliedScaffoldFile(path=file.path))

    return written_files


def _is_within_root(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
    except ValueError:
        return False
    return True
