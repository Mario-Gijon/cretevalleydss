from copy import deepcopy
from pathlib import Path
import re

from schemas.scaffold_model_package import ScaffoldValidationResult

from services import model_package_apply as model_package_apply_service


UNREPLACED_TEMPLATE_PLACEHOLDER_PATTERN = re.compile(
    r"\{\{\s*[A-Za-z_][A-Za-z0-9_]*\s*\}\}"
)


def _disable_post_write_validation(monkeypatch) -> None:
    monkeypatch.setattr(
        model_package_apply_service,
        "validate_written_scaffold_files",
        lambda **kwargs: ScaffoldValidationResult(status="skipped", checks=[]),
    )


def _create_complete_existing_model(project_root: Path, model_key: str = "demo_model") -> Path:
    model_root = project_root / f"DecisionModelsService/models/{model_key}"
    model_root.mkdir(parents=True, exist_ok=True)
    for filename in ("definition.py", "executor.py", "run.py", "examples.py"):
        (model_root / filename).write_text("# existing\n", encoding="utf-8")
    return model_root


def _build_non_model_package_payload() -> dict[str, object]:
    return {
        "model": {
            "apiModelKey": "demo_model",
            "displayName": "Demo Model",
            "smallDescription": "Short demo description",
            "extendedDescription": "Longer demo description for scaffold generation",
            "modelKind": "issue",
            "evaluationStructureKey": "pairwiseMatrix",
            "parameters": [
                {
                    "key": "score_range",
                    "label": "Score Range",
                    "parameterStructureKey": "scoreRange",
                }
            ],
            "supportedDomains": ["demo"],
            "includeExamples": True,
        },
        "evaluationStructure": {
            "evaluationStructureKey": "pairwiseMatrix",
            "componentName": "PairwiseMatrix",
            "backendStructureExportName": "pairwiseMatrixStructure",
        },
        "parameterStructures": [
            {
                "parameterStructureKey": "scoreRange",
                "componentName": "ScoreRange",
                "backendStructureExportName": "scoreRangeParameterStructure",
                "validateFunctionName": "validateScoreRangeParameter",
            }
        ],
    }


def test_evaluation_structure_preview_reports_expected_paths_without_writing_files(
    client_factory,
    project_root: Path,
) -> None:
    payload = {
        "evaluationStructureKey": "pairwiseMatrix",
        "stageConstant": "ALTERNATIVE_EVALUATION",
        "componentName": "PairwiseMatrix",
        "backendStructureExportName": "pairwiseMatrixStructure",
    }

    with client_factory(project_root) as client:
        response = client.post("/scaffold/evaluation-structure/preview", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["service"] == "model-forge"
    assert body["kind"] == "evaluation-structure"
    assert body["mode"] == "preview"
    assert body["backendTargetBasePath"] == (
        "Backend/modules/decisionPlugins/evaluations/structures/pairwiseMatrix"
    )
    assert body["frontendTargetBasePath"] == (
        "Frontend/src/features/decisionPlugins/evaluations/structures/pairwiseMatrix"
    )

    preview_paths = [item["path"] for item in body["files"]]
    assert len(preview_paths) == 5
    assert preview_paths == [
        "Backend/modules/decisionPlugins/evaluations/structures/pairwiseMatrix/index.js",
        "Backend/modules/decisionPlugins/evaluations/structures/pairwiseMatrix/pairwiseMatrix.get.js",
        "Backend/modules/decisionPlugins/evaluations/structures/pairwiseMatrix/pairwiseMatrix.save.js",
        "Frontend/src/features/decisionPlugins/evaluations/structures/pairwiseMatrix/index.js",
        "Frontend/src/features/decisionPlugins/evaluations/structures/pairwiseMatrix/PairwiseMatrixView.jsx",
    ]
    for relative_path in preview_paths:
        assert not (project_root / relative_path).exists()

    contents = {item["path"]: item["content"] for item in body["files"]}
    backend = contents[preview_paths[0]]
    backend_get = contents[preview_paths[1]]
    backend_save = contents[preview_paths[2]]
    frontend = contents[preview_paths[4]]

    assert "get: getPairwiseMatrixPayload" in backend
    assert "save: savePairwiseMatrixPayload" in backend
    assert "getPairwiseMatrixPayload" in backend_get
    assert "return payload ?? {};" in backend_get
    assert "savePairwiseMatrixPayload" in backend_save
    assert "return payload;" in backend_save
    assert "Return the complete payload that must be sent to the Frontend." in backend_get
    assert "Return the complete payload that must be stored in the database." in backend_save
    assert "decisionContext" in frontend
    assert "evaluation" in frontend
    assert "setEvaluation" in frontend
    assert "collectiveEvaluation" in frontend
    assert "readOnly" in frontend
    assert "loading" in frontend
    assert "// console.log(JSON.stringify(decisionContext, null, 2));" in frontend
    for forbidden in (
        "forwardRef",
        "useImperativeHandle",
        "useEffect",
        "useMemo",
        "useState",
        "preparePayloadRead",
        "flushPendingEdits",
        "validatePayloadRead",
    ):
        assert forbidden not in frontend
    assert all(not path.endswith(".md") for path in preview_paths)
    assert all(not path.endswith(".validation.js") for path in preview_paths)
    for forbidden_path_part in (
        "/operations/",
        "/components/",
        ".styles.js",
        "logic.js",
        "payload.js",
        "helpers.js",
        "utils.js",
    ):
        assert all(forbidden_path_part not in path for path in preview_paths)


def test_creator_criteria_weighting_package_scaffolds_explicit_initialization_todo(
    client_factory,
    project_root: Path,
) -> None:
    payload = {
        "model": {
            "apiModelKey": "creator_weighting",
            "displayName": "Creator Weighting",
            "smallDescription": "Creator weighting scaffold",
            "extendedDescription": "Creator weighting scaffold for initialization",
            "modelKind": "criteriaWeighting",
            "evaluationStructureKey": "creatorWeighting",
            "supportsCreatorCriteriaWeighting": True,
            "supportsExpertCriteriaWeighting": True,
            "parameters": [],
            "includeExamples": True,
        },
        "parameterStructures": [],
    }

    with client_factory(project_root) as client:
        response = client.post("/scaffold/model-package/preview", json=payload)

    assert response.status_code == 200
    body = response.json()
    model_item = next(item for item in body["items"] if item["kind"] == "model")
    structure_item = next(
        item for item in body["items"] if item["kind"] == "evaluation-structure"
    )
    definition = next(
        file["content"]
        for file in model_item["files"]
        if file["path"].endswith("/definition.py")
    )
    frontend_index = next(
        file["content"]
        for file in structure_item["files"]
        if file["path"].endswith("/index.js")
        and file["path"].startswith("Frontend/")
    )
    initialization_file = next(
        file
        for file in structure_item["files"]
        if file["path"].endswith("/operations/buildInitialEvaluation.js")
    )

    assert "supports_creator_criteria_weighting=True" in definition
    assert "supports_expert_criteria_weighting=True" in definition
    assert (
        'import { buildInitialEvaluation } from "./operations/buildInitialEvaluation";'
        in frontend_index
    )
    assert "  buildInitialEvaluation," in frontend_index
    assert "ModelForge does not guess evaluation payload shapes" in initialization_file[
        "content"
    ]
    assert "must be implemented before creator-side use" in initialization_file[
        "content"
    ]


def test_manual_creator_weighting_package_keeps_special_editor_without_initializer(
    client_factory,
    project_root: Path,
) -> None:
    payload = {
        "model": {
            "apiModelKey": "manual_criteria_weights",
            "displayName": "Manual Criteria Weights",
            "smallDescription": "Manual weighting scaffold",
            "extendedDescription": "Manual weighting uses the special creator editor",
            "modelKind": "criteriaWeighting",
            "evaluationStructureKey": "manualCriteriaWeights",
            "supportsCreatorCriteriaWeighting": True,
            "supportsExpertCriteriaWeighting": True,
            "parameters": [],
            "includeExamples": True,
        },
        "parameterStructures": [],
    }

    with client_factory(project_root) as client:
        response = client.post("/scaffold/model-package/preview", json=payload)

    assert response.status_code == 200
    structure_item = next(
        item
        for item in response.json()["items"]
        if item["kind"] == "evaluation-structure"
    )
    assert all(
        not file["path"].endswith("/operations/buildInitialEvaluation.js")
        for file in structure_item["files"]
    )


def test_parameter_structure_preview_reports_expected_paths_without_writing_files(
    client_factory,
    project_root: Path,
) -> None:
    payload = {
        "parameterStructureKey": "scoreRange",
        "componentName": "ScoreRange",
        "backendStructureExportName": "scoreRangeParameterStructure",
        "validateFunctionName": "validateScoreRangeParameter",
    }

    with client_factory(project_root) as client:
        response = client.post("/scaffold/parameter/preview", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["service"] == "model-forge"
    assert body["kind"] == "parameter"
    assert body["mode"] == "preview"
    assert body["backendTargetBasePath"] == (
        "Backend/modules/decisionPlugins/modelParameters/structures/scoreRange"
    )
    assert body["frontendTargetBasePath"] == (
        "Frontend/src/features/decisionPlugins/modelParameters/fields/scoreRange"
    )

    preview_paths = [item["path"] for item in body["files"]]
    assert preview_paths == [
        "Backend/modules/decisionPlugins/modelParameters/structures/scoreRange/index.js",
        "Backend/modules/decisionPlugins/modelParameters/structures/scoreRange/validate.js",
        "Frontend/src/features/decisionPlugins/modelParameters/fields/scoreRange/index.js",
        "Frontend/src/features/decisionPlugins/modelParameters/fields/scoreRange/ScoreRangeParameterField.jsx",
        "Frontend/src/features/decisionPlugins/modelParameters/fields/scoreRange/ScoreRangeParameterReadOnly.jsx",
    ]
    for relative_path in preview_paths:
        assert not (project_root / relative_path).exists()


def test_interval_global_preview_uses_the_registered_forge_capability(
    client_factory,
    project_root: Path,
) -> None:
    payload = {
        "parameterStructureKey": "intervalGlobal",
        "componentName": "IntervalGlobal",
        "backendStructureExportName": "intervalGlobalParameterStructure",
        "validateFunctionName": "validateIntervalGlobal",
    }

    with client_factory(project_root) as client:
        response = client.post("/scaffold/parameter/preview", json=payload)

    assert response.status_code == 200
    files = {item["path"]: item["content"] for item in response.json()["files"]}
    backend_base = "Backend/modules/decisionPlugins/modelParameters/structures/intervalGlobal"
    frontend_base = "Frontend/src/features/decisionPlugins/modelParameters/fields/intervalGlobal"
    assert f"{backend_base}/validateDefinition.js" in files
    assert f"{backend_base}/validateAndNormalize.js" in files
    assert f"{frontend_base}/IntervalGlobalParameterField.jsx" in files
    assert f"{frontend_base}/IntervalGlobalParameterReadOnly.jsx" in files
    assert "validateDefinition: validateIntervalGlobalDefinition" in files[
        f"{backend_base}/index.js"
    ]


def test_number_criterion_preview_uses_its_colocated_descriptor(
    client_factory,
    project_root: Path,
) -> None:
    with client_factory(project_root) as client:
        response = client.post(
            "/scaffold/parameter/preview",
            json={"parameterStructureKey": "numberCriterion"},
        )

    assert response.status_code == 200
    files = {item["path"]: item["content"] for item in response.json()["files"]}
    backend_base = "Backend/modules/decisionPlugins/modelParameters/structures/numberCriterion"
    frontend_base = "Frontend/src/features/decisionPlugins/modelParameters/fields/numberCriterion"
    assert f"{backend_base}/validateDefinition.js" in files
    assert f"{backend_base}/validateAndNormalize.js" in files
    assert f"{frontend_base}/numberCriterionValues.js" in files
    assert "validateDefinition: validateNumberCriterionDefinition" in files[
        f"{backend_base}/index.js"
    ]
    frontend_field = files[
        "Frontend/src/features/decisionPlugins/modelParameters/fields/"
        "numberCriterion/NumberCriterionParameterField.jsx"
    ]
    frontend_values = files[
        "Frontend/src/features/decisionPlugins/modelParameters/fields/"
        "numberCriterion/numberCriterionValues.js"
    ]
    assert "useEffect" in frontend_field
    assert "useMemo" in frontend_field
    assert "rows.length === 0" in frontend_field
    assert "isPlainObject(value)" in frontend_field
    assert "numberCriterionMapsEqual" in frontend_field
    assert "reconcileNumberCriterionMap" in frontend_values
    assert "scope" not in frontend_field
    assert "scope" not in frontend_values
    assert "validateNumberCriterionDefinition(parameter)" not in files[
        f"{backend_base}/validateAndNormalize.js"
    ]
    assert "scenarioKind" not in files[f"{frontend_base}/index.js"]


def test_model_package_apply_writes_evaluation_and_parameter_assets_only_under_temp_root(
    client_factory,
    monkeypatch,
    project_root: Path,
) -> None:
    _disable_post_write_validation(monkeypatch)
    _create_complete_existing_model(project_root)
    payload = _build_non_model_package_payload()

    with client_factory(project_root) as client:
        response = client.post("/scaffold/model-package/apply", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["service"] == "model-forge"
    assert body["kind"] == "model-package"
    assert body["mode"] == "apply"

    written_items = {
        (item["kind"], item["key"]): item
        for item in body["items"]
        if item["status"] == "written"
    }
    assert ("evaluation-structure", "pairwiseMatrix") in written_items
    assert ("parameter", "scoreRange") in written_items

    expected_files = {
        "evaluation_backend": project_root
        / "Backend/modules/decisionPlugins/evaluations/structures/pairwiseMatrix/index.js",
        "evaluation_frontend_index": project_root
        / "Frontend/src/features/decisionPlugins/evaluations/structures/pairwiseMatrix/index.js",
        "evaluation_backend_get": project_root
        / "Backend/modules/decisionPlugins/evaluations/structures/pairwiseMatrix/pairwiseMatrix.get.js",
        "evaluation_backend_save": project_root
        / "Backend/modules/decisionPlugins/evaluations/structures/pairwiseMatrix/pairwiseMatrix.save.js",
        "evaluation_frontend_view": project_root
        / "Frontend/src/features/decisionPlugins/evaluations/structures/pairwiseMatrix/PairwiseMatrixView.jsx",
        "parameter_backend_index": project_root
        / "Backend/modules/decisionPlugins/modelParameters/structures/scoreRange/index.js",
        "parameter_backend_validate": project_root
        / "Backend/modules/decisionPlugins/modelParameters/structures/scoreRange/validate.js",
        "parameter_frontend_index": project_root
        / "Frontend/src/features/decisionPlugins/modelParameters/fields/scoreRange/index.js",
        "parameter_frontend_field": project_root
        / "Frontend/src/features/decisionPlugins/modelParameters/fields/scoreRange/ScoreRangeParameterField.jsx",
        "parameter_frontend_readonly": project_root
        / "Frontend/src/features/decisionPlugins/modelParameters/fields/scoreRange/ScoreRangeParameterReadOnly.jsx",
    }

    for path in expected_files.values():
        assert path.exists(), f"Expected non-model scaffold file was missing: {path}"
        content = path.read_text(encoding="utf-8")
        assert content.strip(), f"Generated non-model scaffold file was empty: {path}"
        assert UNREPLACED_TEMPLATE_PLACEHOLDER_PATTERN.search(content) is None
        path.resolve().relative_to(project_root.resolve())

    evaluation_backend_source = expected_files["evaluation_backend"].read_text(
        encoding="utf-8"
    )
    evaluation_backend_get_source = expected_files[
        "evaluation_backend_get"
    ].read_text(encoding="utf-8")
    evaluation_backend_save_source = expected_files[
        "evaluation_backend_save"
    ].read_text(encoding="utf-8")
    evaluation_frontend_index_source = expected_files[
        "evaluation_frontend_index"
    ].read_text(encoding="utf-8")
    evaluation_view_source = expected_files["evaluation_frontend_view"].read_text(
        encoding="utf-8"
    )
    parameter_backend_index_source = expected_files[
        "parameter_backend_index"
    ].read_text(encoding="utf-8")
    parameter_backend_validate_source = expected_files[
        "parameter_backend_validate"
    ].read_text(encoding="utf-8")
    parameter_frontend_index_source = expected_files[
        "parameter_frontend_index"
    ].read_text(encoding="utf-8")
    parameter_field_source = expected_files["parameter_frontend_field"].read_text(
        encoding="utf-8"
    )
    parameter_readonly_source = expected_files[
        "parameter_frontend_readonly"
    ].read_text(encoding="utf-8")

    assert 'key: "pairwiseMatrix"' in evaluation_backend_source
    assert "EVALUATION_STAGES.ALTERNATIVE_EVALUATION" in evaluation_backend_source
    assert "pairwiseMatrixStructure" in evaluation_backend_source
    assert "get: getPairwiseMatrixPayload" in evaluation_backend_source
    assert "save: savePairwiseMatrixPayload" in evaluation_backend_source
    assert "getPairwiseMatrixPayload" in evaluation_backend_get_source
    assert "return payload ?? {};" in evaluation_backend_get_source
    assert "savePairwiseMatrixPayload" in evaluation_backend_save_source
    assert "return payload;" in evaluation_backend_save_source
    assert "EVALUATION_STRUCTURE_UNDER_DEVELOPMENT" not in evaluation_backend_source
    assert "pairwiseMatrixStructure" in evaluation_frontend_index_source
    assert 'key: "pairwiseMatrix"' in evaluation_frontend_index_source
    assert "EVALUATION_STAGES.ALTERNATIVE_EVALUATION" in evaluation_frontend_index_source
    assert "PairwiseMatrixView" in evaluation_frontend_index_source
    assert 'implementationStatus: "scaffold"' in evaluation_frontend_index_source
    assert "Implementation guide" in evaluation_frontend_index_source
    assert "pairwiseMatrix is under development." in evaluation_view_source
    assert "decisionContext" in evaluation_view_source
    assert "evaluation" in evaluation_view_source
    assert "setEvaluation" in evaluation_view_source
    assert "collectiveEvaluation" in evaluation_view_source
    assert "readOnly" in evaluation_view_source
    assert "loading" in evaluation_view_source
    for forbidden in ("forwardRef", "useEffect", "useMemo", "useState"):
        assert forbidden not in evaluation_view_source

    assert 'key: "scoreRange"' in parameter_backend_index_source
    assert "scoreRangeParameterStructure" in parameter_backend_index_source
    assert "Implementation guide" in parameter_backend_index_source
    assert "validateScoreRangeParameter" in parameter_backend_validate_source
    assert 'parameterStructureKey: "scoreRange"' in parameter_backend_validate_source
    assert "Implementation guide" in parameter_backend_validate_source
    assert "typeKey" in parameter_backend_validate_source
    assert "definition depends on typeKey" in parameter_backend_validate_source
    assert "numericRange" not in parameter_backend_validate_source
    assert "linguisticLabels" not in parameter_backend_validate_source
    assert "scoreRangeParameterField" in parameter_frontend_index_source
    assert "Implementation guide" in parameter_frontend_index_source
    assert "ScoreRangeParameterField" in parameter_field_source
    assert "parameter.label" in parameter_field_source
    assert "Implementation guide" in parameter_field_source
    assert "https://mui.com/material-ui/" in parameter_field_source
    assert "typeKey" in parameter_field_source
    assert "definition depends on typeKey" in parameter_field_source
    assert "numericRange" not in parameter_field_source
    assert "linguisticLabels" not in parameter_field_source
    assert "ScoreRangeParameterReadOnly" in parameter_readonly_source
    assert "Implementation guide" in parameter_readonly_source
    assert "https://mui.com/material-ui/" in parameter_readonly_source
    assert "typeKey" in parameter_readonly_source
    assert "definition depends on typeKey" in parameter_readonly_source
    assert "numericRange" not in parameter_readonly_source
    assert "linguisticLabels" not in parameter_readonly_source


def test_model_package_apply_rejects_partial_existing_evaluation_structure(
    client_factory,
    project_root: Path,
) -> None:
    _create_complete_existing_model(project_root)
    payload = _build_non_model_package_payload()

    partial_backend = (
        project_root
        / "Backend/modules/decisionPlugins/evaluations/structures/pairwiseMatrix"
    )
    partial_backend.mkdir(parents=True)
    (partial_backend / "index.js").write_text("// partial\n", encoding="utf-8")

    with client_factory(project_root) as client:
        response = client.post("/scaffold/model-package/apply", json=payload)

    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["message"] == "Cannot apply scaffold while partial items exist."
    partial_item = next(
        item for item in detail["items"] if item["kind"] == "evaluation-structure"
    )
    assert partial_item["key"] == "pairwiseMatrix"
    assert partial_item["status"] == "partial"


def test_model_package_apply_rejects_partial_existing_parameter_structure(
    client_factory,
    project_root: Path,
) -> None:
    _create_complete_existing_model(project_root)
    payload = _build_non_model_package_payload()

    partial_frontend = (
        project_root
        / "Frontend/src/features/decisionPlugins/modelParameters/fields/scoreRange"
    )
    partial_frontend.mkdir(parents=True)
    (partial_frontend / "index.js").write_text("// partial\n", encoding="utf-8")

    with client_factory(project_root) as client:
        response = client.post("/scaffold/model-package/apply", json=payload)

    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["message"] == "Cannot apply scaffold while partial items exist."
    partial_item = next(item for item in detail["items"] if item["kind"] == "parameter")
    assert partial_item["key"] == "scoreRange"
    assert partial_item["status"] == "partial"


def test_evaluation_structure_preview_rejects_invalid_key(
    client_factory,
    project_root: Path,
) -> None:
    payload = {"evaluationStructureKey": "bad-key"}

    with client_factory(project_root) as client:
        response = client.post("/scaffold/evaluation-structure/preview", json=payload)

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert detail[0]["loc"][-1] == "evaluationStructureKey"


def test_parameter_structure_preview_rejects_invalid_key(
    client_factory,
    project_root: Path,
) -> None:
    payload = {"parameterStructureKey": "bad-key"}

    with client_factory(project_root) as client:
        response = client.post("/scaffold/parameter/preview", json=payload)

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert detail[0]["loc"][-1] == "parameterStructureKey"


def test_delete_scaffold_asset_removes_generated_evaluation_structure_from_temp_root(
    client_factory,
    project_root: Path,
) -> None:
    backend_dir = (
        project_root
        / "Backend/modules/decisionPlugins/evaluations/structures/pairwiseMatrix"
    )
    frontend_dir = (
        project_root
        / "Frontend/src/features/decisionPlugins/evaluations/structures/pairwiseMatrix"
    )
    backend_dir.mkdir(parents=True)
    frontend_dir.mkdir(parents=True)
    (backend_dir / "index.js").write_text("// generated\n", encoding="utf-8")

    with client_factory(project_root) as client:
        response = client.delete("/scaffold/assets/evaluationStructure/pairwiseMatrix")

    assert response.status_code == 200
    assert response.json() == {
        "service": "model-forge",
        "kind": "scaffold-asset-delete",
        "assetKind": "evaluationStructure",
        "key": "pairwiseMatrix",
        "deletedLocations": [
            "Backend/modules/decisionPlugins/evaluations/structures/pairwiseMatrix",
            "Frontend/src/features/decisionPlugins/evaluations/structures/pairwiseMatrix",
        ],
        "missingLocations": [],
    }
    assert not backend_dir.exists()
    assert not frontend_dir.exists()


def test_delete_scaffold_asset_removes_generated_parameter_structure_from_temp_root(
    client_factory,
    project_root: Path,
) -> None:
    backend_dir = (
        project_root
        / "Backend/modules/decisionPlugins/modelParameters/structures/scoreRange"
    )
    frontend_dir = (
        project_root
        / "Frontend/src/features/decisionPlugins/modelParameters/fields/scoreRange"
    )
    backend_dir.mkdir(parents=True)
    frontend_dir.mkdir(parents=True)
    (backend_dir / "index.js").write_text("// generated\n", encoding="utf-8")

    with client_factory(project_root) as client:
        response = client.delete("/scaffold/assets/parameterStructure/scoreRange")

    assert response.status_code == 200
    assert response.json() == {
        "service": "model-forge",
        "kind": "scaffold-asset-delete",
        "assetKind": "parameterStructure",
        "key": "scoreRange",
        "deletedLocations": [
            "Backend/modules/decisionPlugins/modelParameters/structures/scoreRange",
            "Frontend/src/features/decisionPlugins/modelParameters/fields/scoreRange",
        ],
        "missingLocations": [],
    }
    assert not backend_dir.exists()
    assert not frontend_dir.exists()


def test_delete_scaffold_asset_returns_controlled_not_found_for_parameter_structure(
    client_factory,
    project_root: Path,
) -> None:
    with client_factory(project_root) as client:
        response = client.delete("/scaffold/assets/parameterStructure/missingParameter")

    assert response.status_code == 404
    assert response.json()["detail"] == {
        "message": "Asset not found.",
        "kind": "parameterStructure",
        "key": "missingParameter",
    }


def test_model_package_apply_rejects_parameter_structure_path_traversal(
    client_factory,
    monkeypatch,
    project_root: Path,
) -> None:
    _create_complete_existing_model(project_root)
    payload = deepcopy(_build_non_model_package_payload())
    original_build_preview = model_package_apply_service.build_model_package_preview

    def fake_preview(*args, **kwargs):
        preview = original_build_preview(*args, **kwargs)
        for item in preview.items:
            if item.kind == "parameter":
                item.files[0].path = "../../escape.js"
        return preview

    monkeypatch.setattr(model_package_apply_service, "build_model_package_preview", fake_preview)
    _disable_post_write_validation(monkeypatch)

    with client_factory(project_root) as client:
        response = client.post("/scaffold/model-package/apply", json=payload)

    assert response.status_code == 400
    assert response.json()["detail"] == {
        "message": "Scaffold file path must not contain parent traversal.",
        "path": "../../escape.js",
    }
