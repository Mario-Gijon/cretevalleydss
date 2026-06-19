import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    project_root: Path
    model_forge_port: int


def get_settings() -> Settings:
    project_root = Path(os.getenv("PROJECT_ROOT", "/workspace")).resolve()
    model_forge_port = int(os.getenv("MODEL_FORGE_PORT", "7100"))

    return Settings(
        project_root=project_root,
        model_forge_port=model_forge_port,
    )
