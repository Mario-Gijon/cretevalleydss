from dataclasses import dataclass
from pathlib import Path
from typing import Literal


@dataclass(frozen=True)
class ModelExistence:
    status: Literal["exists", "missing", "partial"]
    path: Path
    missing_files: tuple[str, ...] = ()


MODEL_REQUIRED_FILES = (
    "definition.py",
    "executor.py",
    "run.py",
    "examples.py",
)


@dataclass(frozen=True)
class StructureExistence:
    status: Literal["exists", "missing", "partial"]
    backend_path: Path
    frontend_path: Path
    backend_exists: bool
    frontend_exists: bool


def get_model_existence(project_root: Path, api_model_key: str) -> ModelExistence:
    model_path = project_root / "DecisionModelsService" / "models" / api_model_key
    if not model_path.exists():
        return ModelExistence(
            status="missing",
            path=model_path,
        )

    missing_files = tuple(
        file_name
        for file_name in MODEL_REQUIRED_FILES
        if not (model_path / file_name).is_file()
    )

    return ModelExistence(
        status="partial" if missing_files else "exists",
        path=model_path,
        missing_files=missing_files,
    )


def get_parameter_structure_existence(
    project_root: Path, parameter_structure_key: str
) -> StructureExistence:
    backend_path = (
        project_root
        / "Backend"
        / "modules"
        / "decisionPlugins"
        / "modelParameters"
        / "structures"
        / parameter_structure_key
    )
    frontend_path = (
        project_root
        / "Frontend"
        / "src"
        / "features"
        / "decisionPlugins"
        / "modelParameters"
        / "fields"
        / parameter_structure_key
    )
    return _build_structure_existence(backend_path, frontend_path)


def get_evaluation_structure_existence(
    project_root: Path, evaluation_structure_key: str
) -> StructureExistence:
    backend_path = (
        project_root
        / "Backend"
        / "modules"
        / "decisionPlugins"
        / "evaluations"
        / "structures"
        / evaluation_structure_key
    )
    frontend_path = (
        project_root
        / "Frontend"
        / "src"
        / "features"
        / "decisionPlugins"
        / "evaluations"
        / "structures"
        / evaluation_structure_key
    )
    return _build_structure_existence(backend_path, frontend_path)


def _build_structure_existence(
    backend_path: Path, frontend_path: Path
) -> StructureExistence:
    backend_exists = backend_path.exists()
    frontend_exists = frontend_path.exists()

    if backend_exists and frontend_exists:
        status = "exists"
    elif backend_exists or frontend_exists:
        status = "partial"
    else:
        status = "missing"

    return StructureExistence(
        status=status,
        backend_path=backend_path,
        frontend_path=frontend_path,
        backend_exists=backend_exists,
        frontend_exists=frontend_exists,
    )
