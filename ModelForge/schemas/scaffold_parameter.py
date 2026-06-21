import re

from pydantic import BaseModel, field_validator

from schemas.scaffold_common import ScaffoldedFile


PARAMETER_STRUCTURE_KEY_PATTERN = re.compile(r"^[a-z][A-Za-z0-9]*$")
PASCAL_CASE_PATTERN = re.compile(r"^[A-Z][A-Za-z0-9]*$")
JS_IDENTIFIER_PATTERN = re.compile(r"^[A-Za-z_$][A-Za-z0-9_$]*$")


class ParameterScaffoldPreviewRequest(BaseModel):
    parameterStructureKey: str
    componentName: str | None = None
    backendStructureExportName: str | None = None
    validateFunctionName: str | None = None

    @field_validator("parameterStructureKey")
    @classmethod
    def validate_parameter_structure_key(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("parameterStructureKey must not be empty")
        if not PARAMETER_STRUCTURE_KEY_PATTERN.fullmatch(stripped):
            raise ValueError(
                "parameterStructureKey must use the existing lower camelCase style"
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

    @field_validator("backendStructureExportName", "validateFunctionName")
    @classmethod
    def validate_js_identifier(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not JS_IDENTIFIER_PATTERN.fullmatch(stripped):
            raise ValueError("field must be a valid JS identifier")
        return stripped


class ParameterScaffoldPreviewResponse(BaseModel):
    service: str
    kind: str
    mode: str
    backendTargetBasePath: str
    frontendTargetBasePath: str
    files: list[ScaffoldedFile]
