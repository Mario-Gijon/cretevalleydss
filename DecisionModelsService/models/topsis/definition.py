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
            "TOPSIS ranks alternatives by comparing them with two reference situations: an "
            "ideal option with the most desirable characteristics and an undesirable option "
            "representing the opposite situation. A good alternative should be close to the "
            "ideal reference while remaining far from the undesirable one.\n\n"
            "The model considers the importance of each criterion and combines the different "
            "performances into a final score. The result is a ranking that represents the best "
            "overall compromise rather than simply selecting the option that is best on one "
            "individual criterion."
        ),
        "whenToUse": (
            "Use TOPSIS when several alternatives must be compared using numerical information "
            "from multiple criteria with different levels of importance. It is particularly "
            "suitable when the idea of looking for an option close to an ideal overall solution "
            "is meaningful for the decision.\n\n"
            "It may be less appropriate when evaluations are mainly expressed through uncertain "
            "or linguistic judgments. In that situation, Fuzzy TOPSIS or 2-Tuple TOPSIS may "
            "represent the information more naturally."
        ),
        "advantages": [
            "Produces a clear ranking of the alternatives.",
            "Takes the importance of each criterion into account.",
            "Considers both desirable and undesirable reference solutions.",
            "Supports criteria where higher or lower values may be preferable.",
        ],
        "limitations": [
            "Requires numerical evaluations.",
            "The result depends on the selected criteria and their weights.",
            "Changes in the available alternatives can affect the reference solutions and ranking.",
            "It does not directly represent uncertainty in expert assessments.",
        ],
    },
)
