from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest
from .executor import execute_waspas
from .examples import WASPAS_REQUEST_EXAMPLES, WASPAS_RESPONSE_EXAMPLES

MODEL_DEFINITION = ModelDefinition(
    api_model_key="waspas",
    api_endpoint_path="/waspas",
    request_model=GenericModelExecutionRequest,
    handler=execute_waspas,
    small_description=(
        "Hybrid MCDM method that combines weighted sum and weighted product "
        "aggregation into a single ranking score."
    ),
    extended_description=(
        "WASPAS combines the Weighted Sum Model and the Weighted Product Model. "
        "It evaluates alternatives by blending additive and multiplicative utility "
        "scores through a configurable lambda coefficient, supporting weighted "
        "benefit and cost criteria."
    ),
    request_examples=WASPAS_REQUEST_EXAMPLES,
    response_examples=WASPAS_RESPONSE_EXAMPLES,
    display_name="WASPAS",
    more_info_url=None,
    model_kind="issue",
    requires_homogeneous_expression_domains=False,
    evaluation_structure_key="alternativeCriteriaMatrix",
    supports_consensus=False,
    is_multi_criteria=True,
    uses_criteria_weights=True,
    uses_expert_weights=True,
    uses_fuzzy_criteria_weights=False,
    uses_criterion_types=True,
    supported_expression_domains=[
        {"typeKey": "numericContinuous"},
        {"typeKey": "numericDiscrete"},
    ],
    parameters=[
        {
            "key": "lambda",
            "label": "Lambda",
            "valueType": "number",
            "parameterStructureKey": "numberGlobal",
            "required": True,
            "default": 0.5,
            "restrictions": {"min": 0, "max": 1, "allowed": None},
        },
    ],
    model_section={
        "whatItDoes": (
            "WASPAS evaluates alternatives using two complementary ways of combining their "
            "performance across the criteria. One approach adds the weighted contributions of "
            "the criteria, while the other considers their combined proportional effect. The "
            "model blends both perspectives into a single final score.\n\n"
            "A configurable balance determines how much influence each approach has. This allows "
            "the final ranking to benefit from two different ways of looking at overall performance "
            "instead of relying exclusively on a single aggregation rule."
        ),
        "whenToUse": (
            "Use WASPAS when you have numerical evaluations, criterion importance values and want "
            "a ranking that combines additive and proportional views of performance. It can be a "
            "useful choice when you want a robust general-purpose comparison and neither perspective "
            "should dominate by default.\n\n"
            "It may be less suitable when the evaluations are mainly linguistic or uncertain, or "
            "when there is no clear reason to introduce an additional balance parameter into an "
            "otherwise simple decision."
        ),
        "advantages": [
            "Combines two complementary approaches to evaluating overall performance.",
            "Takes criterion importance into account.",
            "Supports benefit and cost criteria.",
            "Allows the balance between the two aggregation approaches to be adjusted.",
        ],
        "limitations": [
            "Requires numerical evaluations.",
            "The balance parameter adds an additional decision that users must understand.",
            "The ranking still depends on the selected criteria and their importance.",
            "It does not explicitly represent uncertainty in the evaluations.",
        ],
    },
)
