from dataclasses import dataclass, field
from typing import Any, Callable

from pydantic import BaseModel


@dataclass(frozen=True)
class ModelDefinition:
    """Ficha única de un modelo ejecutable y documentable por DecisionModelsService."""

    api_model_key: str
    api_endpoint_path: str
    request_model: type[BaseModel]
    handler: Callable[[Any], Any]
    summary: str
    description: str
    display_name: str

    small_description: str
    extend_description: str
    response_examples: dict[str, dict[str, Any]] = field(default_factory=dict)

    more_info_url: str | None = None
    is_issue_model: bool = True
    is_criteria_weighting_model: bool = False
    supports_creator_criteria_weighting: bool = False
    supports_expert_criteria_weighting: bool = False

    alternative_evaluation_structure_key: str | None = None
    criteria_weighting_structure_key: str | None = None
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

        if self.is_issue_model and not self.alternative_evaluation_structure_key:
            raise ValueError(
                f"ModelDefinition '{self.api_model_key}' requires "
                "alternative_evaluation_structure_key for issue models."
            )

        if (
            self.is_criteria_weighting_model
            and not self.criteria_weighting_structure_key
        ):
            raise ValueError(
                f"ModelDefinition '{self.api_model_key}' requires "
                "criteria_weighting_structure_key for criteria weighting models."
            )

        if self.is_criteria_weighting_model and not (
            isinstance(self.supports_creator_criteria_weighting, bool)
            and isinstance(self.supports_expert_criteria_weighting, bool)
        ):
            raise ValueError(
                f"ModelDefinition '{self.api_model_key}' requires boolean "
                "criteria-weighting capability flags."
            )

        if self.is_criteria_weighting_model and not (
            self.supports_creator_criteria_weighting
            or self.supports_expert_criteria_weighting
        ):
            raise ValueError(
                f"ModelDefinition '{self.api_model_key}' must support creator-side "
                "or expert-side criteria weighting."
            )
