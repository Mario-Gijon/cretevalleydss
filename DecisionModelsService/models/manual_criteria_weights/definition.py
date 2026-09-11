from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest
from .executor import execute_manual_criteria_weights
from .examples import (
    MANUAL_CRITERIA_WEIGHTS_REQUEST_EXAMPLES,
    MANUAL_CRITERIA_WEIGHTS_RESPONSE_EXAMPLES,
)

MODEL_DEFINITION = ModelDefinition(
    api_model_key="manual_criteria_weights",
    api_endpoint_path="/manual_criteria_weights",
    request_model=GenericModelExecutionRequest,
    handler=execute_manual_criteria_weights,
    small_description=(
        "Auxiliary weighting service that aggregates expert manual criterion "
        "weights into a single normalized group result."
    ),
    extended_description=(
        "Manual criteria weights is an auxiliary weighting service that reads "
        "completed expert weightsByCriterion payloads and aggregates completed "
        "expert weights into a normalized group result."
    ),
    request_examples=MANUAL_CRITERIA_WEIGHTS_REQUEST_EXAMPLES,
    response_examples=MANUAL_CRITERIA_WEIGHTS_RESPONSE_EXAMPLES,
    display_name="Manual Criteria Weights",
    more_info_url=None,
    model_kind="criteriaWeighting",
    requires_homogeneous_expression_domains=False,
    supports_creator_criteria_weighting=True,
    supports_expert_criteria_weighting=True,
    evaluation_structure_key="manualCriteriaWeights",
    supports_consensus=False,
    is_multi_criteria=True,
    uses_criteria_weights=False,
    uses_expert_weights=False,
    uses_fuzzy_criteria_weights=False,
    uses_criterion_types=False,
    supported_expression_domains=[],
    parameters=[],
    model_section={
        "whatItDoes": (
            "Manual Criteria Weights allows users to state directly how important each criterion "
            "is. Each participant assigns importance values to the criteria, and the system combines "
            "the completed evaluations into a normalized group set of weights.\n\n"
            "These weights are then used by the main decision model when comparing alternatives. "
            "This is therefore a simple and transparent way of defining priorities rather than a "
            "model that ranks the alternatives on its own."
        ),
        "whenToUse": (
            "Use manual weighting when participants already have a clear idea of the relative "
            "importance of the criteria and can express it directly. It is also appropriate when "
            "simplicity and transparency are more important than deriving weights through a more "
            "structured comparison method.\n\n"
            "It may be less suitable when users find it difficult to assign consistent importance "
            "values or when a more systematic weighting procedure such as BWM would help them "
            "express their preferences."
        ),
        "advantages": [
            "Very simple for users to understand.",
            "Provides direct control over the importance assigned to each criterion.",
            "Makes the chosen priorities easy to inspect and explain.",
            "Can combine weights provided by several experts.",
        ],
        "limitations": [
            "Weights depend directly on subjective values entered by users.",
            "Users may find it difficult to judge several importance values consistently.",
            "Small differences in manually assigned weights may not reflect meaningful differences in preference.",
            "It determines criterion importance but does not rank alternatives by itself.",
        ],
    },
)
