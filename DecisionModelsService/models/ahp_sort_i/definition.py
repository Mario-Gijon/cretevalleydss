"""Decision Plugin metadata for AHPSort I."""

from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest

from .examples import AHPSORT_I_REQUEST_EXAMPLES, AHPSORT_I_RESPONSE_EXAMPLES
from .executor import execute_ahp_sort_i


MODEL_DEFINITION = ModelDefinition(
    api_model_key="ahp_sort_i",
    api_endpoint_path="/ahp_sort_i",
    request_model=GenericModelExecutionRequest,
    handler=execute_ahp_sort_i,
    display_name="AHPSort I",
    small_description=(
        "Classifies alternatives into ordered categories using the original "
        "AHPSort I method."
    ),
    extended_description=(
        "AHPSort I (Ishizaka, Pearman, and Nemery, 2012) assigns alternatives "
        "to ordered categories using either limiting profiles or one central "
        "profile per category. It uses criterion weights and AHP pairwise "
        "judgments. This independent method does not use TOPSIS-Sort."
    ),
    model_section={
        "whatItDoes": (
            "AHPSort I classifies alternatives into ordered categories using "
            "AHP priorities. The execution can compare alternatives against "
            "category boundaries or representative central profiles."
        ),
        "whenToUse": (
            "Use AHPSort I when alternatives and profiles can be compared in "
            "pairs for each criterion, and criterion weights are available. "
            "Choose limiting profiles between adjacent categories or one "
            "central profile for each category."
        ),
        "advantages": [
            "Implements the original AHPSort I classification method.",
            "Supports limiting and central profiles with stable IDs.",
            "Retains per-criterion AHP consistency diagnostics.",
        ],
        "limitations": [
            "Multi-expert aggregation of alternative/profile judgments is not supported yet.",
            "The existing AHP Random Index table supports local matrices up to 15 entities.",
            "AHPSort I is distinct from AHPSort II and TOPSIS-Sort.",
        ],
    },
    request_examples=AHPSORT_I_REQUEST_EXAMPLES,
    response_examples=AHPSORT_I_RESPONSE_EXAMPLES,
    more_info_url="https://doi.org/10.1080/00207543.2012.657966",
    model_kind="issue",
    implementation_status="scaffold",
    requires_homogeneous_expression_domains=False,
    evaluation_structure_key="ahpSortAlternativeProfiles",
    result_structure_key="sorting",
    result_structure_version=1,
    supports_consensus=False,
    supports_consensus_simulation=False,
    issue_execution_authorized=False,
    is_multi_criteria=True,
    uses_criteria_weights=True,
    uses_expert_weights=False,
    uses_fuzzy_criteria_weights=False,
    uses_criterion_types=False,
    supported_expression_domains=[],
    parameters=[
        {
            "key": "orderedCategories",
            "label": "Ordered categories",
            "parameterStructureKey": "orderedCategories",
            "required": True,
            "description": (
                "Categories from least preferred to most preferred, with "
                "stable IDs and consecutive order values."
            ),
        },
        {
            "key": "ahpSortProfiles",
            "label": "AHPSort I profiles",
            "parameterStructureKey": "ahpSortProfiles",
            "required": True,
            "description": (
                "Select limiting or central profiles and identify the category "
                "or consecutive category boundary represented by each profile."
            ),
        },
    ],
)
