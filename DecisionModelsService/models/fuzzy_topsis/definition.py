from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest
from .executor import execute_fuzzy_topsis
from .examples import FUZZY_TOPSIS_REQUEST_EXAMPLES, FUZZY_TOPSIS_RESPONSE_EXAMPLES

MODEL_DEFINITION = ModelDefinition(
    api_model_key="fuzzy_topsis",
    api_endpoint_path="/fuzzy_topsis",
    request_model=GenericModelExecutionRequest,
    handler=execute_fuzzy_topsis,
    small_description=(
        "Fuzzy method based on TOPSIS for handling linguistic, uncertain, or "
        "imprecise expert evaluations."
    ),
    extended_description=(
        "Fuzzy TOPSIS extends the TOPSIS approach to handle fuzzy or linguistic "
        "evaluations. It is useful when expert assessments are uncertain, qualitative, "
        "or expressed through linguistic labels instead of precise numeric values."
    ),
    request_examples=FUZZY_TOPSIS_REQUEST_EXAMPLES,
    response_examples=FUZZY_TOPSIS_RESPONSE_EXAMPLES,
    display_name="Fuzzy TOPSIS",
    more_info_url=None,
    model_kind="issue",
    requires_homogeneous_expression_domains=False,
    evaluation_structure_key="alternativeCriteriaMatrix",
    supports_consensus=False,
    is_multi_criteria=True,
    uses_criteria_weights=True,
    uses_expert_weights=False,
    uses_fuzzy_criteria_weights=True,
    uses_criterion_types=True,
    supported_expression_domains=[
        {
            "typeKey": "linguisticFuzzy",
            "constraints": {
                "membershipFunction": ["triangular"],
            },
        }
    ],
    model_section={
        "whatItDoes": (
            "Fuzzy TOPSIS compares alternatives when the evaluations cannot be expressed "
            "comfortably as exact numbers. Experts can describe performance using linguistic "
            "or approximate assessments, allowing the model to represent the uncertainty that "
            "often exists in real decision problems.\n\n"
            "The method looks for alternatives that are close to the most desirable situation "
            "and far from the least desirable one. It then produces a ranking while preserving "
            "the imprecision contained in the original assessments instead of pretending that "
            "every opinion is perfectly exact."
        ),
        "whenToUse": (
            "Use Fuzzy TOPSIS when experts understand the problem but find it more natural to "
            "describe evaluations with terms such as low, medium or high rather than precise "
            "numbers. It is particularly useful when judgments involve uncertainty, perception "
            "or qualitative knowledge.\n\n"
            "It may be unnecessary when reliable numerical measurements are already available. "
            "In those cases, a conventional numerical method such as TOPSIS can provide a simpler "
            "decision process."
        ),
        "advantages": [
            "Allows uncertain or qualitative evaluations to be represented naturally.",
            "Avoids forcing experts to provide unrealistically precise numerical values.",
            "Takes the importance of the criteria into account.",
            "Produces a clear ranking while retaining information about uncertainty.",
        ],
        "limitations": [
            "Its results can be less intuitive to explain than those of a purely numerical model.",
            "The linguistic scales and fuzzy representations must be defined appropriately.",
            "The final ranking still depends on the criteria, weights and evaluations supplied.",
            "It adds complexity when the available information is already precise and numerical.",
        ],
    },
)
