import re
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from schemas.scaffold_common import ScaffoldedFile
from schemas.scaffold_model_package import (
    AppliedScaffoldFile,
    ScaffoldValidationResult,
)


TYPE_KEY_PATTERN = re.compile(r"^[a-z][A-Za-z0-9]*$")
FAMILY_OPTIONS = {"numeric", "linguistic", "custom"}
CORE_EXPRESSION_DOMAIN_TYPE_KEYS = {
    "numericContinuous",
    "numericDiscrete",
    "linguisticOrdinal",
    "linguisticFuzzy",
}


def _is_plain_object(value: Any) -> bool:
    return isinstance(value, dict)


class ExpressionDomainTypeScaffoldDefinition(BaseModel):
    typeKey: str
    label: str
    description: str
    family: Literal["numeric", "linguistic", "custom"]
    constraintExample: dict = Field(default_factory=dict)
    definitionExample: dict = Field(default_factory=dict)
    evaluationExample: Any = None

    @field_validator("typeKey")
    @classmethod
    def validate_type_key(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("typeKey must not be empty")
        if not TYPE_KEY_PATTERN.fullmatch(stripped):
            raise ValueError("typeKey must use lower camelCase")
        if stripped in CORE_EXPRESSION_DOMAIN_TYPE_KEYS:
            raise ValueError("typeKey must not reuse a core expression domain type")
        return stripped

    @field_validator("label", "description")
    @classmethod
    def validate_non_empty_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("field must not be empty")
        return stripped

    @field_validator("family")
    @classmethod
    def validate_family(cls, value: str) -> str:
        stripped = value.strip()
        if stripped not in FAMILY_OPTIONS:
            raise ValueError("family must be numeric, linguistic, or custom")
        return stripped

    @field_validator("constraintExample", "definitionExample")
    @classmethod
    def validate_object_example(cls, value: dict) -> dict:
        if not _is_plain_object(value):
            raise ValueError("field must be a JSON object")
        return value


class ExpressionDomainTypeScaffoldPreviewRequest(BaseModel):
    expressionDomainType: ExpressionDomainTypeScaffoldDefinition


class ExpressionDomainTypeScaffoldApplyRequest(
    ExpressionDomainTypeScaffoldPreviewRequest
):
    runFullFrontendBuild: bool = False


class ExpressionDomainTypePreviewItem(BaseModel):
    kind: Literal["expression-domain-type"] = "expression-domain-type"
    key: str
    status: Literal["toGenerate"] = "toGenerate"
    reason: str | None = None
    targetBasePath: str | None = None
    files: list[ScaffoldedFile] = Field(default_factory=list)


class ExpressionDomainTypeScaffoldPreviewResponse(BaseModel):
    service: Literal["model-forge"] = "model-forge"
    kind: Literal["expression-domain-type"] = "expression-domain-type"
    mode: Literal["preview"] = "preview"
    backendTargetBasePath: str
    frontendTargetBasePath: str
    items: list[ExpressionDomainTypePreviewItem] = Field(default_factory=list)
    validation: ScaffoldValidationResult = Field(
        default_factory=lambda: ScaffoldValidationResult(status="skipped")
    )


class ExpressionDomainTypeApplyItem(BaseModel):
    kind: Literal["expression-domain-type"] = "expression-domain-type"
    key: str
    status: Literal["written"] = "written"
    reason: str | None = None
    targetBasePath: str | None = None
    writtenFiles: list[AppliedScaffoldFile] = Field(default_factory=list)
    skippedFiles: list[AppliedScaffoldFile] = Field(default_factory=list)


class ExpressionDomainTypeScaffoldApplyResponse(BaseModel):
    service: Literal["model-forge"] = "model-forge"
    kind: Literal["expression-domain-type"] = "expression-domain-type"
    mode: Literal["apply"] = "apply"
    backendTargetBasePath: str
    frontendTargetBasePath: str
    items: list[ExpressionDomainTypeApplyItem] = Field(default_factory=list)
    validation: ScaffoldValidationResult = Field(
        default_factory=lambda: ScaffoldValidationResult(status="skipped")
    )
