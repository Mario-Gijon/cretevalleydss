"""Schemas de entrada para endpoints de modelos de decisión."""

from pydantic import BaseModel, ConfigDict, Field


class RequestSchema(BaseModel):
    """Base de request para permitir campos extra no usados."""

    model_config = ConfigDict(extra="ignore")



class GenericModelExecutionRequest(RequestSchema):
    """Contrato mínimo de ejecución genérica para modelos DSS."""

    modelParameters: dict = Field(default_factory=dict)
    evaluations: list[dict] = Field(default_factory=list)
    context: dict = Field(default_factory=dict)
