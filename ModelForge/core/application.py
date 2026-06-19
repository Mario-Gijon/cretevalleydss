from fastapi import FastAPI

from api.routers.health import router as health_router
from api.routers.project_paths import router as project_paths_router


def create_application() -> FastAPI:
    app = FastAPI(
        title="CreteValley ModelForge",
        description=(
            "Internal development/admin FastAPI microservice for future model "
            "scaffolding, template generation, and plugin validation workflows."
        ),
        version="0.1.0",
    )

    app.include_router(health_router)
    app.include_router(project_paths_router)

    return app
