from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest
from .executor import execute_waspas
from .examples import WASPAS_RESPONSE_EXAMPLES


MODEL_DEFINITION = ModelDefinition(
        api_model_key="waspas",
        api_endpoint_path="/waspas",
        request_model=GenericModelExecutionRequest,
        handler=execute_waspas,
        small_description=(
            "Hybrid MCDM method that combines weighted sum and weighted product "
            "aggregation into a single ranking score."
        ),
        extended_description=(
            "WASPAS combines the Weighted Sum Model and the Weighted Product Model. "
            "It evaluates alternatives by blending additive and multiplicative utility "
            "scores through a configurable lambda coefficient, supporting weighted "
            "benefit and cost criteria."
        ),
        response_examples=WASPAS_RESPONSE_EXAMPLES,
        display_name="WASPAS",
        more_info_url=None,
        model_kind="issue",
        evaluation_structure_key="alternativeCriteriaMatrix",
        supports_consensus=False,
        is_multi_criteria=True,
        uses_criteria_weights=True,
        uses_expert_weights=True,
        uses_fuzzy_criteria_weights=False,
        uses_criterion_types=True,
        supported_domains=["numericContinuous", "numericDiscrete"],
        parameters=[
            {
                "key": "lambda",
                "label": "Lambda",
                "scope": "global",
                "parameterStructureKey": "numberGlobal",
                "required": True,
                "default": 0.5,
                "restrictions": {"min": 0, "max": 1, "allowed": None},
            },
        ],
    )
