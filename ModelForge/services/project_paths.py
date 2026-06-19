from pathlib import Path


def get_project_paths_status(project_root: Path) -> list[dict[str, object]]:
    resolved_root = project_root.resolve()
    path_map = {
        "frontend": resolved_root / "Frontend",
        "backend": resolved_root / "Backend",
        "decisionModelsService": resolved_root / "DecisionModelsService",
        "modelForge": resolved_root / "ModelForge",
    }

    return [
        {
            "key": key,
            "path": str(path_value),
            "exists": path_value.exists(),
            "isDirectory": path_value.is_dir(),
        }
        for key, path_value in path_map.items()
    ]
