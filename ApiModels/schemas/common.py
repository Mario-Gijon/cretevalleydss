from typing import Any

from pydantic import BaseModel, Field


class ApiError(BaseModel):
    """Detalle estándar de error para la API de modelos."""

    code: str = Field(
        ...,
        description="Código estable del error.",
        examples=["MODEL_EXECUTION_ERROR"],
    )
    field: str | None = Field(
        default=None,
        description="Campo relacionado con el error, si aplica.",
    )
    details: Any | None = Field(
        default=None,
        description="Detalles adicionales del error, si aplica.",
    )


class ModelExecutionResponse(BaseModel):
    """Respuesta estándar de ejecución para los endpoints de modelos."""

    success: bool = Field(..., description="Indica si la ejecución terminó correctamente.")
    message: str = Field(
        ...,
        description="Mensaje descriptivo del resultado de la ejecución.",
        examples=["Topsis executed successfully"],
    )
    data: Any | None = Field(
        default=None,
        description="Payload específico devuelto por el modelo cuando aplica.",
    )
    error: ApiError | None = Field(
        default=None,
        description="Información estructurada del error cuando success es false.",
    )
