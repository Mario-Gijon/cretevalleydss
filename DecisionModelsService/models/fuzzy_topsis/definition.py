from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest
from .executor import execute_fuzzy_topsis
from .examples import FUZZY_TOPSIS_RESPONSE_EXAMPLES

MODEL_DEFINITION = ModelDefinition(
    api_model_key="fuzzy_topsis",
    api_endpoint_path="/fuzzy_topsis",
    request_model=GenericModelExecutionRequest,
    handler=execute_fuzzy_topsis,
    small_description=(
        "Fuzzy method based on TOPSIS for handling linguistic, uncertain, or "
        "imprecise expert evaluations."
    ),
    extended_description=(
        "Fuzzy TOPSIS extends the TOPSIS approach to handle fuzzy or linguistic "
        "evaluations. It is useful when expert assessments are uncertain, qualitative, "
        "or expressed through linguistic labels instead of precise numeric values."
    ),
    response_examples=FUZZY_TOPSIS_RESPONSE_EXAMPLES,
    display_name="Fuzzy TOPSIS",
    more_info_url=None,
    model_kind="issue",
    evaluation_structure_key="alternativeCriteriaMatrix",
    supports_consensus=False,
    is_multi_criteria=True,
    uses_criteria_weights=True,
    uses_expert_weights=False,
    uses_fuzzy_criteria_weights=True,
    uses_criterion_types=True,
    supported_domains=["linguistic"],
)
