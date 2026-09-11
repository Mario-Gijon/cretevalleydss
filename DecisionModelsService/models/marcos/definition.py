from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest
from .executor import execute_marcos
from .examples import MARCOS_REQUEST_EXAMPLES, MARCOS_RESPONSE_EXAMPLES

MODEL_DEFINITION = ModelDefinition(
    api_model_key="marcos",
    api_endpoint_path="/marcos",
    request_model=GenericModelExecutionRequest,
    handler=execute_marcos,
    small_description=(
        "Compromise-based MCDM method that evaluates alternatives through their utility "
        "relative to ideal and anti-ideal reference solutions."
    ),
    extended_description=(
        "MARCOS is a multi-criteria decision-making method that evaluates each "
        "alternative according to its utility relative to ideal and anti-ideal "
        "solutions. It supports direct crisp decision matrices with criterion "
        "weights and max/min criteria."
    ),
    request_examples=MARCOS_REQUEST_EXAMPLES,
    response_examples=MARCOS_RESPONSE_EXAMPLES,
    display_name="MARCOS",
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
            "MARCOS compares alternatives by considering both a desirable reference and an "
            "undesirable reference. It looks at how useful each alternative is in relation to "
            "these two extremes while also considering the importance of the different criteria.\n\n"
            "This produces an overall utility value for each alternative and a final ranking. "
            "The approach is intended to identify options that maintain a strong overall position "
            "when compared with both the best and the worst possible reference situations."
        ),
        "whenToUse": (
            "Use MARCOS when alternatives are described with numerical values across several "
            "criteria and you want a compromise ranking that considers both desirable and "
            "undesirable reference points. It is suitable when criteria have different levels "
            "of importance and may represent either benefits or costs.\n\n"
            "It may be less appropriate when the assessments are mainly linguistic or uncertain, "
            "or when users need a simpler ranking method whose calculation is easier to explain "
            "to a non-technical audience."
        ),
        "advantages": [
            "Considers both desirable and undesirable reference situations.",
            "Takes criterion importance into account.",
            "Supports both benefit and cost criteria.",
            "Produces a single overall ranking of the alternatives.",
        ],
        "limitations": [
            "Requires numerical evaluations.",
            "Its internal calculation is less intuitive than simpler scoring methods.",
            "The final ranking depends on the selected criteria and their importance.",
            "It does not explicitly model uncertainty in the input evaluations.",
        ],
    },
)
