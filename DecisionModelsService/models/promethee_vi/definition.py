from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest
from .executor import execute_promethee_vi
from .examples import PROMETHEE_VI_RESPONSE_EXAMPLES


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
        supported_domains=["numericContinuous", "numericDiscrete"],
        parameters=[
            {
                "key": "q",
                "label": "Q thresholds",
                "type": "criterionMap",
                "scope": "perCriterion",
                "parameterStructureKey": "numberCriterion",
                "required": True,
                "default": 0.05,
                "restrictions": {
                    "valueType": "number",
                    "requiredForEachCriterion": True,
                    "min": 0,
                    "max": None,
                    "allowed": None,
                },
            },
            {
                "key": "s",
                "label": "S thresholds",
                "type": "criterionMap",
                "scope": "perCriterion",
                "parameterStructureKey": "numberCriterion",
                "required": True,
                "default": 0.10,
                "restrictions": {
                    "valueType": "number",
                    "requiredForEachCriterion": True,
                    "min": 0,
                    "max": None,
                    "allowed": None,
                },
            },
            {
                "key": "p",
                "label": "P thresholds",
                "type": "criterionMap",
                "scope": "perCriterion",
                "parameterStructureKey": "numberCriterion",
                "required": True,
                "default": 0.20,
                "restrictions": {
                    "valueType": "number",
                    "requiredForEachCriterion": True,
                    "min": 0,
                    "max": None,
                    "allowed": None,
                },
            },
            {
                "key": "f",
                "label": "Preference functions",
                "type": "criterionMap",
                "scope": "perCriterion",
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
                "type": "criterionMap",
                "scope": "perCriterion",
                "parameterStructureKey": "numberCriterion",
                "required": True,
                "default": 1,
                "restrictions": {
                    "valueType": "number",
                    "requiredForEachCriterion": True,
                    "min": 0,
                    "max": None,
                    "allowed": None,
                },
            },
            {
                "key": "w_upper",
                "label": "Upper weight bounds",
                "type": "criterionMap",
                "scope": "perCriterion",
                "parameterStructureKey": "numberCriterion",
                "required": True,
                "default": 1,
                "restrictions": {
                    "valueType": "number",
                    "requiredForEachCriterion": True,
                    "min": 0,
                    "max": None,
                    "allowed": None,
                },
            },
            {
                "key": "iterations",
                "label": "Iterations",
                "type": "integer",
                "valueType": "integer",
                "scope": "global",
                "parameterStructureKey": "numberGlobal",
                "required": True,
                "default": 1000,
                "restrictions": {"min": 1, "max": None, "allowed": None},
            },
        ],
    )
