from fastapi import APIRouter

from core.settings import get_settings
from schemas.scaffold_assets import (
    DeleteScaffoldAssetResponse,
    ScaffoldAssetsResponse,
    ScaffoldAssetKind,
)
from services.scaffold_assets import build_scaffold_assets, delete_scaffold_asset

router = APIRouter(tags=["Scaffold Assets"])


@router.get(
    "/scaffold/assets",
    response_model=ScaffoldAssetsResponse,
    response_model_exclude_none=False,
    summary="Get generated scaffold assets",
    description=(
        "Lists generated ModelForge model, evaluation structure, and parameter "
        "structure assets from the current project filesystem."
    ),
)
async def get_scaffold_assets() -> ScaffoldAssetsResponse:
    settings = get_settings()
    return build_scaffold_assets(project_root=settings.project_root)


@router.delete(
    "/scaffold/assets/{kind}/{key}",
    response_model=DeleteScaffoldAssetResponse,
    response_model_exclude_none=False,
    summary="Delete generated scaffold asset",
    description=(
        "Deletes known generated folders for a ModelForge asset when the asset "
        "matches a generated filesystem entry."
    ),
)
async def delete_generated_scaffold_asset(
    kind: ScaffoldAssetKind,
    key: str,
) -> DeleteScaffoldAssetResponse:
    settings = get_settings()
    return delete_scaffold_asset(
        project_root=settings.project_root,
        kind=kind,
        key=key,
    )
