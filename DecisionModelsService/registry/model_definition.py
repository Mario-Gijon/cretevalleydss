from dataclasses import dataclass, field
from typing import Any, Callable

from pydantic import BaseModel

MODEL_KINDS = {"issue", "criteriaWeighting"}


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
    request_examples: dict[str, dict[str, Any]] = field(default_factory=dict)
    response_examples: dict[str, dict[str, Any]] = field(default_factory=dict)
    implementation_status: str = "ready"

    more_info_url: str | None = None
    model_kind: str = "issue"
    supports_creator_criteria_weighting: bool = False
    supports_expert_criteria_weighting: bool = False

    evaluation_structure_key: str = ""
    supports_consensus: bool = False
    supports_consensus_simulation: bool = False
    is_multi_criteria: bool | None = None
    uses_criteria_weights: bool = False
    uses_expert_weights: bool = False
    uses_fuzzy_criteria_weights: bool = False
    uses_criterion_types: bool = False

    supported_domains: list[str] = field(default_factory=list)
    parameters: list[dict[str, Any]] = field(default_factory=list)

    def __post_init__(self) -> None:
        """Valida el contrato interno mínimo de metadata."""

        if self.implementation_status not in {"ready", "scaffold"}:
            raise ValueError(
                f"ModelDefinition '{self.api_model_key}' has invalid "
                f"implementation_status '{self.implementation_status}'."
            )

        if self.model_kind not in MODEL_KINDS:
            raise ValueError(
                f"ModelDefinition '{self.api_model_key}' requires "
                f"model_kind in {sorted(MODEL_KINDS)}."
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
