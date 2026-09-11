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
    model_section={
        "whatItDoes": (
            "ARAS compares several alternatives by looking at how well each one performs "
            "across the criteria of the decision. It considers the importance of each "
            "criterion and compares the alternatives with an ideal reference that represents "
            "the best achievable combination of results.\n\n"
            "The final result is a ranking in which alternatives with a better overall "
            "performance appear higher. This makes ARAS useful when the objective is to "
            "identify which option offers the strongest overall balance across several "
            "measurable factors."
        ),
        "whenToUse": (
            "Use ARAS when you have several alternatives evaluated with numerical values and "
            "you want a clear overall ranking. It is especially appropriate when some criteria "
            "are more important than others and when you can identify whether higher or lower "
            "values are preferable for each criterion.\n\n"
            "It may be less suitable when the evaluations are mainly qualitative or uncertain, "
            "or when experts prefer to express their opinions with linguistic terms instead "
            "of numerical values."
        ),
        "advantages": [
            "Produces a clear ranking of the available alternatives.",
            "Takes the importance of each criterion into account.",
            "Can work with both criteria to maximize and criteria to minimize.",
            "Provides an intuitive comparison with an ideal reference.",
        ],
        "limitations": [
            "Requires the evaluations to be expressed numerically.",
            "The result depends on the criteria and importance values chosen for the problem.",
            "Poor or inconsistent input data can influence the final ranking.",
            "It does not explicitly model uncertainty in expert evaluations.",
        ],
    },
)
