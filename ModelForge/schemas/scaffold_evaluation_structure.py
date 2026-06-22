import re

from pydantic import BaseModel, field_validator

from schemas.scaffold_common import ScaffoldedFile


EVALUATION_STRUCTURE_KEY_PATTERN = re.compile(r"^[a-z][A-Za-z0-9]*$")
PASCAL_CASE_PATTERN = re.compile(r"^[A-Z][A-Za-z0-9]*$")
JS_IDENTIFIER_PATTERN = re.compile(r"^[A-Za-z_$][A-Za-z0-9_$]*$")


class EvaluationStructureScaffoldPreviewRequest(BaseModel):
    evaluationStructureKey: str
    stageConstant: str = "ALTERNATIVE_EVALUATION"
    componentName: str | None = None
    backendStructureExportName: str | None = None

    @field_validator("evaluationStructureKey")
    @classmethod
    def validate_evaluation_structure_key(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("evaluationStructureKey must not be empty")
        if not EVALUATION_STRUCTURE_KEY_PATTERN.fullmatch(stripped):
            raise ValueError(
                "evaluationStructureKey must use the existing lower camelCase style"
            )
        return stripped

    @field_validator("stageConstant")
    @classmethod
    def validate_stage_constant(cls, value: str) -> str:
        stripped = value.strip()
        if stripped not in {"ALTERNATIVE_EVALUATION", "CRITERIA_WEIGHTING"}:
            raise ValueError(
                "stageConstant must be ALTERNATIVE_EVALUATION or CRITERIA_WEIGHTING"
            )
        return stripped

    @field_validator("componentName")
    @classmethod
    def validate_component_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not PASCAL_CASE_PATTERN.fullmatch(stripped):
            raise ValueError("componentName must be PascalCase")
        return stripped

    @field_validator("backendStructureExportName")
    @classmethod
    def validate_js_identifier(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not JS_IDENTIFIER_PATTERN.fullmatch(stripped):
            raise ValueError("field must be a valid JS identifier")
        return stripped


class EvaluationStructureScaffoldPreviewResponse(BaseModel):
    service: str
    kind: str
    mode: str
    backendTargetBasePath: str
    frontendTargetBasePath: str
    files: list[ScaffoldedFile]
