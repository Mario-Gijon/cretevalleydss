from pathlib import Path

import pytest
from fastapi import HTTPException

from schemas.scaffold_common import ScaffoldedFile
from services.scaffold_file_writer import write_scaffold_files


def test_write_scaffold_files_rejects_parent_traversal(tmp_path: Path) -> None:
    with pytest.raises(HTTPException) as exc_info:
        write_scaffold_files(
            project_root=tmp_path,
            files=[
                ScaffoldedFile(
                    path="../../escape.py",
                    content="print('escape')\n",
                )
            ],
        )

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == {
        "message": "Scaffold file path must not contain parent traversal.",
        "path": "../../escape.py",
    }


def test_write_scaffold_files_rejects_duplicate_evaluation_structure_targets(
    tmp_path: Path,
) -> None:
    target = (
        "Backend/modules/decisionPlugins/evaluations/structures/"
        "pairwiseMatrix/pairwiseMatrix.get.js"
    )

    with pytest.raises(HTTPException) as exc_info:
        write_scaffold_files(
            project_root=tmp_path,
            files=[
                ScaffoldedFile(path=target, content="// first\n"),
                ScaffoldedFile(path=target, content="// second\n"),
            ],
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail == {
        "message": "Duplicate scaffold file target detected.",
        "path": target,
    }


def test_write_scaffold_files_rejects_existing_evaluation_structure_target(
    tmp_path: Path,
) -> None:
    relative_target = Path(
        "Backend/modules/decisionPlugins/evaluations/structures/"
        "pairwiseMatrix/pairwiseMatrix.save.js"
    )
    target = tmp_path / relative_target
    target.parent.mkdir(parents=True)
    target.write_text("// existing\n", encoding="utf-8")

    with pytest.raises(HTTPException) as exc_info:
        write_scaffold_files(
            project_root=tmp_path,
            files=[
                ScaffoldedFile(
                    path=relative_target.as_posix(),
                    content="// generated\n",
                )
            ],
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail == {
        "message": "One or more scaffold target files already exist.",
        "conflicts": [{"path": relative_target.as_posix()}],
    }
    assert target.read_text(encoding="utf-8") == "// existing\n"
