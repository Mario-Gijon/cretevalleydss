import re
import shutil
from pathlib import Path

from fastapi import HTTPException

from schemas.scaffold_assets import (
    DeleteScaffoldAssetResponse,
    ScaffoldAssetItem,
    ScaffoldAssetsResponse,
    ScaffoldAssetKind,
)

KEY_PATTERN = re.compile(r"^[A-Za-z0-9_-]+$")
STAGE_PATTERN = re.compile(r"stage:\s*EVALUATION_STAGES\.([A-Z_]+)")

MODEL_ROOT = Path("DecisionModelsService/models")
EVALUATION_BACKEND_ROOT = Path("Backend/modules/decisionPlugins/evaluations/structures")
EVALUATION_FRONTEND_ROOT = Path(
    "Frontend/src/features/decisionPlugins/evaluations/structures"
)
PARAMETER_BACKEND_ROOT = Path(
    "Backend/modules/decisionPlugins/modelParameters/structures"
)
PARAMETER_FRONTEND_FIELDS_ROOT = Path(
    "Frontend/src/features/decisionPlugins/modelParameters/fields"
)

STAGE_MAP = {
    "ALTERNATIVE_EVALUATION": "alternativeEvaluation",
    "CRITERIA_WEIGHTING": "criteriaWeighting",
}


def build_scaffold_assets(project_root: Path) -> ScaffoldAssetsResponse:
    resolved_root = project_root.resolve()

    return ScaffoldAssetsResponse(
        models=_build_model_assets(resolved_root),
        evaluationStructures=_build_evaluation_structure_assets(resolved_root),
        parameterStructures=_build_parameter_structure_assets(resolved_root),
    )


def delete_scaffold_asset(
    *,
    project_root: Path,
    kind: ScaffoldAssetKind,
    key: str,
) -> DeleteScaffoldAssetResponse:
    resolved_root = project_root.resolve()
    normalized_key = _normalize_asset_key(key)
    asset = _find_asset_by_kind_and_key(resolved_root, kind, normalized_key)

    if asset is None:
        raise HTTPException(
            status_code=404,
            detail={
                "message": "Asset not found.",
                "kind": kind,
                "key": normalized_key,
            },
        )

    deleted_locations: list[str] = []
    missing_locations = list(asset.missingLocations)

    for relative_location in asset.locations:
        target_path = (resolved_root / relative_location).resolve()
        _assert_within_project_root(target_path, resolved_root)

        if not target_path.exists():
            missing_locations.append(relative_location)
            continue

        shutil.rmtree(target_path)
        deleted_locations.append(relative_location)

    return DeleteScaffoldAssetResponse(
        assetKind=kind,
        key=normalized_key,
        deletedLocations=sorted(set(deleted_locations)),
        missingLocations=sorted(set(missing_locations)),
    )


def _build_model_assets(project_root: Path) -> list[ScaffoldAssetItem]:
    models_root = project_root / MODEL_ROOT
    if not models_root.exists() or not models_root.is_dir():
        return []

    items: list[ScaffoldAssetItem] = []
    for entry in sorted(models_root.iterdir(), key=lambda item: item.name.lower()):
        if not entry.is_dir() or entry.name == "__pycache__":
            continue

        missing_locations = []
        if not (entry / "definition.py").exists():
            missing_locations.append(
                _to_relative_path(project_root, entry / "definition.py")
            )

        items.append(
            ScaffoldAssetItem(
                kind="model",
                key=entry.name,
                locations=[_to_relative_path(project_root, entry)],
                missingLocations=missing_locations,
                deletable=True,
            )
        )

    return items


def _build_evaluation_structure_assets(project_root: Path) -> list[ScaffoldAssetItem]:
    keys = _collect_union_keys(
        project_root / EVALUATION_BACKEND_ROOT,
        project_root / EVALUATION_FRONTEND_ROOT,
    )

    items: list[ScaffoldAssetItem] = []
    for key in keys:
        backend_path = project_root / EVALUATION_BACKEND_ROOT / key
        frontend_path = project_root / EVALUATION_FRONTEND_ROOT / key
        stage = _read_evaluation_stage(backend_path / "index.js")
        existing_locations, missing_locations = _split_existing_locations(
            project_root,
            [backend_path, frontend_path],
        )
        items.append(
            ScaffoldAssetItem(
                kind="evaluationStructure",
                key=key,
                locations=existing_locations,
                missingLocations=missing_locations,
                stage=stage or "Unknown",
                deletable=True,
            )
        )

    return items


def _build_parameter_structure_assets(project_root: Path) -> list[ScaffoldAssetItem]:
    keys = _collect_union_keys(
        project_root / PARAMETER_BACKEND_ROOT,
        project_root / PARAMETER_FRONTEND_FIELDS_ROOT,
    )

    items: list[ScaffoldAssetItem] = []
    for key in keys:
        backend_path = project_root / PARAMETER_BACKEND_ROOT / key
        frontend_fields_path = project_root / PARAMETER_FRONTEND_FIELDS_ROOT / key
        existing_locations, missing_locations = _split_existing_locations(
            project_root,
            [
                backend_path,
                frontend_fields_path,
            ],
        )

        items.append(
            ScaffoldAssetItem(
                kind="parameterStructure",
                key=key,
                locations=sorted(set(existing_locations)),
                missingLocations=sorted(set(missing_locations)),
                deletable=True,
            )
        )

    return items


def _collect_union_keys(*roots: Path) -> list[str]:
    keys: set[str] = set()

    for root in roots:
        if not root.exists() or not root.is_dir():
            continue

        for entry in root.iterdir():
            if entry.is_dir():
                keys.add(entry.name)

    return sorted(keys)


def _split_existing_locations(
    project_root: Path,
    paths: list[Path],
) -> tuple[list[str], list[str]]:
    existing_locations: list[str] = []
    missing_locations: list[str] = []

    for path in paths:
        relative_path = _to_relative_path(project_root, path)
        if path.exists():
            existing_locations.append(relative_path)
        else:
            missing_locations.append(relative_path)

    return existing_locations, missing_locations


def _read_evaluation_stage(index_path: Path) -> str | None:
    if not index_path.exists():
        return None

    try:
        source = index_path.read_text(encoding="utf-8")
    except OSError:
        return None

    match = STAGE_PATTERN.search(source)
    if not match:
        return None

    return STAGE_MAP.get(match.group(1), None)


def _find_asset_by_kind_and_key(
    project_root: Path,
    kind: ScaffoldAssetKind,
    key: str,
) -> ScaffoldAssetItem | None:
    assets = build_scaffold_assets(project_root)
    items_by_kind = {
        "model": assets.models,
        "evaluationStructure": assets.evaluationStructures,
        "parameterStructure": assets.parameterStructures,
    }

    return next(
        (item for item in items_by_kind[kind] if item.key == key),
        None,
    )


def _normalize_asset_key(key: str) -> str:
    normalized = str(key or "").strip()
    if not normalized or not KEY_PATTERN.fullmatch(normalized):
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Asset key format is invalid.",
                "field": "key",
            },
        )

    return normalized


def _to_relative_path(project_root: Path, target_path: Path) -> str:
    return str(target_path.resolve().relative_to(project_root)).replace("\\", "/")


def _assert_within_project_root(path: Path, project_root: Path) -> None:
    try:
        path.relative_to(project_root)
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Asset path resolves outside project root.",
                "path": str(path),
            },
        ) from error
