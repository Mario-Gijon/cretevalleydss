from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest
from .executor import execute_bwm
from .examples import BWM_REQUEST_EXAMPLES, BWM_RESPONSE_EXAMPLES

MODEL_DEFINITION = ModelDefinition(
    api_model_key="bwm",
    api_endpoint_path="/bwm",
    request_model=GenericModelExecutionRequest,
    handler=execute_bwm,
    small_description=(
        "Auxiliary weighting service that derives criterion weights from best-worst "
        "comparisons provided by experts."
    ),
    extended_description=(
        "Best-Worst Method is an auxiliary weighting service that derives criterion "
        "weights from expert comparisons between the best criterion, the worst "
        "criterion, and the remaining criteria. In this system it supports the "
        "weighting workflow rather than acting as a final issue resolution model."
    ),
    request_examples=BWM_REQUEST_EXAMPLES,
    response_examples=BWM_RESPONSE_EXAMPLES,
    display_name="BWM",
    more_info_url=None,
    model_kind="criteriaWeighting",
    supports_creator_criteria_weighting=True,
    supports_expert_criteria_weighting=True,
    evaluation_structure_key="bestWorstCriteria",
    supports_consensus=False,
    is_multi_criteria=True,
    uses_criteria_weights=False,
    uses_fuzzy_criteria_weights=False,
    uses_criterion_types=False,
    supported_domains=[],
    parameters=[],
)
