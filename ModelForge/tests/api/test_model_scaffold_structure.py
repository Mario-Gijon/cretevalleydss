from contextlib import contextmanager
from copy import deepcopy
import importlib
import importlib.util
import py_compile
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


def _write_import_stubs(project_root: Path) -> None:
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
            "    pass\n"
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
    }

    for relative_path, content in stub_files.items():
        target_path = project_root / relative_path
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_text(content, encoding="utf-8")


@contextmanager
def _isolated_temp_imports(project_root: Path):
    prefixes = ("DecisionModelsService", "registry", "schemas", "services")
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


def _load_module_from_file(module_name: str, file_path: Path):
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_model_package_preview_reports_model_file_paths_without_creating_files(
    client_factory,
    project_root: Path,
    valid_model_package_payload: dict[str, object],
) -> None:
    with client_factory(project_root) as client:
        response = client.post(
            "/scaffold/model-package/preview",
            json=valid_model_package_payload,
        )

    assert response.status_code == 200
    payload = response.json()
    model_item = next(item for item in payload["items"] if item["kind"] == "model")
    preview_paths = [file["path"] for file in model_item["files"]]

    assert preview_paths == [
        "DecisionModelsService/models/demo_model/__init__.py",
        "DecisionModelsService/models/demo_model/definition.py",
        "DecisionModelsService/models/demo_model/executor.py",
        "DecisionModelsService/models/demo_model/run.py",
        "DecisionModelsService/models/demo_model/examples.py",
        "DecisionModelsService/models/demo_model/IMPLEMENTATION_GUIDE.md",
        "DecisionModelsService/models/demo_model/PROMPT_LLM.md",
        "DecisionModelsService/models/demo_model/PROMPT_AGENT.md",
    ]

    for relative_path in preview_paths:
        assert not (project_root / relative_path).exists()


def test_applied_model_scaffold_files_are_non_empty_compile_and_can_be_imported(
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
    expected_files = {
        "__init__.py": model_root / "__init__.py",
        "definition.py": model_root / "definition.py",
        "examples.py": model_root / "examples.py",
        "executor.py": model_root / "executor.py",
        "run.py": model_root / "run.py",
        "IMPLEMENTATION_GUIDE.md": model_root / "IMPLEMENTATION_GUIDE.md",
        "PROMPT_LLM.md": model_root / "PROMPT_LLM.md",
        "PROMPT_AGENT.md": model_root / "PROMPT_AGENT.md",
    }

    for path in expected_files.values():
        assert path.exists(), f"Expected generated scaffold file was missing: {path}"
        content = path.read_text(encoding="utf-8")
        assert content.strip(), f"Generated scaffold file was empty: {path}"
        if path.suffix == ".py":
            py_compile.compile(str(path), doraise=True)

    init_source = expected_files["__init__.py"].read_text(encoding="utf-8")
    definition_source = expected_files["definition.py"].read_text(encoding="utf-8")
    examples_source = expected_files["examples.py"].read_text(encoding="utf-8")
    executor_source = expected_files["executor.py"].read_text(encoding="utf-8")
    run_source = expected_files["run.py"].read_text(encoding="utf-8")
    guide_source = expected_files["IMPLEMENTATION_GUIDE.md"].read_text(
        encoding="utf-8"
    )
    prompt_llm_source = expected_files["PROMPT_LLM.md"].read_text(encoding="utf-8")
    prompt_agent_source = expected_files["PROMPT_AGENT.md"].read_text(encoding="utf-8")

    assert "from .definition import MODEL_DEFINITION" in init_source
    assert 'api_model_key="demo_model"' in definition_source
    assert 'api_endpoint_path="/demo_model"' in definition_source
    assert 'display_name="Demo Model"' in definition_source
    assert "MODEL_DEFINITION = ModelDefinition(" in definition_source
    assert "DEMO_MODEL_REQUEST_EXAMPLES" in examples_source
    assert "DEMO_MODEL_RESPONSE_EXAMPLES" in examples_source
    assert "def execute_demo_model(" in executor_source
    assert "MODEL_UNDER_DEVELOPMENT" in executor_source
    assert "def run_demo_model(" in run_source
    assert "NotImplementedError" in run_source
    assert guide_source.strip()
    assert prompt_llm_source.strip()
    assert prompt_agent_source.strip()
    assert init_source in prompt_llm_source
    assert definition_source in prompt_llm_source
    assert examples_source in prompt_llm_source
    assert executor_source in prompt_llm_source
    assert run_source in prompt_llm_source
    assert 'implementation_status="scaffold"' in definition_source

    examples_module = _load_module_from_file(
        "generated_demo_model_examples",
        expected_files["examples.py"],
    )
    assert hasattr(examples_module, "DEMO_MODEL_REQUEST_EXAMPLES")
    assert hasattr(examples_module, "DEMO_MODEL_RESPONSE_EXAMPLES")
    assert examples_module.DEMO_MODEL_REQUEST_EXAMPLES["scaffold_request"]["value"]["context"][
        "structure"
    ]["key"] == "alternativeMatrix"

    _write_import_stubs(project_root)
    with _isolated_temp_imports(project_root):
        package_module = importlib.import_module("DecisionModelsService.models.demo_model")
        definition_module = importlib.import_module(
            "DecisionModelsService.models.demo_model.definition"
        )

    assert package_module.MODEL_DEFINITION.api_model_key == "demo_model"
    assert package_module.MODEL_DEFINITION.display_name == "Demo Model"
    assert definition_module.MODEL_DEFINITION.api_endpoint_path == "/demo_model"
    assert definition_module.MODEL_DEFINITION.request_examples["scaffold_request"]["summary"] == (
        "Generated scaffold request"
    )


def test_apply_with_examples_disabled_still_generates_structurally_complete_model_package(
    client_factory,
    monkeypatch,
    project_root: Path,
    valid_model_package_payload: dict[str, object],
) -> None:
    _disable_post_write_validation(monkeypatch)
    payload = deepcopy(valid_model_package_payload)
    payload["model"]["includeExamples"] = False

    with client_factory(project_root) as client:
        response = client.post("/scaffold/model-package/apply", json=payload)

    assert response.status_code == 200

    model_root = project_root / "DecisionModelsService/models/demo_model"
    examples_path = model_root / "examples.py"
    definition_path = model_root / "definition.py"

    assert examples_path.exists()
    assert definition_path.exists()
    py_compile.compile(str(examples_path), doraise=True)
    py_compile.compile(str(definition_path), doraise=True)

    definition_source = definition_path.read_text(encoding="utf-8")
    examples_source = examples_path.read_text(encoding="utf-8")

    assert "from .examples import" not in definition_source
    assert "request_examples={}" in definition_source
    assert "response_examples={}" in definition_source
    assert "DEMO_MODEL_REQUEST_EXAMPLES" in examples_source
    assert "DEMO_MODEL_RESPONSE_EXAMPLES" in examples_source
