from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest
from .executor import execute_borda
from .examples import BORDA_REQUEST_EXAMPLES, BORDA_RESPONSE_EXAMPLES


MODEL_DEFINITION = ModelDefinition(
        api_model_key="borda",
        api_endpoint_path="/borda",
        request_model=GenericModelExecutionRequest,
        handler=execute_borda,
        small_description=(
            "Voting-based ranking method that converts collective preferences into point "
            "scores to produce a simple and interpretable group order."
        ),
        extended_description=(
            "Borda is a simple ranking method that assigns points to alternatives according "
            "to their relative positions in the collective evaluation. It is useful when a "
            "clear and interpretable group ranking is needed without requiring criterion "
            "weights."
        ),
        request_examples=BORDA_REQUEST_EXAMPLES,
        response_examples=BORDA_RESPONSE_EXAMPLES,
        display_name="BORDA",
        more_info_url=None,
        model_kind="issue",
        evaluation_structure_key="alternativeCriteriaMatrix",
        supports_consensus=False,
        is_multi_criteria=True,
        uses_criteria_weights=False,
        uses_expert_weights=False,
        uses_fuzzy_criteria_weights=False,
        uses_criterion_types=False,
        supported_domains=["numericContinuous", "numericDiscrete"],
    )
