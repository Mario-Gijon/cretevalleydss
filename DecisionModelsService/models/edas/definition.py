from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest
from .executor import execute_edas
from .examples import EDAS_REQUEST_EXAMPLES, EDAS_RESPONSE_EXAMPLES

MODEL_DEFINITION = ModelDefinition(
    api_model_key="edas",
    api_endpoint_path="/edas",
    request_model=GenericModelExecutionRequest,
    handler=execute_edas,
    small_description=(
        "Distance-based MCDM method that ranks alternatives according to their "
        "positive and negative distances from the average solution."
    ),
    extended_description=(
        "EDAS evaluates alternatives by comparing each criterion value against "
        "the average solution. Alternatives are rewarded for positive distance "
        "from the average and penalized for negative distance, producing a final "
        "appraisal score under weighted benefit and cost criteria."
    ),
    request_examples=EDAS_REQUEST_EXAMPLES,
    response_examples=EDAS_RESPONSE_EXAMPLES,
    display_name="EDAS",
    more_info_url=None,
    model_kind="issue",
    evaluation_structure_key="alternativeCriteriaMatrix",
    supports_consensus=False,
    is_multi_criteria=True,
    uses_criteria_weights=True,
    uses_expert_weights=False,
    uses_fuzzy_criteria_weights=False,
    uses_criterion_types=True,
    supported_domains=["numericContinuous", "numericDiscrete"],
)
