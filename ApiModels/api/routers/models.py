from fastapi import APIRouter

from registry.model_registry import MODEL_REGISTRY, ModelRouteRegistration
from schemas.common import ModelExecutionResponse

router = APIRouter(tags=["Decision Models"])


def _build_model_endpoint(registration: ModelRouteRegistration):
    """Genera un endpoint FastAPI a partir del registro de un modelo."""

    request_model = registration.request_model

    async def endpoint(payload: request_model):  # type: ignore[valid-type]
        return registration.handler(payload)

    endpoint.__name__ = f"{registration.name}_endpoint"
    endpoint.__doc__ = registration.description

    return endpoint


def _build_responses(registration: ModelRouteRegistration) -> dict[int, dict[str, object]]:
    """Construye metadata de respuestas OpenAPI para un endpoint de modelo."""

    return {
        200: {
            "description": (
                "Respuesta de ejecución del modelo. "
                "Mantiene el contrato `success`, `message`, `data`, `error`."
            ),
            "content": {
                "application/json": {
                    "examples": registration.response_examples,
                }
            },
        },
        422: {
            "description": "Error de validación del payload de entrada.",
            "content": {
                "application/json": {
                    "example": {
                        "success": False,
                        "message": "Validation error",
                        "data": None,
                        "error": {
                            "code": "VALIDATION_ERROR",
                            "field": None,
                            "details": [],
                        },
                    }
                }
            },
        },
    }


for model_registration in MODEL_REGISTRY:
    router.add_api_route(
        model_registration.path,
        _build_model_endpoint(model_registration),
        methods=["POST"],
        response_model=ModelExecutionResponse,
        response_model_exclude_none=True,
        summary=model_registration.summary,
        description=model_registration.description,
        operation_id=model_registration.operation_id,
        name=model_registration.name,
        responses=_build_responses(model_registration),
    )
