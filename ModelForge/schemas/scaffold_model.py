import re

from pydantic import BaseModel, Field, field_validator


def _is_non_empty_string(value: str) -> bool:
    return isinstance(value, str) and value.strip() != ""


SNAKE_CASE_PATTERN = re.compile(r"^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$")


class ModelScaffoldPreviewRequest(BaseModel):
    apiModelKey: str
    displayName: str
    smallDescription: str
    extendedDescription: str
    alternativeEvaluationStructureKey: str
    supportsConsensus: bool = False
    supportsConsensusSimulation: bool = False
    isMultiCriteria: bool = True
    usesCriteriaWeights: bool = False
    usesExpertWeights: bool = False
    usesFuzzyCriteriaWeights: bool = False
    usesCriterionTypes: bool = False
    supportedDomains: list[str] = Field(default_factory=list)
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

    @field_validator(
        "displayName",
        "smallDescription",
        "extendedDescription",
        "alternativeEvaluationStructureKey",
    )
    @classmethod
    def validate_non_empty_string(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("field must not be empty")
        return stripped

    @field_validator("supportedDomains")
    @classmethod
    def validate_supported_domains(cls, value: list[str]) -> list[str]:
        if not isinstance(value, list):
            raise ValueError("supportedDomains must be a list of strings")
        normalized = []
        for item in value:
            if not _is_non_empty_string(item):
                raise ValueError("supportedDomains must be a list of strings")
            normalized.append(item.strip())
        return normalized

    @field_validator("parameters")
    @classmethod
    def validate_parameters(cls, value: list[dict]) -> list[dict]:
        if not isinstance(value, list):
            raise ValueError("parameters must be a list of objects")
        for item in value:
            if not isinstance(item, dict):
                raise ValueError("parameters must be a list of objects")
        return value


class ScaffoldedFile(BaseModel):
    path: str
    content: str


class ModelScaffoldPreviewResponse(BaseModel):
    service: str
    kind: str
    mode: str
    targetBasePath: str
    files: list[ScaffoldedFile]
