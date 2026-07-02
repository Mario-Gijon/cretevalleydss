from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest
from .executor import execute_aras
from .examples import ARAS_REQUEST_EXAMPLES, ARAS_RESPONSE_EXAMPLES


MODEL_DEFINITION = ModelDefinition(
        api_model_key="aras",
        api_endpoint_path="/aras",
        request_model=GenericModelExecutionRequest,
        handler=execute_aras,
        small_description=(
            "Utility-ratio method that compares each alternative against an optimal "
            "reference using normalized weighted criteria."
        ),
        extended_description=(
            "ARAS evaluates alternatives through an additive utility ratio approach. "
            "It normalizes the decision matrix, applies criterion weights, and compares "
            "each alternative with an optimal reference alternative to produce a final "
            "ranking."
        ),
        request_examples=ARAS_REQUEST_EXAMPLES,
        response_examples=ARAS_RESPONSE_EXAMPLES,
        display_name="ARAS",
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
