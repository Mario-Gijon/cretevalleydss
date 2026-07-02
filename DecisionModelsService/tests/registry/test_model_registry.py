from pathlib import Path
import sys

import pytest
from pydantic import BaseModel

from registry import model_registry
from registry.model_registry import (
    _iter_candidate_model_dirs,
    get_model_definition_by_endpoint_path,
    get_model_definitions,
)


def _purge_model_modules() -> None:
    for module_name in list(sys.modules):
        if module_name == "models" or module_name.startswith("models."):
            sys.modules.pop(module_name, None)


def _write_temp_model(
    root: Path,
    folder_name: str,
    definition_body: str,
    *,
    create_definition: bool = True,
) -> Path:
    models_root = root / "models"
    package_dir = models_root / folder_name
    package_dir.mkdir(parents=True, exist_ok=True)
    (models_root / "__init__.py").write_text("", encoding="utf-8")
    (package_dir / "__init__.py").write_text("", encoding="utf-8")

    if create_definition:
        (package_dir / "definition.py").write_text(definition_body, encoding="utf-8")

    return package_dir


@pytest.fixture
def temp_models_root(tmp_path, monkeypatch):
    _purge_model_modules()
    monkeypatch.syspath_prepend(str(tmp_path))
    monkeypatch.setattr(model_registry, "MODELS_ROOT", tmp_path / "models")
    yield tmp_path / "models"
    _purge_model_modules()


def test_iter_candidate_model_dirs_only_includes_directories_with_definition(
    temp_models_root,
):
    _write_temp_model(temp_models_root.parent, "alpha", "MODEL_DEFINITION = None\n")
    _write_temp_model(
        temp_models_root.parent,
        "beta",
        "",
        create_definition=False,
    )
    plain_file = temp_models_root / "notes.txt"
    plain_file.write_text("ignore me", encoding="utf-8")

    candidates = _iter_candidate_model_dirs()

    assert [candidate.name for candidate in candidates] == ["alpha"]


def test_get_model_definitions_loads_valid_model_definition(temp_models_root):
    _write_temp_model(
        temp_models_root.parent,
        "alpha",
        """
from pydantic import BaseModel
from registry.model_definition import ModelDefinition


class RequestModel(BaseModel):
    value: int


def handler(payload):
    return {"success": True, "message": "ok", "data": {"value": payload.value}, "error": None}


MODEL_DEFINITION = ModelDefinition(
    api_model_key="alpha",
    api_endpoint_path="/alpha",
    request_model=RequestModel,
    handler=handler,
    display_name="Alpha",
    small_description="Small",
    extended_description="Extended",
    evaluation_structure_key="alternativeCriteriaMatrix",
)
""".strip()
        + "\n",
    )

    definitions = get_model_definitions()

    assert len(definitions) == 1
    assert definitions[0].api_model_key == "alpha"
    assert definitions[0].api_endpoint_path == "/alpha"


def test_missing_model_definition_raises_in_strict_mode(temp_models_root):
    _write_temp_model(
        temp_models_root.parent,
        "alpha",
        "NOT_THE_RIGHT_NAME = object()\n",
    )

    with pytest.raises(ValueError, match="must export MODEL_DEFINITION"):
        get_model_definitions()


def test_wrong_model_definition_type_raises(temp_models_root):
    _write_temp_model(
        temp_models_root.parent,
        "alpha",
        "MODEL_DEFINITION = object()\n",
    )

    with pytest.raises(TypeError, match="must be an instance of ModelDefinition"):
        get_model_definitions()


def test_folder_name_mismatch_with_api_model_key_raises(temp_models_root):
    _write_temp_model(
        temp_models_root.parent,
        "alpha",
        """
from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest


def handler(payload):
    return {"success": True, "message": "ok", "data": None, "error": None}


MODEL_DEFINITION = ModelDefinition(
    api_model_key="beta",
    api_endpoint_path="/beta",
    request_model=GenericModelExecutionRequest,
    handler=handler,
    display_name="Beta",
    small_description="Small",
    extended_description="Extended",
    evaluation_structure_key="alternativeCriteriaMatrix",
)
""".strip()
        + "\n",
    )

    with pytest.raises(
        ValueError,
        match="folder name 'alpha' must match api_model_key 'beta'",
    ):
        get_model_definitions()


def test_duplicate_api_model_key_raises_with_strict_true(
    monkeypatch,
    model_definition_factory,
):
    duplicate_one = model_definition_factory(
        api_model_key="duplicate",
        api_endpoint_path="/duplicate-one",
    )
    duplicate_two = model_definition_factory(
        api_model_key="duplicate",
        api_endpoint_path="/duplicate-two",
    )

    fake_dirs = [Path("first"), Path("second")]
    definitions_by_dir = {
        fake_dirs[0]: duplicate_one,
        fake_dirs[1]: duplicate_two,
    }

    monkeypatch.setattr(model_registry, "_iter_candidate_model_dirs", lambda: fake_dirs)
    monkeypatch.setattr(
        model_registry,
        "_load_model_definition",
        lambda model_dir: definitions_by_dir[model_dir],
    )

    with pytest.raises(ValueError, match="Duplicate api_model_key detected: duplicate"):
        get_model_definitions(strict=True)


def test_duplicate_api_endpoint_path_raises_with_strict_true(
    monkeypatch,
    model_definition_factory,
):
    first = model_definition_factory(
        api_model_key="first",
        api_endpoint_path="/shared-path",
    )
    second = model_definition_factory(
        api_model_key="second",
        api_endpoint_path="/shared-path",
    )

    fake_dirs = [Path("first"), Path("second")]
    definitions_by_dir = {
        fake_dirs[0]: first,
        fake_dirs[1]: second,
    }

    monkeypatch.setattr(model_registry, "_iter_candidate_model_dirs", lambda: fake_dirs)
    monkeypatch.setattr(
        model_registry,
        "_load_model_definition",
        lambda model_dir: definitions_by_dir[model_dir],
    )

    with pytest.raises(
        ValueError,
        match="Duplicate api_endpoint_path detected: /shared-path",
    ):
        get_model_definitions(strict=True)


def test_strict_false_skips_invalid_definitions_instead_of_crashing(temp_models_root):
    _write_temp_model(
        temp_models_root.parent,
        "valid_model",
        """
from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest


def handler(payload):
    return {"success": True, "message": "ok", "data": None, "error": None}


MODEL_DEFINITION = ModelDefinition(
    api_model_key="valid_model",
    api_endpoint_path="/valid_model",
    request_model=GenericModelExecutionRequest,
    handler=handler,
    display_name="Valid Model",
    small_description="Small",
    extended_description="Extended",
    evaluation_structure_key="alternativeCriteriaMatrix",
)
""".strip()
        + "\n",
    )
    _write_temp_model(
        temp_models_root.parent,
        "missing_export",
        "SOMETHING_ELSE = 1\n",
    )
    _write_temp_model(
        temp_models_root.parent,
        "wrong_type",
        "MODEL_DEFINITION = 'not a model definition'\n",
    )

    definitions = get_model_definitions(strict=False)

    assert [definition.api_model_key for definition in definitions] == ["valid_model"]


def test_get_model_definition_by_endpoint_path_accepts_both_prefixed_and_unprefixed_paths(
    monkeypatch,
    model_definition_factory,
):
    definition = model_definition_factory(
        api_model_key="alpha",
        api_endpoint_path="/alpha",
    )
    monkeypatch.setattr(
        model_registry,
        "get_model_definitions",
        lambda strict=False: (definition,),
    )

    assert get_model_definition_by_endpoint_path("/alpha") == definition
    assert get_model_definition_by_endpoint_path("alpha") == definition


def test_get_model_definition_by_endpoint_path_returns_none_for_unknown_path(
    monkeypatch,
):
    monkeypatch.setattr(
        model_registry,
        "get_model_definitions",
        lambda strict=False: (),
    )

    assert get_model_definition_by_endpoint_path("missing") is None


def test_real_registry_metadata_smoke():
    definitions = get_model_definitions(strict=False)

    assert len({definition.api_model_key for definition in definitions}) == len(definitions)
    assert len({definition.api_endpoint_path for definition in definitions}) == len(
        definitions
    )

    for definition in definitions:
        assert definition.api_endpoint_path.startswith("/")
        assert definition.display_name.strip()
        assert issubclass(definition.request_model, BaseModel)
        assert callable(definition.handler)
