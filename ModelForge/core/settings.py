import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    project_root: Path
    model_forge_port: int


def get_settings() -> Settings:
    configured_project_root = os.getenv("PROJECT_ROOT")
    if configured_project_root:
        project_root = Path(configured_project_root).resolve()
    else:
        default_workspace_root = Path("/workspace")
        project_root = (
            default_workspace_root.resolve()
            if default_workspace_root.exists()
            else Path(__file__).resolve().parents[2]
        )
    model_forge_port = int(os.getenv("MODEL_FORGE_PORT", "7100"))

    return Settings(
        project_root=project_root,
        model_forge_port=model_forge_port,
    )
