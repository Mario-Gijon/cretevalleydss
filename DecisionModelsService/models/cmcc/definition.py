from registry.model_definition import ModelDefinition
from schemas.model_requests import CmccRequest
from .executor import execute_cmcc
from .examples import CMCC_RESPONSE_EXAMPLES


MODEL_DEFINITION = ModelDefinition(
        api_model_key="cmcc",
        api_endpoint_path="/cmcc",
        request_model=CmccRequest,
        handler=execute_cmcc,
        summary="Execute CMCC",
        description=("Executes the CMCC model using linearized consensus constraints."),
        small_description=(
            "Auxiliary consensus utility model that adjusts expert opinions according to "
            "linearized consensus constraints."
        ),
        extend_description=(
            "CMCC is an auxiliary consensus utility model that computes adjusted opinions "
            "using linearized consensus constraints. In this system it is used to support "
            "consensus-related workflows and analysis, rather than being exposed as a "
            "standard issue resolution model in the public catalog."
        ),
        response_examples=CMCC_RESPONSE_EXAMPLES,
        display_name="CMCC",
        more_info_url=None,
        is_issue_model=False,
        alternative_evaluation_structure_key=None,
        supports_consensus=False,
        is_multi_criteria=None,
        uses_criteria_weights=False,
        uses_expert_weights=False,
        uses_fuzzy_criteria_weights=False,
        uses_criterion_types=False,
        supported_domains=[],
        parameters=[
            {
                "key": "eps",
                "label": "Epsilon",
                "type": "number",
                "scope": "global",
                "parameterStructureKey": "numberGlobal",
                "required": False,
                "default": None,
                "restrictions": {"min": None, "max": None, "allowed": None},
            },
            {
                "key": "mu0",
                "label": "Mu 0",
                "type": "number",
                "scope": "global",
                "parameterStructureKey": "numberGlobal",
                "required": False,
                "default": None,
                "restrictions": {"min": 0, "max": 1, "allowed": None},
            },
            {
                "key": "lower_bound",
                "label": "Lower bound",
                "type": "number",
                "scope": "global",
                "parameterStructureKey": "numberGlobal",
                "required": False,
                "default": 0,
                "restrictions": {"min": None, "max": None, "allowed": None},
            },
            {
                "key": "upper_bound",
                "label": "Upper bound",
                "type": "number",
                "scope": "global",
                "parameterStructureKey": "numberGlobal",
                "required": False,
                "default": 1,
                "restrictions": {"min": None, "max": None, "allowed": None},
            },
        ],
    )
