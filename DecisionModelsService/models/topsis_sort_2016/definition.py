"""Decision Plugin definition for the isolated TOPSIS-Sort 2016 adapter."""

from registry.model_definition import ModelDefinition
from schemas.model_requests import GenericModelExecutionRequest

from .examples import (
    TOPSIS_SORT_2016_REQUEST_EXAMPLES,
    TOPSIS_SORT_2016_RESPONSE_EXAMPLES,
)
from .executor import execute_topsis_sort_2016


MODEL_DEFINITION = ModelDefinition(
    api_model_key="topsis_sort_2016",
    api_endpoint_path="/topsis_sort_2016",
    request_model=GenericModelExecutionRequest,
    handler=execute_topsis_sort_2016,
    display_name="TOPSIS-Sort",
    small_description=(
        "Classifies numerical alternatives into ordered categories using the "
        "original TOPSIS-Sort limiting-profile method."
    ),
    extended_description=(
        "TOPSIS-Sort (Sabokbar et al., 2016) classifies alternatives into "
        "predefined ordered categories. It applies the paper's benefit/cost "
        "normalization, criterion weights, TOPSIS closeness coefficients, and "
        "strict comparisons with one limiting profile between each adjacent "
        "pair of categories. The original publication is Sabokbar, Hosseini, "
        "Banaitis, and Banaitiene (2016), ‘A novel sorting method TOPSIS-Sort: "
        "An application for Tehran environmental quality evaluation,’ E+M "
        "Economics and Management, 19(2), 87–104."
    ),
    model_section={
        "whatItDoes": (
            "TOPSIS-Sort assigns each numerical alternative to one of the ordered "
            "categories configured for the decision. It evaluates alternatives "
            "and limiting profiles together, applies benefit or cost directions "
            "and criterion weights, and compares their TOPSIS closeness values.\n\n"
            "The output is a category assignment. It does not rank alternatives or "
            "produce a score for ordering them."
        ),
        "whenToUse": (
            "Use this method when category boundaries can be described by numerical "
            "profiles and the categories have a meaningful least-to-most-preferred "
            "order. Configure exactly one boundary profile between every pair of "
            "adjacent categories.\n\n"
            "It requires numeric criterion evaluations, benefit or cost directions, "
            "and criterion weights. Its strict profile rule leaves an alternative "
            "exactly on a boundary without a defined category."
        ),
        "advantages": [
            "Produces category assignments rather than an individual ranking.",
            "Uses the original 2016 limiting-profile formulation.",
            "Supports benefit and cost criteria with explicit criterion weights.",
        ],
        "limitations": [
            "Requires numerical evaluations and one boundary profile per category boundary.",
            "Equal alternative and profile closeness values have no assignment in the paper.",
            "Consensus and results analysis are not implemented for this sorting result.",
        ],
    },
    request_examples=TOPSIS_SORT_2016_REQUEST_EXAMPLES,
    response_examples=TOPSIS_SORT_2016_RESPONSE_EXAMPLES,
    more_info_url="https://doi.org/10.15240/tul/001/2016-2-006",
    model_kind="issue",
    implementation_status="scaffold",
    requires_homogeneous_expression_domains=False,
    evaluation_structure_key="alternativeCriteriaMatrix",
    result_structure_key="sorting",
    result_structure_version=1,
    supports_consensus=False,
    supports_consensus_simulation=False,
    is_multi_criteria=True,
    uses_criteria_weights=True,
    uses_expert_weights=False,
    uses_fuzzy_criteria_weights=False,
    uses_criterion_types=True,
    supported_expression_domains=[
        {"typeKey": "numericContinuous"},
        {"typeKey": "numericDiscrete"},
    ],
    parameters=[
        {
            "key": "orderedCategories",
            "label": "Ordered categories",
            "parameterStructureKey": "orderedCategories",
            "required": True,
            "description": (
                "Categories from least preferred (order 0) to most preferred, "
                "with consecutive orders and stable category IDs."
            ),
        },
        {
            "key": "boundaryProfiles",
            "label": "Boundary profiles",
            "parameterStructureKey": "boundaryProfiles",
            "required": True,
            "description": (
                "Exactly one raw numeric limiting profile between each adjacent "
                "category pair. Each profile categoryId names the more-preferred "
                "category entered at that boundary."
            ),
        },
    ],
)
