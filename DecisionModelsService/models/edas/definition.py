from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest
from .executor import execute_edas
from .examples import EDAS_REQUEST_EXAMPLES, EDAS_RESPONSE_EXAMPLES

MODEL_DEFINITION = ModelDefinition(
    api_model_key="edas",
    api_endpoint_path="/edas",
    request_model=GenericModelExecutionRequest,
    handler=execute_edas,
    small_description=(
        "Distance-based MCDM method that ranks alternatives according to their "
        "positive and negative distances from the average solution."
    ),
    extended_description=(
        "EDAS evaluates alternatives by comparing each criterion value against "
        "the average solution. Alternatives are rewarded for positive distance "
        "from the average and penalized for negative distance, producing a final "
        "appraisal score under weighted benefit and cost criteria."
    ),
    request_examples=EDAS_REQUEST_EXAMPLES,
    response_examples=EDAS_RESPONSE_EXAMPLES,
    display_name="EDAS",
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
            "EDAS compares each alternative with the average performance of all the alternatives "
            "being considered. For every criterion, it looks at whether an alternative performs "
            "better or worse than that average and takes the importance of the criterion into account.\n\n"
            "Alternatives that show stronger positive differences and fewer important negative "
            "differences receive better overall scores. The result is a ranking that highlights "
            "the options that perform most favourably compared with the general level of the group."
        ),
        "whenToUse": (
            "Use EDAS when you have numerical evaluations for several alternatives and want to "
            "judge their performance relative to what is typical within the current set of options. "
            "It is useful when comparing with the average is more intuitive for the problem than "
            "comparing with a theoretical perfect alternative.\n\n"
            "It may be less appropriate when the average has little meaning for the decision, "
            "when evaluations are mainly qualitative, or when a specific ideal target is central "
            "to the interpretation of the result."
        ),
        "advantages": [
            "Provides a clear ranking based on performance relative to the average.",
            "Takes criterion importance into account.",
            "Supports criteria where either higher or lower values are preferable.",
            "The idea of performing above or below average is relatively easy to explain.",
        ],
        "limitations": [
            "Requires numerical evaluations.",
            "The reference average changes when the set of alternatives changes.",
            "The result depends on the selected criteria and their importance.",
            "It does not explicitly represent uncertainty or linguistic assessments.",
        ],
    },
)
