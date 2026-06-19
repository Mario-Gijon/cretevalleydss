from fastapi import APIRouter

from core.settings import get_settings
from services.project_paths import get_project_paths_status

router = APIRouter(tags=["Project Paths"])


@router.get(
    "/project/paths",
    response_model_exclude_none=False,
    summary="Get project paths",
    description="Returns the resolved project root and known service path statuses.",
)
async def get_project_paths():
    settings = get_settings()

    return {
        "success": True,
        "message": "Project paths resolved",
        "data": {
            "projectRoot": str(settings.project_root),
            "paths": get_project_paths_status(settings.project_root),
        },
        "error": None,
    }
