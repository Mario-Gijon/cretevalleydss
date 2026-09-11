from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest
from .executor import execute_borda
from .examples import BORDA_REQUEST_EXAMPLES, BORDA_RESPONSE_EXAMPLES

MODEL_DEFINITION = ModelDefinition(
    api_model_key="borda",
    api_endpoint_path="/borda",
    request_model=GenericModelExecutionRequest,
    handler=execute_borda,
    small_description=(
        "Voting-based ranking method that converts collective preferences into point "
        "scores to produce a simple and interpretable group order."
    ),
    extended_description=(
        "Borda is a simple ranking method that assigns points to alternatives according "
        "to their relative positions in the collective evaluation. It is useful when a "
        "clear and interpretable group ranking is needed without requiring criterion "
        "weights."
    ),
    request_examples=BORDA_REQUEST_EXAMPLES,
    response_examples=BORDA_RESPONSE_EXAMPLES,
    display_name="BORDA",
    more_info_url=None,
    model_kind="issue",
    requires_homogeneous_expression_domains=False,
    evaluation_structure_key="alternativeCriteriaMatrix",
    supports_consensus=False,
    is_multi_criteria=True,
    uses_criteria_weights=False,
    uses_expert_weights=False,
    uses_fuzzy_criteria_weights=False,
    uses_criterion_types=True,
    supported_expression_domains=[
        {"typeKey": "numericContinuous"},
        {"typeKey": "numericDiscrete"},
    ],
    model_section={
        "whatItDoes": (
            "Borda creates a collective ranking by giving points to alternatives according "
            "to their relative positions. Instead of focusing on how large the numerical "
            "difference between two alternatives is, it mainly considers which alternatives "
            "are placed ahead of others.\n\n"
            "The points obtained from the different comparisons are combined to produce a "
            "simple final order. The alternative that performs consistently well across the "
            "decision receives more points and therefore appears higher in the ranking."
        ),
        "whenToUse": (
            "Use Borda when the most important objective is to obtain a simple and understandable "
            "ranking and you do not need to assign different importance values to the criteria. "
            "It is useful when relative order matters more than the exact numerical differences "
            "between alternatives.\n\n"
            "It may not be the best choice when some criteria are considerably more important "
            "than others, or when the magnitude of the differences between alternatives should "
            "have a strong influence on the final result."
        ),
        "advantages": [
            "Produces a ranking that is easy to understand and communicate.",
            "Does not require criterion weights.",
            "Reduces complex evaluations to a straightforward points-based comparison.",
            "Works well when the relative position of the alternatives is the main concern.",
        ],
        "limitations": [
            "Does not represent differences in importance between criteria.",
            "The size of the difference between two evaluations may be lost when they are converted into positions.",
            "Different evaluation patterns can sometimes lead to similar point totals.",
            "It is less appropriate when precise performance differences are important.",
        ],
    },
)
