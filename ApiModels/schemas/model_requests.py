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


class BwmExpertData(RequestSchema):
    """Preferencias de un experto para BWM."""

    mic: list[float] = Field(
        default_factory=list,
        description="Comparaciones Best-to-Others del experto.",
    )
    lic: list[float] = Field(
        default_factory=list,
        description="Comparaciones Others-to-Worst del experto.",
    )


class BwmRequest(RequestSchema):
    """Entrada del endpoint `/bwm`."""

    model_config = ConfigDict(
        extra="ignore",
        json_schema_extra={
            "example": {
                "experts_data": {
                    "expert_1": {"mic": [1, 3, 5], "lic": [5, 3, 1]},
                    "expert_2": {"mic": [1, 4, 7], "lic": [7, 4, 1]},
                },
                "eps_penalty": 1.0,
            }
        },
    )

    experts_data: dict[str, BwmExpertData] = Field(
        default_factory=dict,
        description="Información de todos los expertos participantes.",
    )
    eps_penalty: float = Field(
        default=1,
        description="Penalización epsilon usada por BWM.",
    )


class CmccRequest(RequestSchema):
    """Entrada del endpoint `/cmcc`."""

    model_config = ConfigDict(
        extra="ignore",
        json_schema_extra={
            "example": {
                "o": [0.9, 0.8, 0.4, 0.6, 0.7],
                "c": [1.0, 1.2, 2.0, 1.5, 1.0],
                "omega": [0.2, 0.2, 0.2, 0.2, 0.2],
                "w": [0.1, 0.25, 0.25, 0.25, 0.15],
                "eps": 0.1,
                "mu0": 0.85,
                "lower_bound": 0.0,
                "upper_bound": 1.0,
            }
        },
    )

    o: list[float] = Field(
        ...,
        description="Opiniones originales de los expertos.",
    )
    c: list[float] = Field(
        ...,
        description="Coste asociado al ajuste de cada experto.",
    )
    omega: list[float] = Field(
        ...,
        description="Pesos de agregación para la opinión colectiva.",
    )
    w: list[float] = Field(
        ...,
        description="Pesos para calcular el nivel de consenso.",
    )
    eps: float = Field(
        ...,
        description="Desviación máxima permitida respecto a la opinión colectiva.",
    )
    mu0: float = Field(
        ...,
        description="Umbral mínimo requerido para el consenso.",
    )
    lower_bound: float = Field(
        default=0.0,
        description="Límite inferior de las opiniones ajustadas.",
    )
    upper_bound: float = Field(
        default=1.0,
        description="Límite superior de las opiniones ajustadas.",
    )
