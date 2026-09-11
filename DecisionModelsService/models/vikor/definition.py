from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest
from .executor import execute_vikor
from .examples import VIKOR_REQUEST_EXAMPLES, VIKOR_RESPONSE_EXAMPLES

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
    request_examples=VIKOR_REQUEST_EXAMPLES,
    response_examples=VIKOR_RESPONSE_EXAMPLES,
    display_name="VIKOR",
    more_info_url=None,
    model_kind="issue",
    requires_homogeneous_expression_domains=False,
    evaluation_structure_key="alternativeCriteriaMatrix",
    supports_consensus=False,
    is_multi_criteria=True,
    uses_criteria_weights=True,
    uses_expert_weights=False,
    uses_fuzzy_criteria_weights=False,
    uses_criterion_types=True,
    supported_expression_domains=[
        {"typeKey": "numericContinuous"},
        {"typeKey": "numericDiscrete"},
    ],
    parameters=[
        {
            "key": "v",
            "label": "Strategy coefficient",
            "valueType": "number",
            "parameterStructureKey": "numberGlobal",
            "required": True,
            "default": 0.5,
            "restrictions": {"min": 0, "max": 1, "allowed": None},
        },
    ],
    model_section={
        "whatItDoes": (
            "VIKOR looks for a compromise solution when no alternative is clearly the best on "
            "every criterion. It considers both the overall performance of an alternative across "
            "the complete decision and its weakest important aspect.\n\n"
            "This balance helps identify alternatives that provide strong general performance "
            "without ignoring an important disadvantage. The result is a ranking focused on "
            "finding an acceptable compromise between overall benefit and the risk of performing "
            "poorly on a particular criterion."
        ),
        "whenToUse": (
            "Use VIKOR when the criteria conflict with each other and you are looking for a "
            "balanced compromise rather than an alternative that simply maximizes an overall "
            "score. It is useful when both general performance and avoiding a serious weakness "
            "should influence the final choice.\n\n"
            "It may be less appropriate when the decision has a clear ideal reference and TOPSIS "
            "is easier to communicate, or when users do not want to configure how strongly the "
            "model should favour collective performance versus individual regret."
        ),
        "advantages": [
            "Focuses explicitly on finding a compromise between conflicting criteria.",
            "Considers both overall performance and the strongest individual disadvantage.",
            "Takes criterion importance into account.",
            "Supports both benefit and cost criteria.",
        ],
        "limitations": [
            "The compromise strategy must be configured according to the decision context.",
            "Its interpretation is less immediate than a simple weighted score.",
            "The final ranking depends on the chosen criteria and weights.",
            "It requires numerical evaluations.",
        ],
    },
)
