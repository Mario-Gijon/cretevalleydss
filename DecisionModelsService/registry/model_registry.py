from importlib import import_module
from pathlib import Path

from registry.model_definition import ModelDefinition


MODELS_ROOT = Path(__file__).resolve().parents[1] / "models"


def _iter_model_dirs() -> list[Path]:
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


def _build_model_definitions() -> tuple[ModelDefinition, ...]:
    definitions = tuple(
        _load_model_definition(model_dir)
        for model_dir in _iter_model_dirs()
    )

    seen_model_keys: set[str] = set()
    seen_endpoint_paths: set[str] = set()

    for definition in definitions:
        if definition.api_model_key in seen_model_keys:
            raise ValueError(
                f"Duplicate api_model_key detected: {definition.api_model_key}"
            )
        seen_model_keys.add(definition.api_model_key)

        if definition.api_endpoint_path in seen_endpoint_paths:
            raise ValueError(
                f"Duplicate api_endpoint_path detected: {definition.api_endpoint_path}"
            )
        seen_endpoint_paths.add(definition.api_endpoint_path)

    return definitions


MODEL_DEFINITIONS = _build_model_definitions()

__all__ = ["MODEL_DEFINITIONS"]
