from typing import Literal

from pydantic import BaseModel, Field


class CatalogParameterStructureItem(BaseModel):
    key: str
    status: Literal["ready", "partial"]
    backendExists: bool
    frontendExists: bool
    implementationStatus: Literal["ready", "scaffold", "invalid"] = "ready"
    available: bool


class CatalogEvaluationStructureItem(BaseModel):
    key: str
    stage: Literal["alternativeEvaluation", "criteriaWeighting"] | None
    stageConstant: str | None
    status: Literal["ready", "partial"]
    backendExists: bool
    frontendExists: bool
    implementationStatus: Literal["ready", "scaffold", "invalid"] = "ready"
    availableForAlternativeEvaluation: bool
    availableForCriteriaWeighting: bool


class ScaffoldCatalogResponse(BaseModel):
    service: Literal["model-forge"] = "model-forge"
    kind: Literal["scaffold-catalog"] = "scaffold-catalog"
    parameterStructures: list[CatalogParameterStructureItem] = Field(
        default_factory=list
    )
    evaluationStructures: list[CatalogEvaluationStructureItem] = Field(
        default_factory=list
    )
