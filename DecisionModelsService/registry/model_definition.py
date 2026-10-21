from dataclasses import dataclass, field
from typing import Any, Callable

from pydantic import BaseModel

MODEL_KINDS = {"issue", "criteriaWeighting"}
DEFAULT_RESULT_STRUCTURE_KEY = "ranking"
DEFAULT_RESULT_STRUCTURE_VERSION = 1
# Result contracts currently implemented by the Decision Plugins runtime.
# This is contract metadata only; model definitions remain auto-discovered.
SUPPORTED_RESULT_STRUCTURE_PAIRS = frozenset(
    {
        ("ranking", 1),
        ("sorting", 1),
    }
)


@dataclass(frozen=True)
class ModelDefinition:
    """Ficha única de un modelo ejecutable y documentable por DecisionModelsService."""

    api_model_key: str
    api_endpoint_path: str
    request_model: type[BaseModel]
    handler: Callable[[Any], Any]
    display_name: str
    small_description: str
    extended_description: str
    model_section: dict[str, Any] = field(default_factory=dict)
    request_examples: dict[str, dict[str, Any]] = field(default_factory=dict)
    response_examples: dict[str, dict[str, Any]] = field(default_factory=dict)
    implementation_status: str = "ready"

    more_info_url: str | None = None
    model_kind: str = "issue"
    requires_homogeneous_expression_domains: bool = False
    supports_creator_criteria_weighting: bool = False
    supports_expert_criteria_weighting: bool = False

    evaluation_structure_key: str = ""
    result_structure_key: str | None = None
    result_structure_version: int | None = None
    supports_consensus: bool = False
    supports_consensus_simulation: bool = False
    # Separate model permission; default closed and independent of readiness.
    issue_execution_authorized: bool = False
    is_multi_criteria: bool | None = None
    uses_criteria_weights: bool = False
    uses_expert_weights: bool = False
    uses_fuzzy_criteria_weights: bool = False
    uses_criterion_types: bool = False

    supported_expression_domains: list[dict[str, Any]] = field(default_factory=list)
    parameters: list[dict[str, Any]] = field(default_factory=list)

    def __post_init__(self) -> None:
        """Valida el contrato interno mínimo de metadata."""

        if self.implementation_status not in {"ready", "scaffold"}:
            raise ValueError(
                f"ModelDefinition '{self.api_model_key}' has invalid "
                f"implementation_status '{self.implementation_status}'."
            )

        if not isinstance(self.model_section, dict):
            raise ValueError(
                f"ModelDefinition '{self.api_model_key}' requires model_section to be a dict."
            )

        if self.model_section:
            for key in ("whatItDoes", "whenToUse"):
                value = self.model_section.get(key)
                if not isinstance(value, str) or not value.strip():
                    raise ValueError(
                        f"ModelDefinition '{self.api_model_key}' requires model_section.{key} "
                        "to be a non-empty string."
                    )

            for key in ("advantages", "limitations"):
                values = self.model_section.get(key)
                if not isinstance(values, list):
                    raise ValueError(
                        f"ModelDefinition '{self.api_model_key}' requires model_section.{key} "
                        "to be a list."
                    )

                if any(not isinstance(value, str) or not value.strip() for value in values):
                    raise ValueError(
                        f"ModelDefinition '{self.api_model_key}' requires every model_section.{key} "
                        "entry to be a non-empty string."
                    )

        if self.model_kind not in MODEL_KINDS:
            raise ValueError(
                f"ModelDefinition '{self.api_model_key}' requires "
                f"model_kind in {sorted(MODEL_KINDS)}."
            )

        if self.model_kind == "issue":
            if (
                self.result_structure_key is None
                and self.result_structure_version is None
            ):
                object.__setattr__(
                    self, "result_structure_key", DEFAULT_RESULT_STRUCTURE_KEY
                )
                object.__setattr__(
                    self,
                    "result_structure_version",
                    DEFAULT_RESULT_STRUCTURE_VERSION,
                )
            elif (
                self.result_structure_key is None
                or self.result_structure_version is None
            ):
                raise ValueError(
                    f"ModelDefinition '{self.api_model_key}' requires both "
                    "result_structure_key and result_structure_version."
                )

            if (
                not isinstance(self.result_structure_key, str)
                or not self.result_structure_key.strip()
                or self.result_structure_key != self.result_structure_key.strip()
            ):
                raise ValueError(
                    f"ModelDefinition '{self.api_model_key}' requires a non-empty, "
                    "trimmed result_structure_key."
                )

            if (
                isinstance(self.result_structure_version, bool)
                or not isinstance(self.result_structure_version, int)
                or self.result_structure_version <= 0
            ):
                raise ValueError(
                    f"ModelDefinition '{self.api_model_key}' requires "
                    "result_structure_version to be a positive integer."
                )

            if (
                self.result_structure_key,
                self.result_structure_version,
            ) not in SUPPORTED_RESULT_STRUCTURE_PAIRS:
                raise ValueError(
                    f"ModelDefinition '{self.api_model_key}' has unsupported "
                    "result_structure pair "
                    f"'{self.result_structure_key}@{self.result_structure_version}'."
                )
        elif (
            self.result_structure_key is not None
            or self.result_structure_version is not None
        ):
            raise ValueError(
                f"ModelDefinition '{self.api_model_key}' must not declare result "
                "structure metadata for a criteriaWeighting model."
            )

        if not isinstance(self.requires_homogeneous_expression_domains, bool):
            raise ValueError(
                f"ModelDefinition '{self.api_model_key}' requires "
                "requires_homogeneous_expression_domains to be boolean."
            )

        if not isinstance(self.issue_execution_authorized, bool):
            raise ValueError(
                f"ModelDefinition '{self.api_model_key}' requires boolean "
                "issue_execution_authorized."
            )

        if self.model_kind == "criteriaWeighting" and self.issue_execution_authorized:
            raise ValueError(
                f"ModelDefinition '{self.api_model_key}' must not authorize "
                "issue execution for a criteriaWeighting model."
            )

        if not isinstance(self.evaluation_structure_key, str) or (
            not self.evaluation_structure_key.strip()
        ):
            raise ValueError(
                f"ModelDefinition '{self.api_model_key}' requires "
                "a non-empty evaluation_structure_key."
            )

        if self.model_kind == "criteriaWeighting" and not (
            isinstance(self.supports_creator_criteria_weighting, bool)
            and isinstance(self.supports_expert_criteria_weighting, bool)
        ):
            raise ValueError(
                f"ModelDefinition '{self.api_model_key}' requires boolean "
                "criteria-weighting capability flags."
            )

        if self.model_kind == "criteriaWeighting" and not (
            self.supports_creator_criteria_weighting
            or self.supports_expert_criteria_weighting
        ):
            raise ValueError(
                f"ModelDefinition '{self.api_model_key}' must support creator-side "
                "or expert-side criteria weighting."
            )

        if not isinstance(self.supported_expression_domains, list):
            raise ValueError(
                f"ModelDefinition '{self.api_model_key}' requires "
                "supported_expression_domains to be a list."
            )

        for index, entry in enumerate(self.supported_expression_domains):
            if not isinstance(entry, dict):
                raise ValueError(
                    f"ModelDefinition '{self.api_model_key}' has invalid "
                    f"supported_expression_domains[{index}]: expected dict."
                )

            type_key = str(entry.get("typeKey") or "").strip()
            if not type_key:
                raise ValueError(
                    f"ModelDefinition '{self.api_model_key}' requires "
                    f"supported_expression_domains[{index}].typeKey."
                )

            constraints = entry.get("constraints", {})
            if constraints is not None and not isinstance(constraints, dict):
                raise ValueError(
                    f"ModelDefinition '{self.api_model_key}' requires "
                    f"supported_expression_domains[{index}].constraints to be a dict."
                )
