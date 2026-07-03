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
