from fastapi import APIRouter

from core.settings import get_settings
from schemas.scaffold_catalog import ScaffoldCatalogResponse
from services.scaffold_catalog import build_scaffold_catalog

router = APIRouter(tags=["Scaffold Catalog"])


@router.get(
    "/scaffold/catalog",
    response_model=ScaffoldCatalogResponse,
    response_model_exclude_none=False,
    summary="Get scaffold catalog",
    description=(
        "Lists existing runtime parameter and evaluation structures with "
        "backend/frontend availability and evaluation stage metadata."
    ),
)
async def get_scaffold_catalog() -> ScaffoldCatalogResponse:
    settings = get_settings()
    return build_scaffold_catalog(project_root=settings.project_root)
