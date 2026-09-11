from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest
from .executor import execute_bwm
from .examples import BWM_REQUEST_EXAMPLES, BWM_RESPONSE_EXAMPLES

MODEL_DEFINITION = ModelDefinition(
    api_model_key="bwm",
    api_endpoint_path="/bwm",
    request_model=GenericModelExecutionRequest,
    handler=execute_bwm,
    small_description=(
        "Auxiliary weighting service that derives criterion weights from best-worst "
        "comparisons provided by experts."
    ),
    extended_description=(
        "Best-Worst Method is an auxiliary weighting service that derives criterion "
        "weights from expert comparisons between the best criterion, the worst "
        "criterion, and the remaining criteria. In this system it supports the "
        "weighting workflow rather than acting as a final issue resolution model."
    ),
    request_examples=BWM_REQUEST_EXAMPLES,
    response_examples=BWM_RESPONSE_EXAMPLES,
    display_name="BWM",
    more_info_url=None,
    model_kind="criteriaWeighting",
    requires_homogeneous_expression_domains=False,
    supports_creator_criteria_weighting=True,
    supports_expert_criteria_weighting=True,
    evaluation_structure_key="bestWorstCriteria",
    supports_consensus=False,
    is_multi_criteria=True,
    uses_criteria_weights=False,
    uses_fuzzy_criteria_weights=False,
    uses_criterion_types=False,
    supported_expression_domains=[],
    parameters=[],
    model_section={
        "whatItDoes": (
            "The Best-Worst Method helps determine how important the criteria of a decision "
            "should be. Instead of asking users to compare every criterion with every other "
            "criterion, it starts by identifying the most important criterion and the least "
            "important one.\n\n"
            "The remaining comparisons are made using these two criteria as references. From "
            "those preferences, the method calculates a set of criterion weights that can later "
            "be used by the decision model that ranks the alternatives. BWM therefore supports "
            "the weighting stage rather than producing the final alternative ranking itself."
        ),
        "whenToUse": (
            "Use BWM when the criteria do not all have the same importance and you want that "
            "importance to be obtained systematically from the preferences of a person or a "
            "group of experts. It is particularly useful when directly assigning percentages "
            "to many criteria feels difficult or arbitrary.\n\n"
            "It may be unnecessary when the criterion weights are already known, when all "
            "criteria should have equal importance, or when users simply want to enter the "
            "weights directly."
        ),
        "advantages": [
            "Provides a structured way to determine criterion importance.",
            "Requires fewer comparisons than approaches that compare every possible pair of criteria.",
            "Can be used with both creator-defined and expert-defined weighting.",
            "Makes users think explicitly about their most and least important criteria.",
        ],
        "limitations": [
            "Users must be able to identify a clear best and worst criterion.",
            "The resulting weights still depend on subjective judgments.",
            "Inconsistent comparisons can reduce the reliability of the resulting weights.",
            "It determines criterion weights but does not rank the alternatives by itself.",
        ],
    },
)
