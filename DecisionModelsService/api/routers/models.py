from inspect import Parameter, Signature, isawaitable

from fastapi import APIRouter, Body
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from registry.model_definition import ModelDefinition
from registry.model_registry import (
    get_model_definition_by_api_model_key,
    get_model_definition_by_endpoint_path,
    get_model_definitions,
)
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


def _build_model_responses(model: ModelDefinition) -> dict[int, dict[str, object]]:
    responses = _build_responses()
    if model.response_examples:
        responses[200] = {
            **responses[200],
            "content": {
                "application/json": {
                    "examples": model.response_examples,
                }
            },
        }
    return responses


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


def _diagnostic_error(
    *,
    status_code: int,
    code: str,
    message: str,
    field: str | None,
    details: object = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "message": message,
            "data": None,
            "error": {"code": code, "field": field, "details": details},
        },
    )


def _create_explicit_model_endpoint(model: ModelDefinition):
    async def execute_registered_model(raw_payload):
        return await _execute_model_definition(model, raw_payload)

    execute_registered_model.__name__ = f"execute_{model.api_model_key.replace('-', '_')}"
    execute_registered_model.__doc__ = model.extended_description or model.small_description
    execute_registered_model.__signature__ = Signature(
        parameters=[
            Parameter(
                "raw_payload",
                kind=Parameter.POSITIONAL_OR_KEYWORD,
                annotation=model.request_model,
                default=Body(..., openapi_examples=model.request_examples or None),
            )
        ],
        return_annotation=ModelExecutionResponse,
    )
    return execute_registered_model


def _register_explicit_model_routes() -> None:
    for model in get_model_definitions(strict=False):
        if model.implementation_status != "ready":
            continue
        router.add_api_route(
            model.api_endpoint_path,
            _create_explicit_model_endpoint(model),
            methods=["POST"],
            response_model=ModelExecutionResponse,
            response_model_exclude_none=True,
            tags=["Decision Models"],
            summary=f"Execute {model.display_name}",
            description=model.extended_description or model.small_description,
            responses=_build_model_responses(model),
            name=f"execute_{model.api_model_key}",
        )


_register_explicit_model_routes()


@router.post(
    "/diagnostics/{api_model_key}",
    response_model=ModelExecutionResponse,
    include_in_schema=False,
    summary="Diagnose consistency for a registered model",
    description=(
        "Runs the optional read-only diagnostic capability registered by a ready "
        "model. This internal endpoint does not execute the model handler or persist "
        "results."
    ),
    responses={
        404: {
            "description": (
                "The model is unknown, not ready, or has no diagnostic capability."
            )
        },
        422: {
            "description": "The diagnostic request or model-specific input is invalid."
        },
        500: {"description": "The diagnostic capability failed unexpectedly."},
    },
    tags=["Decision Model Diagnostics"],
)
async def diagnose_registered_model(
    api_model_key: str,
    raw_payload: dict = Body(...),
):
    model = get_model_definition_by_api_model_key(api_model_key)
    if model is None or model.implementation_status != "ready":
        return _diagnostic_error(
            status_code=404,
            code="MODEL_NOT_FOUND",
            message="Published model not found.",
            field="api_model_key",
            details={"apiModelKey": api_model_key},
        )

    if model.diagnostic_handler is None:
        return _diagnostic_error(
            status_code=404,
            code="DIAGNOSTIC_NOT_SUPPORTED",
            message="The requested model does not provide a diagnostic capability.",
            field="api_model_key",
            details={"apiModelKey": api_model_key},
        )

    try:
        payload = model.request_model.model_validate(raw_payload)
    except ValidationError as exc:
        raise RequestValidationError(exc.errors()) from exc

    try:
        result = model.diagnostic_handler(payload)
        if isawaitable(result):
            result = await result
    except ValueError as exc:
        return _diagnostic_error(
            status_code=422,
            code="DIAGNOSTIC_INPUT_INVALID",
            message="The diagnostic input is invalid.",
            field="request",
            details={"reason": str(exc)},
        )
    except Exception:
        return _diagnostic_error(
            status_code=500,
            code="DIAGNOSTIC_EXECUTION_ERROR",
            message="The diagnostic capability could not be completed.",
            field=None,
        )

    return {
        "success": True,
        "message": f"{model.display_name} diagnostic completed successfully.",
        "data": jsonable_encoder(result),
        "error": None,
    }


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

    if model is None or model.implementation_status != "ready":
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
