from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest
from .executor import execute_herrera_viedma
from .examples import HERRERA_VIEDMA_CRP_RESPONSE_EXAMPLES


MODEL_DEFINITION = ModelDefinition(
        api_model_key="herrera_viedma_crp",
        api_endpoint_path="/herrera_viedma_crp",
        request_model=GenericModelExecutionRequest,
        handler=execute_herrera_viedma,
        small_description=(
            "Consensus reaching model for group decisions based on pairwise preference "
            "matrices and iterative agreement improvement."
        ),
        extended_description=(
            "Herrera-Viedma CRP is a consensus reaching process for group decision-making. "
            "It works with pairwise preference matrices provided by experts, measures the "
            "current consensus level, and supports iterative consensus phases until the "
            "required threshold is reached or the process is finalized."
        ),
        response_examples=HERRERA_VIEDMA_CRP_RESPONSE_EXAMPLES,
        display_name="Herrera Viedma CRP",
        more_info_url=None,
        model_kind="issue",
        evaluation_structure_key="alternativePairwiseByCriterion",
        supports_consensus=True,
        supports_consensus_simulation=True,
        is_multi_criteria=False,
        uses_criteria_weights=True,
        uses_expert_weights=False,
        uses_fuzzy_criteria_weights=False,
        uses_criterion_types=False,
        supported_domains=["numericContinuous", "numericDiscrete"],
        parameters=[
            {
                "key": "ag_lq",
                "label": "Agreement interval",
                "scope": "global",
                "parameterStructureKey": "intervalGlobal",
                "required": True,
                "default": [0.3, 0.8],
                "restrictions": {
                    "min": 0,
                    "max": 1,
                    "ordered": "strictIncreasing",
                    "length": None,
                    "allowed": None,
                },
            },
            {
                "key": "ex_lq",
                "label": "Expert interval",
                "scope": "global",
                "parameterStructureKey": "intervalGlobal",
                "required": True,
                "default": [0.5, 1],
                "restrictions": {
                    "min": 0,
                    "max": 1,
                    "ordered": "strictIncreasing",
                    "length": None,
                    "allowed": None,
                },
            },
            {
                "key": "b",
                "label": "B selector",
                "valueType": "number",
                "scope": "global",
                "parameterStructureKey": "selectGlobal",
                "required": True,
                "default": 1,
                "restrictions": {
                    "min": None,
                    "max": None,
                    "allowed": [0.5, 0.7, 0.9, 1],
                },
            },
            {
                "key": "beta",
                "label": "Beta",
                "scope": "global",
                "parameterStructureKey": "numberGlobal",
                "required": True,
                "default": 0.8,
                "restrictions": {"min": 0, "max": 1, "allowed": None},
            },
        ],
    )
