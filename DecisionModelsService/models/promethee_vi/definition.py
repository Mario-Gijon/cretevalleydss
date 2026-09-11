from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest
from .executor import execute_promethee_vi
from .examples import PROMETHEE_VI_REQUEST_EXAMPLES, PROMETHEE_VI_RESPONSE_EXAMPLES

MODEL_DEFINITION = ModelDefinition(
    api_model_key="promethee_vi",
    api_endpoint_path="/promethee_vi",
    request_model=GenericModelExecutionRequest,
    handler=execute_promethee_vi,
    small_description=(
        "Outranking MCDM method based on preference functions, thresholds "
        "and lower/upper criterion weight bounds."
    ),
    extended_description=(
        "PROMETHEE VI ranks alternatives using criterion-level preference "
        "functions, indifference/preference thresholds and interval weights. "
        "It is useful when exact criteria weights are not fixed but lower and "
        "upper bounds are known."
    ),
    request_examples=PROMETHEE_VI_REQUEST_EXAMPLES,
    response_examples=PROMETHEE_VI_RESPONSE_EXAMPLES,
    display_name="PROMETHEE VI",
    more_info_url=None,
    model_kind="issue",
    requires_homogeneous_expression_domains=False,
    evaluation_structure_key="alternativeCriteriaMatrix",
    supports_consensus=False,
    is_multi_criteria=True,
    uses_criteria_weights=False,
    uses_expert_weights=False,
    uses_fuzzy_criteria_weights=False,
    uses_criterion_types=False,
    supported_expression_domains=[
        {"typeKey": "numericContinuous"},
        {"typeKey": "numericDiscrete"},
    ],
    parameters=[
        {
            "key": "q",
            "label": "Q thresholds",
            "parameterStructureKey": "numberCriterion",
            "required": True,
            "default": 0.05,
            "restrictions": {
                "min": 0,
                "max": None,
            },
        },
        {
            "key": "s",
            "label": "S thresholds",
            "parameterStructureKey": "numberCriterion",
            "required": True,
            "default": 0.10,
            "restrictions": {
                "min": 0,
                "max": None,
            },
        },
        {
            "key": "p",
            "label": "P thresholds",
            "parameterStructureKey": "numberCriterion",
            "required": True,
            "default": 0.20,
            "restrictions": {
                "min": 0,
                "max": None,
            },
        },
        {
            "key": "f",
            "label": "Preference functions",
            "parameterStructureKey": "selectCriterion",
            "valueType": "string",
            "required": True,
            "default": "t5",
            "restrictions": {
                "allowed": ["t1", "t2", "t3", "t4", "t5", "t6", "t7"],
            },
        },
        {
            "key": "w_lower",
            "label": "Lower weight bounds",
            "parameterStructureKey": "numberCriterion",
            "required": True,
            "default": 1,
            "restrictions": {
                "min": 0,
                "max": None,
            },
        },
        {
            "key": "w_upper",
            "label": "Upper weight bounds",
            "parameterStructureKey": "numberCriterion",
            "required": True,
            "default": 1,
            "restrictions": {
                "min": 0,
                "max": None,
            },
        },
        {
            "key": "iterations",
            "label": "Iterations",
            "valueType": "integer",
            "parameterStructureKey": "numberGlobal",
            "required": True,
            "default": 1000,
            "restrictions": {"min": 1, "max": None, "allowed": None},
        },
    ],
    model_section={
        "whatItDoes": (
            "PROMETHEE VI compares alternatives criterion by criterion and examines how strongly "
            "one option is preferred over another. It can distinguish between small differences "
            "that are not meaningful and larger differences that represent a real preference.\n\n"
            "A distinctive feature of this model is that the importance of a criterion does not "
            "need to be represented by one exact weight. Instead, a lower and an upper value can "
            "describe a range of acceptable importance, allowing the decision to reflect uncertainty "
            "about the exact priorities."
        ),
        "whenToUse": (
            "Use PROMETHEE VI when the decision requires a detailed comparison between alternatives "
            "and you can describe what differences should be considered negligible or significant "
            "for each criterion. It is especially useful when criterion importance cannot be fixed "
            "precisely but reasonable lower and upper limits are known.\n\n"
            "It may be excessive for simple decisions where exact weights are already available or "
            "where users cannot meaningfully define preference thresholds and weight ranges."
        ),
        "advantages": [
            "Allows criterion importance to be represented as ranges instead of exact weights.",
            "Can distinguish negligible differences from meaningful preferences.",
            "Provides a detailed comparison between competing alternatives.",
            "Is useful when the decision contains uncertainty about criterion importance.",
        ],
        "limitations": [
            "Requires more configuration than many simpler ranking methods.",
            "Preference thresholds may be difficult for non-expert users to define.",
            "The result can be sensitive to the selected preference functions and ranges.",
            "It may be unnecessarily complex for straightforward decision problems.",
        ],
    },
)
