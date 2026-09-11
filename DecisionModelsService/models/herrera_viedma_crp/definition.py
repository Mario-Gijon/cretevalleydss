from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest
from .executor import execute_herrera_viedma
from .examples import (
    HERRERA_VIEDMA_CRP_REQUEST_EXAMPLES,
    HERRERA_VIEDMA_CRP_RESPONSE_EXAMPLES,
)

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
    request_examples=HERRERA_VIEDMA_CRP_REQUEST_EXAMPLES,
    response_examples=HERRERA_VIEDMA_CRP_RESPONSE_EXAMPLES,
    display_name="Herrera Viedma CRP",
    more_info_url=None,
    model_kind="issue",
    requires_homogeneous_expression_domains=False,
    evaluation_structure_key="alternativePairwiseByCriterion",
    supports_consensus=True,
    supports_consensus_simulation=True,
    is_multi_criteria=False,
    uses_criteria_weights=True,
    uses_expert_weights=False,
    uses_fuzzy_criteria_weights=False,
    uses_criterion_types=False,
    supported_expression_domains=[
        {
            "typeKey": "numericContinuous",
            "constraints": {
                "min": 0,
                "max": 1,
            },
        },
    ],
    parameters=[
        {
            "key": "ag_lq",
            "label": "Agreement interval",
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
            "valueType": "number",
            "parameterStructureKey": "numberGlobal",
            "required": True,
            "default": 0.8,
            "restrictions": {"min": 0, "max": 1, "allowed": None},
        },
    ],
    model_section={
        "whatItDoes": (
            "Herrera-Viedma CRP is designed for decisions in which reaching agreement between "
            "several people is important. Instead of immediately combining everyone's opinions "
            "into a final answer, the model measures how similar or different the participants' "
            "preferences are.\n\n"
            "When the group has not reached the required level of agreement, the process can "
            "continue through additional consensus rounds. This allows participants to reconsider "
            "their evaluations and move towards a decision that better represents the group rather "
            "than simply accepting a result despite strong disagreement."
        ),
        "whenToUse": (
            "Use this model when several experts or stakeholders participate and the level of "
            "agreement itself is important. It is particularly useful for collaborative decisions "
            "where participants should have an opportunity to revise their opinions before the "
            "process is considered complete.\n\n"
            "It may be unnecessary for individual decisions, for situations where disagreement is "
            "acceptable, or when the only objective is to calculate a ranking as quickly as possible "
            "without an iterative consensus process."
        ),
        "advantages": [
            "Makes the level of agreement between participants explicit.",
            "Supports additional rounds when consensus is not sufficient.",
            "Helps identify situations where a collective result hides significant disagreement.",
            "Encourages a more collaborative group decision process.",
        ],
        "limitations": [
            "Can require more time and interaction than a one-step decision model.",
            "Participants may need to evaluate their preferences again in additional rounds.",
            "Reaching a higher consensus does not necessarily mean that every participant fully agrees.",
            "It is unnecessary for decisions made by a single person.",
        ],
    },
)
