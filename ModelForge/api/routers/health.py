from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model_exclude_none=False,
    summary="Get service health",
    description="Returns the basic health state of ModelForge.",
)
async def get_health():
    return {
        "success": True,
        "message": "ModelForge is healthy",
        "data": {
            "service": "ModelForge",
            "status": "healthy",
        },
        "error": None,
    }
