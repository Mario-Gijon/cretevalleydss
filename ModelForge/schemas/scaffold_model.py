import re

from pydantic import BaseModel, Field, field_validator
from schemas.scaffold_common import ScaffoldedFile


def _is_non_empty_string(value: str) -> bool:
    return isinstance(value, str) and value.strip() != ""


SNAKE_CASE_PATTERN = re.compile(r"^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$")
MODEL_KIND_VALUES = {"issue", "criteriaWeighting"}


class ModelScaffoldPreviewRequest(BaseModel):
    apiModelKey: str
    displayName: str
    smallDescription: str
    extendedDescription: str
    moreInfoUrl: str | None = None
    modelKind: str
    evaluationStructureKey: str
    supportsConsensus: bool = False
    supportsConsensusSimulation: bool = False
    isMultiCriteria: bool = True
    usesCriteriaWeights: bool = False
    usesExpertWeights: bool = False
    usesFuzzyCriteriaWeights: bool = False
    usesCriterionTypes: bool = False
    supportedExpressionDomains: list[dict] = Field(default_factory=list)
    parameters: list[dict] = Field(default_factory=list)
    includeExamples: bool = True

    @field_validator("apiModelKey")
    @classmethod
    def validate_api_model_key(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("apiModelKey must not be empty")
        if not SNAKE_CASE_PATTERN.fullmatch(stripped):
            raise ValueError("apiModelKey must be snake_case")
        return stripped

    @field_validator("modelKind")
    @classmethod
    def validate_model_kind(cls, value: str) -> str:
        stripped = value.strip()
        if stripped not in MODEL_KIND_VALUES:
            raise ValueError("modelKind must be issue or criteriaWeighting")
        return stripped

    @field_validator(
        "displayName",
        "smallDescription",
        "extendedDescription",
        "evaluationStructureKey",
    )
    @classmethod
    def validate_non_empty_string(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("field must not be empty")
        return stripped

    @field_validator("moreInfoUrl")
    @classmethod
    def validate_more_info_url(cls, value: str | None) -> str | None:
        if value is None:
            return None

        stripped = value.strip()
        return stripped or None

    @field_validator("supportedExpressionDomains")
    @classmethod
    def validate_supported_expression_domains(cls, value: list[dict]) -> list[dict]:
        if not isinstance(value, list):
            raise ValueError("supportedExpressionDomains must be a list of objects")

        normalized = []
        for item in value:
            if not isinstance(item, dict):
                raise ValueError("supportedExpressionDomains must be a list of objects")

            type_key = item.get("typeKey")
            if not _is_non_empty_string(type_key):
                raise ValueError(
                    "supportedExpressionDomains entries must include non-empty typeKey"
                )

            constraints = item.get("constraints", {})
            if constraints is None:
                constraints = {}
            if not isinstance(constraints, dict):
                raise ValueError(
                    "supportedExpressionDomains.constraints must be an object"
                )

            normalized.append(
                {
                    "typeKey": type_key.strip(),
                    "constraints": constraints,
                }
            )

        return normalized

    @field_validator("parameters")
    @classmethod
    def validate_parameters(cls, value: list[dict]) -> list[dict]:
        if not isinstance(value, list):
            raise ValueError("parameters must be a list of objects")
        for item in value:
            if not isinstance(item, dict):
                raise ValueError("parameters must be a list of objects")
            if "type" in item:
                raise ValueError("parameter.type is not supported")
        return value


class ModelScaffoldPreviewResponse(BaseModel):
    service: str
    kind: str
    mode: str
    targetBasePath: str
    files: list[ScaffoldedFile]
