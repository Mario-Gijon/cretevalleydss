from fastapi import FastAPI

from api.routers.health import router as health_router
from api.routers.project_paths import router as project_paths_router
from api.routers.scaffold_evaluation_structure import (
    router as scaffold_evaluation_structure_router,
)
from api.routers.scaffold_model import router as scaffold_model_router
from api.routers.scaffold_model_package import (
    router as scaffold_model_package_router,
)
from api.routers.scaffold_parameter import router as scaffold_parameter_router


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
    app.include_router(scaffold_evaluation_structure_router)
    app.include_router(scaffold_model_router)
    app.include_router(scaffold_model_package_router)
    app.include_router(scaffold_parameter_router)

    return app
