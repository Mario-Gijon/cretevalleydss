from contextlib import contextmanager
import importlib
from pathlib import Path
import sys

from schemas.scaffold_model_package import ScaffoldValidationResult

from services import model_package_apply as model_package_apply_service


def _disable_post_write_validation(monkeypatch) -> None:
    monkeypatch.setattr(
        model_package_apply_service,
        "validate_written_scaffold_files",
        lambda **kwargs: ScaffoldValidationResult(status="skipped", checks=[]),
    )


def _write_decision_models_service_stubs(project_root: Path) -> None:
    stub_files = {
        "DecisionModelsService/__init__.py": "",
        "DecisionModelsService/models/__init__.py": "__all__: list[str] = []\n",
        "registry/__init__.py": "",
        "registry/model_definition.py": (
            "class ModelDefinition:\n"
            "    def __init__(self, **kwargs):\n"
            "        for key, value in kwargs.items():\n"
            "            setattr(self, key, value)\n"
        ),
        "schemas/__init__.py": "",
        "schemas/model_requests.py": (
            "class GenericModelExecutionRequest:\n"
            "    def __init__(self, **kwargs):\n"
            "        for key, value in kwargs.items():\n"
            "            setattr(self, key, value)\n"
        ),
        "services/__init__.py": "",
        "services/model_executors/__init__.py": "",
        "services/model_executors/responses.py": (
            "def error_response(message, code='MODEL_UNDER_DEVELOPMENT'):\n"
            "    return {\n"
            "        'success': False,\n"
            "        'message': message,\n"
            "        'data': None,\n"
            "        'error': {\n"
            "            'code': code,\n"
            "            'field': None,\n"
            "            'details': None,\n"
            "        },\n"
            "    }\n"
        ),
        "fastapi/__init__.py": "",
        "fastapi/responses.py": "class JSONResponse(dict):\n    pass\n",
    }

    for relative_path, content in stub_files.items():
        target_path = project_root / relative_path
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_text(content, encoding="utf-8")


@contextmanager
def _isolated_temp_imports(project_root: Path):
    prefixes = ("DecisionModelsService", "registry", "schemas", "services", "fastapi")
    saved_modules = {
        name: module
        for name, module in sys.modules.items()
        if any(name == prefix or name.startswith(f"{prefix}.") for prefix in prefixes)
    }

    for name in list(sys.modules):
        if any(name == prefix or name.startswith(f"{prefix}.") for prefix in prefixes):
            sys.modules.pop(name, None)

    sys.path.insert(0, str(project_root))
    try:
        yield
    finally:
        sys.path = [entry for entry in sys.path if entry != str(project_root)]
        for name in list(sys.modules):
            if any(name == prefix or name.startswith(f"{prefix}.") for prefix in prefixes):
                sys.modules.pop(name, None)
        sys.modules.update(saved_modules)


def _discover_model_definitions(temp_project_root: Path) -> list[object]:
    models_root = temp_project_root / "DecisionModelsService/models"
    definitions: list[object] = []

    for entry in sorted(models_root.iterdir(), key=lambda item: item.name):
        if not entry.is_dir():
            continue
        if not (entry / "__init__.py").is_file():
            continue

        module = importlib.import_module(f"DecisionModelsService.models.{entry.name}")
        definitions.append(module.MODEL_DEFINITION)

    return definitions


def test_generated_model_package_is_importable_and_discoverable_via_registry_like_flow(
    client_factory,
    monkeypatch,
    project_root: Path,
    valid_model_package_payload: dict[str, object],
) -> None:
    _disable_post_write_validation(monkeypatch)

    with client_factory(project_root) as client:
        response = client.post(
            "/scaffold/model-package/apply",
            json=valid_model_package_payload,
        )

    assert response.status_code == 200

    model_root = project_root / "DecisionModelsService/models/demo_model"
    assert model_root.exists()
    assert (model_root / "__init__.py").exists()
    assert (model_root / "definition.py").exists()
    assert (model_root / "examples.py").exists()

    _write_decision_models_service_stubs(project_root)

    with _isolated_temp_imports(project_root):
        package_module = importlib.import_module("DecisionModelsService.models.demo_model")
        definition_module = importlib.import_module(
            "DecisionModelsService.models.demo_model.definition"
        )
        examples_module = importlib.import_module(
            "DecisionModelsService.models.demo_model.examples"
        )

        model_definition = package_module.MODEL_DEFINITION

        assert definition_module.MODEL_DEFINITION is model_definition
        assert model_definition.api_model_key == "demo_model"
        assert model_definition.api_endpoint_path == "/demo_model"
        assert model_definition.display_name == "Demo Model"
        assert model_definition.model_kind == "issue"
        assert model_definition.evaluation_structure_key == "alternativeMatrix"
        assert callable(model_definition.handler)

        assert hasattr(examples_module, "DEMO_MODEL_REQUEST_EXAMPLES")
        assert hasattr(examples_module, "DEMO_MODEL_RESPONSE_EXAMPLES")
        assert model_definition.request_examples == examples_module.DEMO_MODEL_REQUEST_EXAMPLES
        assert model_definition.response_examples == examples_module.DEMO_MODEL_RESPONSE_EXAMPLES
        assert "basic_request" in model_definition.request_examples
        assert "under_development" in model_definition.response_examples

        request_model = definition_module.GenericModelExecutionRequest
        handler_response = model_definition.handler(request_model())

        assert handler_response["success"] is False
        assert handler_response["data"] is None
        assert handler_response["error"]["code"] == "MODEL_UNDER_DEVELOPMENT"

        discovered_definitions = _discover_model_definitions(project_root)

    matching_definitions = [
        definition
        for definition in discovered_definitions
        if definition.api_model_key == "demo_model"
    ]
    assert len(matching_definitions) == 1
    assert matching_definitions[0].api_endpoint_path == "/demo_model"
    assert matching_definitions[0].display_name == "Demo Model"
    assert matching_definitions[0].handler is not None
