from inspect import isawaitable

from fastapi import APIRouter, Body
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from registry.model_definition import ModelDefinition
from registry.model_registry import get_model_definition_by_endpoint_path
from schemas.common import ModelExecutionResponse

router = APIRouter(tags=["Decision Models"])


def _build_responses() -> dict[int, dict[str, object]]:
    return {
        200: {
            "description": (
                "Respuesta de ejecución del modelo. "
                "Mantiene el contrato `success`, `message`, `data`, `error`."
            ),
        },
        404: {
            "description": "El modelo solicitado no existe o no está disponible.",
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


async def _execute_model_definition(
    model: ModelDefinition, raw_payload: dict
) -> dict | JSONResponse:
    try:
        payload = model.request_model.model_validate(raw_payload)
    except ValidationError as exc:
        raise RequestValidationError(exc.errors()) from exc

    result = model.handler(payload)
    if isawaitable(result):
        result = await result

    return result


@router.post(
    "/{model_path:path}",
    response_model=ModelExecutionResponse,
    response_model_exclude_none=True,
    summary="Execute a decision model dynamically",
    description=(
        "Resolve and execute a published DecisionModelsService model at request "
        "time. This supports newly generated ModelForge scaffolds without "
        "restarting the service."
    ),
    responses=_build_responses(),
)
async def execute_dynamic_model(
    model_path: str,
    raw_payload: dict = Body(...),
):
    endpoint_path = "/" + str(model_path or "").strip("/")
    model = get_model_definition_by_endpoint_path(endpoint_path)

    if model is None:
        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "message": "Model endpoint not found.",
                "data": None,
                "error": {
                    "code": "MODEL_NOT_FOUND",
                    "field": "model_path",
                    "details": {
                        "endpointPath": endpoint_path,
                    },
                },
            },
        )

    return await _execute_model_definition(model, raw_payload)
