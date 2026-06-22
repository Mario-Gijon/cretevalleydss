from registry.model_definition import ModelDefinition
from schemas.model_requests import CmccRequest
from .executor import execute_cmcc
from .examples import CMCC_RESPONSE_EXAMPLES


MODEL_DEFINITION = ModelDefinition(
        api_model_key="cmcc",
        api_endpoint_path="/cmcc",
        request_model=CmccRequest,
        handler=execute_cmcc,
        small_description=(
            "Auxiliary consensus utility model that adjusts expert opinions according to "
            "linearized consensus constraints."
        ),
        extended_description=(
            "CMCC is an auxiliary consensus utility model that computes adjusted opinions "
            "using linearized consensus constraints. In this system it is used to support "
            "consensus-related workflows and analysis, rather than being exposed as a "
            "standard issue resolution model in the public catalog."
        ),
        response_examples=CMCC_RESPONSE_EXAMPLES,
        display_name="CMCC",
        more_info_url=None,
        model_kind="issue",
        evaluation_structure_key="alternativePairwiseByCriterion",
        supports_consensus=False,
        is_multi_criteria=False,
        uses_criteria_weights=False,
        uses_expert_weights=False,
        uses_fuzzy_criteria_weights=False,
        uses_criterion_types=False,
        supported_domains=[],
        parameters=[
            {
                "key": "eps",
                "label": "Epsilon",
                "scope": "global",
                "parameterStructureKey": "numberGlobal",
                "required": False,
                "default": None,
                "restrictions": {"min": None, "max": None, "allowed": None},
            },
            {
                "key": "mu0",
                "label": "Mu 0",
                "scope": "global",
                "parameterStructureKey": "numberGlobal",
                "required": False,
                "default": None,
                "restrictions": {"min": 0, "max": 1, "allowed": None},
            },
            {
                "key": "lower_bound",
                "label": "Lower bound",
                "scope": "global",
                "parameterStructureKey": "numberGlobal",
                "required": False,
                "default": 0,
                "restrictions": {"min": None, "max": None, "allowed": None},
            },
            {
                "key": "upper_bound",
                "label": "Upper bound",
                "scope": "global",
                "parameterStructureKey": "numberGlobal",
                "required": False,
                "default": 1,
                "restrictions": {"min": None, "max": None, "allowed": None},
            },
        ],
    )
