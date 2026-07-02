from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest
from .executor import execute_marcos
from .examples import MARCOS_REQUEST_EXAMPLES, MARCOS_RESPONSE_EXAMPLES

MODEL_DEFINITION = ModelDefinition(
    api_model_key="marcos",
    api_endpoint_path="/marcos",
    request_model=GenericModelExecutionRequest,
    handler=execute_marcos,
    small_description=(
        "Compromise-based MCDM method that evaluates alternatives through their utility "
        "relative to ideal and anti-ideal reference solutions."
    ),
    extended_description=(
        "MARCOS is a multi-criteria decision-making method that evaluates each "
        "alternative according to its utility relative to ideal and anti-ideal "
        "solutions. It supports direct crisp decision matrices with criterion "
        "weights and max/min criteria."
    ),
    request_examples=MARCOS_REQUEST_EXAMPLES,
    response_examples=MARCOS_RESPONSE_EXAMPLES,
    display_name="MARCOS",
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
