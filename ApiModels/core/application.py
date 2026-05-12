from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse

from api.routers.model_manifest import router as model_manifest_router
from api.routers.models import router as models_router


def _ensure_error_example_nulls(openapi_schema: dict) -> None:
    """Restaura campos null del contrato en ejemplos OpenAPI de error."""

    for path_data in openapi_schema.get("paths", {}).values():
        for operation in path_data.values():
            responses = operation.get("responses", {})

            for response in responses.values():
                media = response.get("content", {}).get("application/json", {})

                example = media.get("example")
                if isinstance(example, dict):
                    _patch_error_example(example)

                for example_data in media.get("examples", {}).values():
                    value = example_data.get("value")
                    if isinstance(value, dict):
                        _patch_error_example(value)


def _patch_error_example(example: dict) -> None:
    if example.get("success") is not False:
        return

    example.setdefault("data", None)
    error = example.setdefault("error", {})
    if isinstance(error, dict):
        error.setdefault("field", None)
        error.setdefault("details", None)


def create_application() -> FastAPI:
    """Crea la aplicación FastAPI con rutas y configuración comunes."""

    app = FastAPI(
        title="CreteValley Decision Models API",
        description=(
            "API para ejecutar modelos de decisión usados por el backend de CreteValley. "
            "Usa el contrato estándar `success`, `message`, `data` y `error`."
        ),
        version="1.0.0",
    )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "message": "Validation error",
                "data": None,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "field": None,
                    "details": jsonable_encoder(exc.errors()),
                },
            },
        )

    app.include_router(models_router)
    app.include_router(model_manifest_router)

    def custom_openapi():
        if app.openapi_schema:
            return app.openapi_schema

        openapi_schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        _ensure_error_example_nulls(openapi_schema)
        app.openapi_schema = openapi_schema
        return app.openapi_schema

    app.openapi = custom_openapi

    return app
