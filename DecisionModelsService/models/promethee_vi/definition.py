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
            "required": True,
            "default": "t5",
            "restrictions": {
                "valueType": "enum",
                "requiredForEachCriterion": True,
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
)
