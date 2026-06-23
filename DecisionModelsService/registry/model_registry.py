from importlib import import_module, invalidate_caches, reload
from pathlib import Path
import sys

from registry.model_definition import ModelDefinition


MODELS_ROOT = Path(__file__).resolve().parents[1] / "models"


def _iter_candidate_model_dirs() -> list[Path]:
    if not MODELS_ROOT.exists():
        return []

    return sorted(
        (
            path
            for path in MODELS_ROOT.iterdir()
            if path.is_dir() and (path / "definition.py").is_file()
        ),
        key=lambda path: path.name,
    )


def _load_model_definition(model_dir: Path) -> ModelDefinition:
    module_path = f"models.{model_dir.name}.definition"

    if module_path in sys.modules:
        module = reload(sys.modules[module_path])
    else:
        module = import_module(module_path)

    if not hasattr(module, "MODEL_DEFINITION"):
        raise ValueError(f"{module_path} must export MODEL_DEFINITION")

    model_definition = module.MODEL_DEFINITION

    if not isinstance(model_definition, ModelDefinition):
        raise TypeError(
            f"{module_path}.MODEL_DEFINITION must be an instance of ModelDefinition"
        )

    if model_dir.name != model_definition.api_model_key:
        raise ValueError(
            f"{module_path} folder name '{model_dir.name}' must match "
            f"api_model_key '{model_definition.api_model_key}'"
        )

    return model_definition


def _append_definition_or_raise(
    *,
    definitions: list[ModelDefinition],
    definition: ModelDefinition,
    seen_model_keys: set[str],
    seen_endpoint_paths: set[str],
    strict: bool,
) -> None:
    if definition.api_model_key in seen_model_keys:
        if strict:
            raise ValueError(
                f"Duplicate api_model_key detected: {definition.api_model_key}"
            )
        return

    if definition.api_endpoint_path in seen_endpoint_paths:
        if strict:
            raise ValueError(
                f"Duplicate api_endpoint_path detected: {definition.api_endpoint_path}"
            )
        return

    seen_model_keys.add(definition.api_model_key)
    seen_endpoint_paths.add(definition.api_endpoint_path)
    definitions.append(definition)


def get_model_definitions(*, strict: bool = True) -> tuple[ModelDefinition, ...]:
    invalidate_caches()

    definitions: list[ModelDefinition] = []
    seen_model_keys: set[str] = set()
    seen_endpoint_paths: set[str] = set()

    for model_dir in _iter_candidate_model_dirs():
        try:
            definition = _load_model_definition(model_dir)
        except Exception:
            if strict:
                raise
            continue

        _append_definition_or_raise(
            definitions=definitions,
            definition=definition,
            seen_model_keys=seen_model_keys,
            seen_endpoint_paths=seen_endpoint_paths,
            strict=strict,
        )

    return tuple(definitions)


def get_model_definition_by_endpoint_path(endpoint_path: str) -> ModelDefinition | None:
    normalized_endpoint_path = f"/{str(endpoint_path or '').strip('/')}"

    for definition in get_model_definitions(strict=False):
        if definition.api_endpoint_path == normalized_endpoint_path:
            return definition

    return None


__all__ = ["get_model_definition_by_endpoint_path", "get_model_definitions"]
