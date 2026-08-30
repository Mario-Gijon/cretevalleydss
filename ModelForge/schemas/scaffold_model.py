import math
import re

from pydantic import BaseModel, Field, field_validator, model_validator
from schemas.scaffold_common import ScaffoldedFile


def _is_non_empty_string(value: str) -> bool:
    return isinstance(value, str) and value.strip() != ""


SNAKE_CASE_PATTERN = re.compile(r"^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$")
MODEL_KIND_VALUES = {"issue", "criteriaWeighting"}
NUMBER_GLOBAL_VALUE_TYPES = {"number", "integer"}
NUMBER_GLOBAL_RESTRICTION_KEYS = {"min", "max", "allowed"}
NUMBER_GLOBAL_FORBIDDEN_KEYS = {
    "isInteger",
    "numericType",
    "type",
    "minimum",
    "maximum",
    "options",
}


def _is_finite_number(value) -> bool:
    if isinstance(value, bool):
        return False
    if isinstance(value, int):
        return True
    return isinstance(value, float) and math.isfinite(value)


def _is_integer_number(value) -> bool:
    return isinstance(value, int) or (
        isinstance(value, float) and value.is_integer()
    )


def _validate_number_global_parameter(parameter: dict, index: int) -> None:
    prefix = f"parameters[{index}]"
    if not _is_non_empty_string(parameter.get("key")):
        raise ValueError(f"{prefix}.key must be a non-empty string")
    if not _is_non_empty_string(parameter.get("label")):
        raise ValueError(f"{prefix}.label must be a non-empty string")
    value_type = parameter.get("valueType")
    if value_type not in NUMBER_GLOBAL_VALUE_TYPES:
        raise ValueError(
            f"{prefix}.valueType must be number or integer for numberGlobal"
        )
    if not isinstance(parameter.get("required"), bool):
        raise ValueError(f"{prefix}.required must be boolean for numberGlobal")

    forbidden_key = next(
        (key for key in NUMBER_GLOBAL_FORBIDDEN_KEYS if key in parameter),
        None,
    )
    if forbidden_key is not None:
        raise ValueError(f"{prefix}.{forbidden_key} is not supported")

    restrictions = parameter.get("restrictions")
    if not isinstance(restrictions, dict):
        raise ValueError(f"{prefix}.restrictions must be an object")
    if set(restrictions) != NUMBER_GLOBAL_RESTRICTION_KEYS:
        raise ValueError(
            f"{prefix}.restrictions must contain exactly min, max, and allowed"
        )

    minimum = restrictions["min"]
    maximum = restrictions["max"]
    allowed = restrictions["allowed"]
    for field_name, field_value in (("min", minimum), ("max", maximum)):
        if field_value is not None and not _is_finite_number(field_value):
            raise ValueError(
                f"{prefix}.restrictions.{field_name} must be finite or null"
            )
        if (
            value_type == "integer"
            and field_value is not None
            and not _is_integer_number(field_value)
        ):
            raise ValueError(
                f"{prefix}.restrictions.{field_name} must be an integer"
            )

    if minimum is not None and maximum is not None and minimum > maximum:
        raise ValueError(f"{prefix}.restrictions.min must not exceed max")

    if allowed is not None and not isinstance(allowed, list):
        raise ValueError(f"{prefix}.restrictions.allowed must be a list or null")
    if isinstance(allowed, list):
        seen = set()
        for allowed_value in allowed:
            if not _is_finite_number(allowed_value):
                raise ValueError(
                    f"{prefix}.restrictions.allowed must contain finite numbers"
                )
            if value_type == "integer" and not _is_integer_number(allowed_value):
                raise ValueError(
                    f"{prefix}.restrictions.allowed must contain integers"
                )
            if (
                (minimum is not None and allowed_value < minimum)
                or (maximum is not None and allowed_value > maximum)
            ):
                raise ValueError(
                    f"{prefix}.restrictions.allowed values must satisfy the range"
                )
            if allowed_value in seen:
                raise ValueError(
                    f"{prefix}.restrictions.allowed must not contain duplicates"
                )
            seen.add(allowed_value)

    if "default" not in parameter:
        return

    default = parameter["default"]
    if not _is_finite_number(default):
        raise ValueError(f"{prefix}.default must be a finite number")
    if value_type == "integer" and not _is_integer_number(default):
        raise ValueError(f"{prefix}.default must be an integer")
    if (
        (minimum is not None and default < minimum)
        or (maximum is not None and default > maximum)
        or (isinstance(allowed, list) and allowed and default not in allowed)
    ):
        raise ValueError(f"{prefix}.default must satisfy restrictions")


class ModelScaffoldPreviewRequest(BaseModel):
    apiModelKey: str
    displayName: str
    smallDescription: str
    extendedDescription: str
    moreInfoUrl: str | None = None
    modelKind: str
    evaluationStructureKey: str
    requiresHomogeneousExpressionDomains: bool = False
    supportsCreatorCriteriaWeighting: bool = False
    supportsExpertCriteriaWeighting: bool = False
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

    @model_validator(mode="after")
    def validate_criteria_weighting_capabilities(self):
        if (
            self.modelKind == "criteriaWeighting"
            and self.supportsCreatorCriteriaWeighting is not True
            and self.supportsExpertCriteriaWeighting is not True
        ):
            raise ValueError(
                "criteriaWeighting models must support creator-side or expert-side weighting"
            )

        return self

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
        for index, item in enumerate(value):
            if not isinstance(item, dict):
                raise ValueError("parameters must be a list of objects")
            if "type" in item:
                raise ValueError("parameter.type is not supported")
            if item.get("parameterStructureKey") == "numberGlobal":
                _validate_number_global_parameter(item, index)
        return value


class ModelScaffoldPreviewResponse(BaseModel):
    service: str
    kind: str
    mode: str
    targetBasePath: str
    files: list[ScaffoldedFile]
