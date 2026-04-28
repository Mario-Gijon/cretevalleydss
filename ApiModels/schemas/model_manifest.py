from typing import Any

from pydantic import BaseModel, Field


class ModelParameterRestrictions(BaseModel):
    """Restricciones declarativas de un parámetro de modelo."""

    min: float | int | None = None
    max: float | int | None = None
    step: float | int | None = None
    length: int | str | None = None
    sum: float | int | None = None
    allowed: list[Any] | None = None


class ModelParameter(BaseModel):
    """Parámetro técnico configurable o documentado por un modelo."""

    name: str
    type: str
    default: Any | None = None
    restrictions: ModelParameterRestrictions = Field(
        default_factory=ModelParameterRestrictions
    )


class SupportedDomainInfo(BaseModel):
    """Capacidades declaradas para un tipo de dominio de expresión."""

    enabled: bool
    range: dict[str, float | int | None] | None = None
    minLabels: int | None = None
    maxLabels: int | None = None
    oddOnly: bool | None = None


class SupportedDomains(BaseModel):
    """Dominios de expresión soportados por el modelo."""

    numeric: SupportedDomainInfo | None = None
    linguistic: SupportedDomainInfo | None = None


class CriterionTypesInfo(BaseModel):
    """Valores admitidos para tipos de criterio."""

    canonical: list[str] = Field(default_factory=list)
    aliases: dict[str, str] = Field(default_factory=dict)


class ModelEndpointInfo(BaseModel):
    """Información del endpoint ejecutable de un modelo."""

    method: str
    path: str
    operationId: str


class ModelDocumentationInfo(BaseModel):
    """Textos técnicos de documentación asociados a un modelo."""

    summary: str
    description: str
    moreInfoUrl: str | None = None


class ModelCapabilities(BaseModel):
    """Capacidades técnicas necesarias para integración con Backend."""

    evaluationStructure: str | None = None
    isConsensus: bool | None = None
    isMultiCriteria: bool | None = None
    inputKind: str
    outputKind: str
    supportsScenarios: bool
    supportedDomains: SupportedDomains | None = None


class ModelRequestInfo(BaseModel):
    """Schema y ejemplo de request publicados por ApiModels."""

    schemaName: str
    required: list[str] = Field(default_factory=list)
    jsonSchema: dict[str, Any]
    example: dict[str, Any] | None = None


class ModelResponseInfo(BaseModel):
    """Información de respuesta documentada para un modelo."""

    contract: str = "success/message/data/error"
    dataKeys: list[str] = Field(default_factory=list)
    examples: dict[str, Any] = Field(default_factory=dict)


class ModelSyncInfo(BaseModel):
    """Metadatos para una futura sincronización segura con Backend."""

    safeToCreateIssueModel: bool
    safeTechnicalFields: list[str] = Field(default_factory=list)
    preserveAdminFields: list[str] = Field(default_factory=list)


class ModelManifestEntry(BaseModel):
    """Entrada individual del manifest técnico de modelos."""

    key: str
    displayName: str
    aliases: list[str] = Field(default_factory=list)
    role: str
    status: str
    publicInIssueCatalog: bool
    endpoint: ModelEndpointInfo
    documentation: ModelDocumentationInfo
    capabilities: ModelCapabilities
    parameters: list[ModelParameter] = Field(default_factory=list)
    criterionTypes: CriterionTypesInfo | None = None
    request: ModelRequestInfo
    response: ModelResponseInfo
    sync: ModelSyncInfo


class ManifestResponseData(BaseModel):
    """Payload del endpoint GET /models/manifest."""

    manifestVersion: str
    apiVersion: str
    contract: dict[str, str]
    models: list[ModelManifestEntry]


class ModelManifestResponse(BaseModel):
    """Respuesta de éxito del endpoint de manifest."""

    success: bool
    message: str
    data: ManifestResponseData
