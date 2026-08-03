from pathlib import Path

from schemas.scaffold_model_package import (
    ModelPackagePreviewItem,
    ModelPackagePreviewResponse,
    ScaffoldValidationResult,
)

from services import model_package_apply as model_package_apply_service


def test_model_package_preview_returns_stable_contract_without_writing_files(
    client_factory,
    project_root: Path,
    valid_model_package_payload: dict[str, object],
) -> None:
    before_paths = sorted(
        str(path.relative_to(project_root))
        for path in project_root.rglob("*")
    )

    with client_factory(project_root) as client:
        response = client.post(
            "/scaffold/model-package/preview",
            json=valid_model_package_payload,
        )

    after_paths = sorted(
        str(path.relative_to(project_root))
        for path in project_root.rglob("*")
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["service"] == "model-forge"
    assert payload["kind"] == "model-package"
    assert payload["mode"] == "preview"
    assert [item["kind"] for item in payload["items"]] == [
        "model",
        "evaluation-structure",
    ]
    assert all(item["status"] == "toGenerate" for item in payload["items"])
    assert payload["validation"]["status"] == "passed"
    assert before_paths == after_paths


def test_model_package_preview_rejects_malformed_payload(
    client_factory,
    project_root: Path,
    valid_model_package_payload: dict[str, object],
) -> None:
    payload = {
        **valid_model_package_payload,
        "model": {
            **valid_model_package_payload["model"],
            "modelKind": "unsupported-kind",
        },
    }

    with client_factory(project_root) as client:
        response = client.post("/scaffold/model-package/preview", json=payload)

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert detail[0]["loc"][-1] == "modelKind"
    assert "issue or criteriaWeighting" in detail[0]["msg"]


def test_model_package_preview_emits_canonical_number_global_metadata(
    client_factory,
    project_root: Path,
    valid_model_package_payload: dict[str, object],
) -> None:
    model = valid_model_package_payload["model"]
    model["parameters"] = [
        {
            "key": "iterations",
            "label": "Iterations",
            "valueType": "integer",
            "parameterStructureKey": "numberGlobal",
            "required": True,
            "default": 10,
            "restrictions": {
                "min": 1,
                "max": 100,
                "allowed": None,
            },
        }
    ]

    with client_factory(project_root) as client:
        response = client.post(
            "/scaffold/model-package/preview",
            json=valid_model_package_payload,
        )

    assert response.status_code == 200
    model_item = next(
        item for item in response.json()["items"] if item["kind"] == "model"
    )
    definition = next(
        file["content"]
        for file in model_item["files"]
        if file["path"].endswith("/definition.py")
    )
    assert "'parameterStructureKey': 'numberGlobal'" in definition
    assert "'valueType': 'integer'" in definition
    assert "'scope':" not in definition

    parameter_item = next(
        item
        for item in response.json()["items"]
        if item["kind"] == "parameter" and item["key"] == "numberGlobal"
    )
    generated_files = {
        file["path"]: file["content"] for file in parameter_item["files"]
    }
    backend_validation = generated_files[
        "Backend/modules/decisionPlugins/modelParameters/structures/"
        "numberGlobal/validateAndNormalize.js"
    ]
    backend_definition = generated_files[
        "Backend/modules/decisionPlugins/modelParameters/structures/"
        "numberGlobal/validateDefinition.js"
    ]
    assert "parameter === null" in backend_definition
    assert 'typeof parameter !== "object"' in backend_definition
    assert "Array.isArray(parameter)" in backend_definition
    backend_index = generated_files[
        "Backend/modules/decisionPlugins/modelParameters/structures/"
        "numberGlobal/index.js"
    ]
    frontend_field = generated_files[
        "Frontend/src/features/decisionPlugins/modelParameters/fields/"
        "numberGlobal/NumberGlobalParameterField.jsx"
    ]
    assert "Number.isInteger(normalizedValue)" in backend_validation
    assert "normalizeNumberValue(value)" in backend_validation
    assert "Math.trunc" not in backend_validation
    assert "validateNumberGlobalDefinition" not in backend_validation
    assert "validateNumberGlobalDefinition" in backend_definition
    assert "validateDefinition: validateNumberGlobalDefinition" in backend_index
    assert "onChange(event.target.value)" in frontend_field
    assert 'step: isInteger ? 1 : "any"' in frontend_field
    assert "handleTwoDecimals" not in frontend_field
    assert "Math.trunc" not in frontend_field


def test_model_package_preview_omits_number_global_defaults_when_not_provided(
    client_factory,
    project_root: Path,
    valid_model_package_payload: dict[str, object],
) -> None:
    model = valid_model_package_payload["model"]
    model["parameters"] = [
        {
            "key": "required_alpha",
            "label": "Required alpha",
            "valueType": "number",
            "parameterStructureKey": "numberGlobal",
            "required": True,
            "restrictions": {"min": None, "max": None, "allowed": None},
        },
        {
            "key": "required_iterations",
            "label": "Required iterations",
            "valueType": "integer",
            "parameterStructureKey": "numberGlobal",
            "required": True,
            "restrictions": {"min": 1, "max": None, "allowed": None},
        },
        {
            "key": "optional_alpha",
            "label": "Optional alpha",
            "valueType": "number",
            "parameterStructureKey": "numberGlobal",
            "required": False,
            "restrictions": {"min": None, "max": None, "allowed": None},
        },
    ]

    with client_factory(project_root) as client:
        response = client.post(
            "/scaffold/model-package/preview",
            json=valid_model_package_payload,
        )

    assert response.status_code == 200
    model_item = next(
        item for item in response.json()["items"] if item["kind"] == "model"
    )
    definition = next(
        file["content"]
        for file in model_item["files"]
        if file["path"].endswith("/definition.py")
    )
    assert "'default':" not in definition


def test_model_package_preview_rejects_noncanonical_number_global_metadata(
    client_factory,
    project_root: Path,
    valid_model_package_payload: dict[str, object],
) -> None:
    model = valid_model_package_payload["model"]
    model["parameters"] = [
        {
            "key": "iterations",
            "label": "Iterations",
            "valueType": "integer",
            "parameterStructureKey": "numberGlobal",
            "required": True,
            "default": 4.5,
            "restrictions": {
                "min": 1,
                "max": 10,
                "allowed": None,
            },
        }
    ]

    with client_factory(project_root) as client:
        response = client.post(
            "/scaffold/model-package/preview",
            json=valid_model_package_payload,
        )

    assert response.status_code == 422
    assert "default must be an integer" in response.json()["detail"][0]["msg"]


def test_model_package_preview_requires_number_global_value_type(
    client_factory,
    project_root: Path,
    valid_model_package_payload: dict[str, object],
) -> None:
    model = valid_model_package_payload["model"]
    model["parameters"] = [
        {
            "key": "alpha",
            "label": "Alpha",
            "parameterStructureKey": "numberGlobal",
            "required": True,
            "default": 0.5,
            "restrictions": {
                "min": 0,
                "max": 1,
                "allowed": None,
            },
        }
    ]

    with client_factory(project_root) as client:
        response = client.post(
            "/scaffold/model-package/preview",
            json=valid_model_package_payload,
        )

    assert response.status_code == 422
    assert "valueType must be number or integer" in response.json()["detail"][0]["msg"]


def test_model_package_apply_writes_expected_files_inside_temp_project_root(
    client_factory,
    monkeypatch,
    project_root: Path,
    valid_model_package_payload: dict[str, object],
) -> None:
    monkeypatch.setattr(
        model_package_apply_service,
        "validate_written_scaffold_files",
        lambda **kwargs: ScaffoldValidationResult(status="skipped", checks=[]),
    )

    with client_factory(project_root) as client:
        response = client.post(
            "/scaffold/model-package/apply",
            json=valid_model_package_payload,
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["service"] == "model-forge"
    assert payload["kind"] == "model-package"
    assert payload["mode"] == "apply"
    assert any(item["status"] == "written" for item in payload["items"])

    expected_files = [
        project_root / "DecisionModelsService/models/demo_model/__init__.py",
        project_root / "DecisionModelsService/models/demo_model/definition.py",
        project_root / "DecisionModelsService/models/demo_model/executor.py",
        project_root / "DecisionModelsService/models/demo_model/run.py",
        project_root / "DecisionModelsService/models/demo_model/examples.py",
        project_root
        / "Backend/modules/decisionPlugins/evaluations/structures/alternativeMatrix/index.js",
        project_root
        / "Backend/modules/decisionPlugins/evaluations/structures/alternativeMatrix/alternativeMatrix.get.js",
        project_root
        / "Backend/modules/decisionPlugins/evaluations/structures/alternativeMatrix/alternativeMatrix.save.js",
        project_root
        / "Frontend/src/features/decisionPlugins/evaluations/structures/alternativeMatrix/index.js",
        project_root
        / "Frontend/src/features/decisionPlugins/evaluations/structures/alternativeMatrix/AlternativeMatrixView.jsx",
    ]

    for path in expected_files:
        assert path.exists(), f"Expected scaffold file was not written: {path}"
        path.resolve().relative_to(project_root.resolve())


def test_model_package_apply_rejects_partial_existing_assets_as_unsupported_operation(
    client_factory,
    project_root: Path,
    valid_model_package_payload: dict[str, object],
) -> None:
    partial_model_dir = project_root / "DecisionModelsService/models/demo_model"
    partial_model_dir.mkdir(parents=True)
    (partial_model_dir / "definition.py").write_text("# partial\n", encoding="utf-8")

    with client_factory(project_root) as client:
        response = client.post(
            "/scaffold/model-package/apply",
            json=valid_model_package_payload,
        )

    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["message"] == "Cannot apply scaffold while partial items exist."
    assert detail["items"][0]["kind"] == "model"
    assert detail["items"][0]["status"] == "partial"


def test_model_package_apply_rejects_prewrite_malformed_package(
    client_factory,
    monkeypatch,
    project_root: Path,
    valid_model_package_payload: dict[str, object],
) -> None:
    def fake_preview(*args, **kwargs):
        return ModelPackagePreviewResponse(
            items=[
                ModelPackagePreviewItem(
                    kind="model",
                    key="demo_model",
                    status="toGenerate",
                    reason=None,
                    targetBasePath="DecisionModelsService/models/demo_model",
                    files=[
                        {
                            "path": "DecisionModelsService/models/demo_model/bad.py",
                            "content": "def broken(:\n",
                        }
                    ],
                )
            ],
            validation=ScaffoldValidationResult(status="passed", checks=[]),
        )

    monkeypatch.setattr(
        model_package_apply_service,
        "build_model_package_preview",
        fake_preview,
    )

    with client_factory(project_root) as client:
        response = client.post(
            "/scaffold/model-package/apply",
            json=valid_model_package_payload,
        )

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert detail["message"] == "Scaffold validation failed before files were written."
    assert detail["validation"]["status"] == "failed"


def test_model_package_apply_rejects_parent_traversal_paths(
    client_factory,
    monkeypatch,
    project_root: Path,
    valid_model_package_payload: dict[str, object],
) -> None:
    def fake_preview(*args, **kwargs):
        return ModelPackagePreviewResponse(
            items=[
                ModelPackagePreviewItem(
                    kind="model",
                    key="demo_model",
                    status="toGenerate",
                    reason=None,
                    targetBasePath="DecisionModelsService/models/demo_model",
                    files=[
                        {
                            "path": "../../escape.py",
                            "content": "print('escape')\n",
                        }
                    ],
                )
            ],
            validation=ScaffoldValidationResult(status="passed", checks=[]),
        )

    monkeypatch.setattr(
        model_package_apply_service,
        "build_model_package_preview",
        fake_preview,
    )
    monkeypatch.setattr(
        model_package_apply_service,
        "validate_written_scaffold_files",
        lambda **kwargs: ScaffoldValidationResult(status="skipped", checks=[]),
    )

    with client_factory(project_root) as client:
        response = client.post(
            "/scaffold/model-package/apply",
            json=valid_model_package_payload,
        )

    assert response.status_code == 400
    assert response.json()["detail"] == {
        "message": "Scaffold file path must not contain parent traversal.",
        "path": "../../escape.py",
    }
