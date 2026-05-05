from fastapi import APIRouter

from registry.model_definitions import MODEL_DEFINITIONS, ModelDefinition
from schemas.common import ModelExecutionResponse

router = APIRouter(tags=["Decision Models"])


def _build_model_endpoint(model: ModelDefinition):
    """Genera un endpoint FastAPI a partir de la definición de un modelo."""

    request_model = model.request_model

    async def endpoint(payload: request_model):  # type: ignore[valid-type]
        return model.handler(payload)

    endpoint.__name__ = f"{model.key}_endpoint"
    endpoint.__doc__ = model.description

    return endpoint


def _build_responses(model: ModelDefinition) -> dict[int, dict[str, object]]:
    """Construye metadata de respuestas OpenAPI para un endpoint de modelo."""

    return {
        200: {
            "description": (
                "Respuesta de ejecución del modelo. "
                "Mantiene el contrato `success`, `message`, `data`, `error`."
            ),
            "content": {
                "application/json": {
                    "examples": model.response_examples,
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


for model_definition in MODEL_DEFINITIONS:
    router.add_api_route(
        model_definition.path,
        _build_model_endpoint(model_definition),
        methods=["POST"],
        response_model=ModelExecutionResponse,
        response_model_exclude_none=True,
        summary=model_definition.summary,
        description=model_definition.description,
        operation_id=model_definition.operation_id,
        name=model_definition.key,
        responses=_build_responses(model_definition),
    )
