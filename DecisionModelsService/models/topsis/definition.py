from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest
from .executor import execute_topsis
from .examples import TOPSIS_REQUEST_EXAMPLES, TOPSIS_RESPONSE_EXAMPLES


MODEL_DEFINITION = ModelDefinition(
        api_model_key="topsis",
        api_endpoint_path="/topsis",
        request_model=GenericModelExecutionRequest,
        handler=execute_topsis,
        small_description=(
            "Distance-based MCDM method that selects the best compromise alternative by "
            "measuring closeness to ideal and anti-ideal solutions."
        ),
        extended_description=(
            "TOPSIS ranks alternatives by comparing each one with an ideal solution "
            "and an anti-ideal solution. It uses criterion weights and max/min criterion "
            "types to identify the alternative with the best compromise between closeness "
            "to the ideal and distance from the worst reference solution."
        ),
        request_examples=TOPSIS_REQUEST_EXAMPLES,
        response_examples=TOPSIS_RESPONSE_EXAMPLES,
        display_name="TOPSIS",
        more_info_url=None,
        alternative_evaluation_structure_key="alternativeCriteriaMatrix",
        supports_consensus=False,
        is_multi_criteria=True,
        uses_criteria_weights=True,
        uses_expert_weights=False,
        uses_fuzzy_criteria_weights=False,
        uses_criterion_types=True,
        supported_domains=["numericContinuous", "numericDiscrete"],
    )
