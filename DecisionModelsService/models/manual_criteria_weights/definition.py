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
        "completed expert weightsByCriterion payloads, averages them by "
        "criterion, and normalizes the final group weights so they sum to one."
    ),
    request_examples=MANUAL_CRITERIA_WEIGHTS_REQUEST_EXAMPLES,
    response_examples=MANUAL_CRITERIA_WEIGHTS_RESPONSE_EXAMPLES,
    display_name="Manual Criteria Weights",
    more_info_url=None,
    model_kind="criteriaWeighting",
    supports_creator_criteria_weighting=True,
    supports_expert_criteria_weighting=True,
    evaluation_structure_key="manualCriteriaWeights",
    supports_consensus=False,
    is_multi_criteria=True,
    uses_criteria_weights=False,
    uses_expert_weights=False,
    uses_fuzzy_criteria_weights=False,
    uses_criterion_types=False,
    supported_domains=[],
    parameters=[],
)
