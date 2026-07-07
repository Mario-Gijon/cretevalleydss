import shutil
import subprocess
from pathlib import Path

import pytest

from schemas.scaffold_expression_domain_type import (
    ExpressionDomainTypeScaffoldApplyRequest,
    ExpressionDomainTypeScaffoldPreviewRequest,
)
from services.expression_domain_type_scaffold_apply import (
    apply_expression_domain_type_scaffold,
)
from services.expression_domain_type_scaffold_preview import (
    build_expression_domain_type_scaffold_preview,
)
from services.scaffold_assets import delete_scaffold_asset


def _build_payload() -> dict[str, object]:
    return {
        "expressionDomainType": {
            "typeKey": "linguisticTwoTupleScale",
            "label": "Linguistic 2-tuple scale",
            "description": (
                "Generated scaffold for a linguistic 2-tuple-inspired "
                "expression domain type."
            ),
            "family": "linguistic",
            "constraintExample": {
                "labelCount": [3, 5, 7],
            },
            "definitionExample": {
                "labelCount": 3,
                "alphaRange": {
                    "min": -0.5,
                    "max": 0.5,
                },
                "labels": [
                    {"key": "low", "label": "Low", "index": 0},
                    {"key": "medium", "label": "Medium", "index": 1},
                    {"key": "high", "label": "High", "index": 2},
                ],
            },
            "evaluationExample": {"labelKey": "high"},
        }
    }


def test_expression_domain_type_preview_generates_split_backend_files(
    project_root: Path,
) -> None:
    request = ExpressionDomainTypeScaffoldPreviewRequest.model_validate(_build_payload())

    response = build_expression_domain_type_scaffold_preview(
        request,
        project_root=project_root,
    )

    preview_paths = [file.path for file in response.items[0].files]
    assert preview_paths == [
        "Backend/modules/decisionPlugins/expressionDomains/types/linguisticTwoTupleScale/index.js",
        "Backend/modules/decisionPlugins/expressionDomains/types/linguisticTwoTupleScale/creation.js",
        "Backend/modules/decisionPlugins/expressionDomains/types/linguisticTwoTupleScale/evaluation.js",
        "Frontend/src/features/decisionPlugins/expressionDomains/types/linguisticTwoTupleScale/index.js",
        "Frontend/src/features/decisionPlugins/expressionDomains/types/linguisticTwoTupleScale/LinguisticTwoTupleScaleCreationForm.jsx",
        "Frontend/src/features/decisionPlugins/expressionDomains/types/linguisticTwoTupleScale/LinguisticTwoTupleScaleEvaluationInput.jsx",
    ]

    files_by_path = {file.path: file.content for file in response.items[0].files}
    backend_index = files_by_path[
        "Backend/modules/decisionPlugins/expressionDomains/types/linguisticTwoTupleScale/index.js"
    ]
    backend_creation = files_by_path[
        "Backend/modules/decisionPlugins/expressionDomains/types/linguisticTwoTupleScale/creation.js"
    ]
    backend_evaluation = files_by_path[
        "Backend/modules/decisionPlugins/expressionDomains/types/linguisticTwoTupleScale/evaluation.js"
    ]

    assert 'from "../../shared/validation.js";' in backend_index
    assert 'from "./creation.js";' in backend_index
    assert 'from "./evaluation.js";' in backend_index
    assert "normalizeLinguisticTwoTupleScaleCreationDefinition" in backend_index
    assert "normalizeLinguisticTwoTupleScaleEvaluationValue" in backend_index
    assert "EXPRESSION_DOMAIN_TYPE_UNDER_DEVELOPMENT" in backend_creation
    assert "EXPRESSION_DOMAIN_TYPE_UNDER_DEVELOPMENT" in backend_evaluation


def test_expression_domain_type_apply_writes_split_backend_files(
    project_root: Path,
) -> None:
    request = ExpressionDomainTypeScaffoldApplyRequest.model_validate(
        _build_payload() | {"runFullFrontendBuild": False}
    )

    response = apply_expression_domain_type_scaffold(
        request,
        project_root=project_root,
    )

    written_paths = [file.path for file in response.items[0].writtenFiles]
    assert written_paths == [
        "Backend/modules/decisionPlugins/expressionDomains/types/linguisticTwoTupleScale/index.js",
        "Backend/modules/decisionPlugins/expressionDomains/types/linguisticTwoTupleScale/creation.js",
        "Backend/modules/decisionPlugins/expressionDomains/types/linguisticTwoTupleScale/evaluation.js",
        "Frontend/src/features/decisionPlugins/expressionDomains/types/linguisticTwoTupleScale/index.js",
        "Frontend/src/features/decisionPlugins/expressionDomains/types/linguisticTwoTupleScale/LinguisticTwoTupleScaleCreationForm.jsx",
        "Frontend/src/features/decisionPlugins/expressionDomains/types/linguisticTwoTupleScale/LinguisticTwoTupleScaleEvaluationInput.jsx",
    ]

    for relative_path in written_paths:
        assert (project_root / relative_path).exists()


def test_expression_domain_type_generated_backend_files_pass_node_syntax_check(
    project_root: Path,
) -> None:
    node_binary = shutil.which("node")
    if not node_binary:
        pytest.skip("node is required for generated JS syntax checks")

    request = ExpressionDomainTypeScaffoldApplyRequest.model_validate(
        _build_payload() | {"runFullFrontendBuild": False}
    )

    apply_expression_domain_type_scaffold(
        request,
        project_root=project_root,
    )

    backend_files = [
        project_root
        / "Backend/modules/decisionPlugins/expressionDomains/types/linguisticTwoTupleScale/index.js",
        project_root
        / "Backend/modules/decisionPlugins/expressionDomains/types/linguisticTwoTupleScale/creation.js",
        project_root
        / "Backend/modules/decisionPlugins/expressionDomains/types/linguisticTwoTupleScale/evaluation.js",
    ]

    for file_path in backend_files:
        completed = subprocess.run(
            [node_binary, "--check", str(file_path)],
            capture_output=True,
            text=True,
            check=False,
        )
        assert completed.returncode == 0, (
            f"node --check failed for {file_path}:\n"
            f"stdout:\n{completed.stdout}\n"
            f"stderr:\n{completed.stderr}"
        )


def test_expression_domain_type_asset_delete_removes_backend_and_frontend_folders(
    project_root: Path,
) -> None:
    backend_dir = (
        project_root
        / "Backend/modules/decisionPlugins/expressionDomains/types/customFuzzyScale"
    )
    frontend_dir = (
        project_root
        / "Frontend/src/features/decisionPlugins/expressionDomains/types/customFuzzyScale"
    )
    backend_dir.mkdir(parents=True)
    frontend_dir.mkdir(parents=True)
    (backend_dir / "index.js").write_text("// generated\n", encoding="utf-8")
    (backend_dir / "creation.js").write_text("// generated\n", encoding="utf-8")
    (backend_dir / "evaluation.js").write_text("// generated\n", encoding="utf-8")
    (frontend_dir / "index.js").write_text("// generated\n", encoding="utf-8")

    response = delete_scaffold_asset(
        project_root=project_root,
        kind="expressionDomainType",
        key="customFuzzyScale",
    )

    assert response.deletedLocations == [
        "Backend/modules/decisionPlugins/expressionDomains/types/customFuzzyScale",
        "Frontend/src/features/decisionPlugins/expressionDomains/types/customFuzzyScale",
    ]
    assert response.missingLocations == []
    assert not backend_dir.exists()
    assert not frontend_dir.exists()
