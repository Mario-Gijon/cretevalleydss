from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest
from .executor import execute_vikor
from .examples import VIKOR_RESPONSE_EXAMPLES


MODEL_DEFINITION = ModelDefinition(
        api_model_key="vikor",
        api_endpoint_path="/vikor",
        request_model=GenericModelExecutionRequest,
        handler=execute_vikor,
        small_description=(
            "Compromise-ranking MCDM method that identifies alternatives closest "
            "to an acceptable group solution."
        ),
        extended_description=(
            "VIKOR is a multi-criteria decision-making method focused on compromise "
            "ranking. It evaluates alternatives according to group utility and individual "
            "regret, producing a ranking that highlights the best compromise solution "
            "under weighted benefit and cost criteria."
        ),
        response_examples=VIKOR_RESPONSE_EXAMPLES,
        display_name="VIKOR",
        more_info_url=None,
        alternative_evaluation_structure_key="alternativeCriteriaMatrix",
        supports_consensus=False,
        is_multi_criteria=True,
        uses_criteria_weights=True,
        uses_expert_weights=False,
        uses_fuzzy_criteria_weights=False,
        uses_criterion_types=True,
        supported_domains=["numericContinuous", "numericDiscrete"],
        parameters=[
            {
                "key": "v",
                "label": "Strategy coefficient",
                "type": "number",
                "scope": "global",
                "parameterStructureKey": "numberGlobal",
                "required": True,
                "default": 0.5,
                "restrictions": {"min": 0, "max": 1, "allowed": None},
            },
        ],
    )
