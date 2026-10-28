from __future__ import annotations

from copy import deepcopy

import numpy as np
import pytest

from models.ahp_criteria_weights.run import run_ahp_criteria_weights
from models.ahp_sort_i.run import (
    AHPSortICentralProfileOrderError,
    AHPSortIProfileOrderError,
    _assign_category_from_ordered_profiles,
    _select_nearest_central_profile,
    _solve_local_pairwise_matrix,
    _validate_profile_order,
    run_ahp_sort_i,
    run_ahp_sort_i_central_profiles,
    run_ahp_sort_i_multiple_profiles,
)


def _input(
    *,
    criteria: list[dict] | None = None,
    categories: list[dict] | None = None,
    alternatives: list[dict] | None = None,
    weights: dict | None = None,
    comparisons: list[dict] | None = None,
) -> dict:
    criteria = criteria or [{"id": "quality", "name": "Quality"}]
    categories = categories or [
        {"id": "rejected", "name": "Rejected"},
        {"id": "accepted", "name": "Accepted"},
    ]
    alternatives = alternatives or [{"id": "supplier-a", "name": "Supplier A"}]
    weights = weights or {criteria[0]["id"]: 1.0}
    comparisons = comparisons or [
        {
            "alternativeId": alternatives[0]["id"],
            "criterionId": criteria[0]["id"],
            "profileId": "minimum-profile",
            "alternativeToProfile": 1,
        }
    ]
    return {
        "criteria": criteria,
        "categories": categories,
        "alternatives": alternatives,
        "limiting_profile": {"id": "minimum-profile", "name": "Minimum profile"},
        "criterion_weights_by_id": weights,
        "comparisons": comparisons,
    }


def _run(data: dict) -> dict:
    return run_ahp_sort_i(**data)


def _comparison(
    alternative_id: str, criterion_id: str, value: float, profile_id: str = "minimum-profile"
) -> dict:
    return {
        "alternativeId": alternative_id,
        "criterionId": criterion_id,
        "profileId": profile_id,
        "alternativeToProfile": value,
    }


def test_binary_reciprocal_matrix_principal_vector_and_local_sum() -> None:
    result = _run(_input(comparisons=[_comparison("supplier-a", "quality", 3)]))
    local = result["resultsByAlternative"]["supplier-a"]["localPrioritiesByCriterion"]["quality"]
    matrix = np.array(local["pairwiseMatrix"])
    vector = np.array([local["alternative"], local["profile"]])

    np.testing.assert_allclose(matrix, [[1.0, 3.0], [1.0 / 3.0, 1.0]])
    assert matrix[0, 1] * matrix[1, 0] == pytest.approx(1.0)
    assert vector == pytest.approx([0.75, 0.25])
    assert vector.sum() == pytest.approx(1.0)
    assert matrix @ vector == pytest.approx(2.0 * vector)


def test_exact_equality_is_assigned_to_the_more_preferred_category() -> None:
    result = _run(_input(comparisons=[_comparison("supplier-a", "quality", 1)]))
    assignment = result["resultsByAlternative"]["supplier-a"]

    assert assignment["globalPriority"] == assignment["profileGlobalPriority"] == 0.5
    assert assignment["categoryId"] == "accepted"
    assert assignment["assignmentRule"] == (
        "alternative_priority_greater_than_or_equal_to_limiting_profile"
    )


@pytest.mark.parametrize("judgment", [1 / value for value in range(2, 10)] + [*range(1, 10)])
def test_all_seventeen_fundamental_saaty_values_are_accepted(judgment: float) -> None:
    result = _run(_input(comparisons=[_comparison("supplier-a", "quality", judgment)]))
    local = result["resultsByAlternative"]["supplier-a"]["localPrioritiesByCriterion"]["quality"]

    assert local["alternativeToProfileJudgment"] == judgment
    assert local["alternative"] == pytest.approx(judgment / (1 + judgment))
    assert local["alternative"] + local["profile"] == pytest.approx(1.0)


@pytest.mark.parametrize(
    ("judgment", "expected_category", "expected_alternative_priority"),
    [(3, "accepted", 0.75), (1 / 3, "rejected", 0.25)],
)
def test_clear_superiority_and_inferiority(
    judgment: float, expected_category: str, expected_alternative_priority: float
) -> None:
    result = _run(_input(comparisons=[_comparison("supplier-a", "quality", judgment)]))
    assignment = result["resultsByAlternative"]["supplier-a"]

    assert assignment["categoryId"] == expected_category
    assert assignment["globalPriority"] == pytest.approx(expected_alternative_priority)
    assert assignment["globalPriority"] + assignment["profileGlobalPriority"] == pytest.approx(1.0)


def test_different_criterion_weights_aggregate_local_priorities_by_id() -> None:
    criteria = [{"id": "experience", "name": "Experience"}, {"id": "cost", "name": "Cost"}]
    data = _input(
        criteria=criteria,
        weights={"experience": 0.75, "cost": 0.25},
        comparisons=[
            _comparison("supplier-a", "experience", 3),
            _comparison("supplier-a", "cost", 1 / 3),
        ],
    )
    assignment = _run(data)["resultsByAlternative"]["supplier-a"]

    assert assignment["weightsByCriterion"] == {"experience": 0.75, "cost": 0.25}
    assert assignment["localPrioritiesByCriterion"]["experience"]["alternative"] == pytest.approx(0.75)
    assert assignment["localPrioritiesByCriterion"]["experience"]["profile"] == pytest.approx(0.25)
    assert assignment["weightedContributionsByCriterion"]["experience"] == pytest.approx(
        {"alternative": 0.5625, "profile": 0.1875}
    )
    assert assignment["globalPriority"] == pytest.approx(0.625)
    assert assignment["profileGlobalPriority"] == pytest.approx(0.375)
    assert assignment["categoryId"] == "accepted"


def test_category_ids_and_assignments_do_not_depend_on_alternative_order() -> None:
    alternatives = [
        {"id": "a-id", "name": "A"},
        {"id": "z-id", "name": "Z"},
    ]
    categories = [
        {"id": "lower-id", "name": "Lower"},
        {"id": "upper-id", "name": "Upper"},
    ]
    comparisons = [
        _comparison("a-id", "quality", 1 / 3),
        _comparison("z-id", "quality", 1),
    ]
    forward = _input(alternatives=alternatives, categories=categories, comparisons=comparisons)
    reversed_input = deepcopy(forward)
    reversed_input["alternatives"].reverse()
    first = _run(forward)["resultsByAlternative"]
    second = _run(reversed_input)["resultsByAlternative"]

    assert first == second
    assert first["a-id"]["categoryId"] == "lower-id"
    assert first["z-id"]["categoryId"] == "upper-id"


def test_rejects_non_normalized_weights() -> None:
    data = _input(weights={"quality": 0.9})
    with pytest.raises(ValueError, match="normalized to sum to 1"):
        _run(data)


@pytest.mark.parametrize("weights", [{"quality": -0.1}, {"quality": float("nan")}, {"quality": True}])
def test_rejects_negative_non_finite_and_boolean_weights(weights: dict) -> None:
    with pytest.raises(ValueError):
        _run(_input(weights=weights))


def test_rejects_missing_and_unknown_weight_ids() -> None:
    criteria = [{"id": "quality", "name": "Quality"}, {"id": "cost", "name": "Cost"}]
    with pytest.raises(ValueError, match="exactly the criterion ids"):
        _run(_input(criteria=criteria, weights={"quality": 1.0, "unknown": 0.0}))


@pytest.mark.parametrize("judgment", [0, -1, 1.5, 10, float("inf"), float("nan"), True])
def test_rejects_invalid_or_non_finite_saaty_judgments(judgment: float) -> None:
    with pytest.raises(ValueError, match="Saaty"):
        _run(_input(comparisons=[_comparison("supplier-a", "quality", judgment)]))


def test_rejects_duplicate_or_unknown_entity_ids() -> None:
    data = _input(
        alternatives=[{"id": "x", "name": "X"}, {"id": "x", "name": "Duplicate"}],
        comparisons=[],
    )
    with pytest.raises(ValueError, match="duplicate id"):
        _run(data)

    data = _input(comparisons=[_comparison("unknown", "quality", 1)])
    with pytest.raises(ValueError, match="unknown alternative, criterion or profile"):
        _run(data)


def test_rejects_incomplete_or_duplicate_comparison_records() -> None:
    criteria = [{"id": "quality", "name": "Quality"}, {"id": "cost", "name": "Cost"}]
    incomplete = _input(
        criteria=criteria,
        weights={"quality": 0.5, "cost": 0.5},
        comparisons=[_comparison("supplier-a", "quality", 1)],
    )
    with pytest.raises(ValueError, match="incomplete"):
        _run(incomplete)

    duplicate = _input(
        comparisons=[
            _comparison("supplier-a", "quality", 1),
            _comparison("supplier-a", "quality", 3),
        ]
    )
    with pytest.raises(ValueError, match="duplicates"):
        _run(duplicate)


def test_phase_1a_rejects_more_than_two_categories() -> None:
    data = _input(
        categories=[
            {"id": "low", "name": "Low"},
            {"id": "medium", "name": "Medium"},
            {"id": "high", "name": "High"},
        ]
    )
    with pytest.raises(ValueError, match="exactly two ordered categories"):
        _run(data)


# Supplier-to-profile Saaty ratios transcribed from the shaded selections in
# Appendix 1, journal pp. 4783–4784. Values >1 favor the supplier; values <1
# are reciprocals of selections to the right of the neutral 1.
ISHIZAKA_2012_CRITERION_NAMES = [
    "Experience",
    "Flexibility",
    "Security",
    "Resilience",
    "Environment",
]
ISHIZAKA_2012_SUPPLIER_JUDGMENTS = {
    "A": [9, 9, 9, 9, 9],
    "B": [9, 9, 9, 9, 9],
    "C": [8, 9, 9, 9, 9],
    "D": [7, 9, 5, 1 / 5, 9],
    "E": [5, 7, 7, 1 / 5, 5],
    "F": [1, 1 / 6, 9, 9, 9],
    "G": [5, 3, 1, 5, 5],
    "H": [1 / 7, 9, 1, 9, 9],
    "I": [1 / 4, 1 / 7, 4, 1 / 5, 1 / 5],
    "J": [1 / 9, 1 / 9, 1, 1, 1],
    "K": [1 / 8, 1 / 9, 1, 1 / 5, 1 / 5],
    "L": [1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9],
}
ISHIZAKA_2012_PUBLISHED_LOCAL_PRIORITIES = {
    "A": [0.9, 0.9, 0.9, 0.9, 0.9],
    "B": [0.9, 0.9, 0.9, 0.9, 0.9],
    "C": [0.889, 0.9, 0.9, 0.9, 0.9],
    "D": [0.875, 0.9, 0.833, 0.167, 0.9],
    "E": [0.833, 0.875, 0.875, 0.167, 0.833],
    "F": [0.5, 0.143, 0.9, 0.9, 0.9],
    "G": [0.833, 0.75, 0.5, 0.833, 0.833],
    "H": [0.125, 0.9, 0.5, 0.9, 0.9],
    "I": [0.2, 0.125, 0.8, 0.167, 0.167],
    # Table 5 prints 0.125 for Flexibility; Appendix 1's marked 9 yields 0.100.
    "J": [0.1, 0.125, 0.5, 0.5, 0.5],
    "K": [0.111, 0.1, 0.5, 0.167, 0.167],
    "L": [0.1, 0.1, 0.1, 0.1, 0.1],
}
ISHIZAKA_2012_TABLE5_PROFILE_GLOBAL = {
    "A": 0.100,
    "B": 0.100,
    "C": 0.106,
    "D": 0.191,
    "E": 0.209,
    "G": 0.285,
    "F": 0.423,
    "H": 0.614,
    "I": 0.668,
    "J": 0.700,
    "K": 0.748,
    "L": 0.900,
}
ISHIZAKA_2012_TABLE5_ALTERNATIVE_GLOBAL = {
    "A": 0.900,
    "B": 0.900,
    "C": 0.894,
    "D": 0.809,
    "E": 0.791,
    "G": 0.715,
    "F": 0.577,
    "H": 0.386,
    "I": 0.332,
    "J": 0.300,
    "K": 0.252,
    "L": 0.100,
}


def _ishizaka_2012_case() -> dict:
    criteria = [
        {"id": criterion_name.lower(), "name": criterion_name}
        for criterion_name in ISHIZAKA_2012_CRITERION_NAMES
    ]
    alternatives = [
        {"id": f"supplier-{name.lower()}", "name": f"Supplier {name}"}
        for name in "ABCDEFGHIJKL"
    ]
    criterion_pair_values = [7, 4, 7, 8, 1 / 4, 1, 3, 4, 5, 3]
    criterion_comparisons = []
    value_index = 0
    for row in range(len(criteria)):
        for column in range(row + 1, len(criteria)):
            criterion_comparisons.append(
                {
                    "criterionId": criteria[row]["id"],
                    "comparedCriterionId": criteria[column]["id"],
                    "value": criterion_pair_values[value_index],
                }
            )
            value_index += 1
    criterion_result = run_ahp_criteria_weights(
        context={"criteria": criteria},
        evaluations=[
            {
                "expert": {"id": "procurement-manager"},
                "payload": {"comparisons": criterion_comparisons},
            }
        ],
    )
    weights = criterion_result["expertWeightsByExpert"]["procurement-manager"]
    comparisons = [
        _comparison(
            alternative["id"],
            criterion["id"],
            judgment,
            profile_id="pqq-minimum",
        )
        for alternative in alternatives
        for criterion, judgment in zip(
            criteria,
            ISHIZAKA_2012_SUPPLIER_JUDGMENTS[
                alternative["name"].removeprefix("Supplier ")
            ],
            strict=True,
        )
    ]
    return {
        "criteria": criteria,
        "categories": [
            {"id": "rejected", "name": "Rejected"},
            {"id": "accepted", "name": "Accepted"},
        ],
        "alternatives": alternatives,
        "limiting_profile": {"id": "pqq-minimum", "name": "PQQ minimum profile"},
        "criterion_weights_by_id": weights,
        "comparisons": comparisons,
    }


def test_ishizaka_2012_supplier_case_matches_published_local_values_except_j_flexibility() -> None:
    result = _run(_ishizaka_2012_case())
    results = result["resultsByAlternative"]

    published_weights = [0.565, 0.081, 0.234, 0.081, 0.040]
    actual_weights = list(result["criterionWeightsById"].values())
    assert actual_weights == pytest.approx(published_weights, abs=0.0005)

    for supplier_name, expected_local_priorities in ISHIZAKA_2012_PUBLISHED_LOCAL_PRIORITIES.items():
        supplier_id = f"supplier-{supplier_name.lower()}"
        assignment = results[supplier_id]
        for criterion, expected_priority in zip(
            result["criteria"], expected_local_priorities, strict=True
        ):
            actual_priority = assignment["localPrioritiesByCriterion"][criterion["id"]][
                "alternative"
            ]
            if supplier_name == "J" and criterion["name"] == "Flexibility":
                # This one source conflict is asserted explicitly below.
                continue
            assert actual_priority == pytest.approx(expected_priority, abs=0.0005)
        expected_alternative_global = sum(
            result["criterionWeightsById"][criterion["id"]]
            * assignment["localPrioritiesByCriterion"][criterion["id"]]["alternative"]
            for criterion in result["criteria"]
        )
        expected_profile_global = sum(
            result["criterionWeightsById"][criterion["id"]]
            * assignment["localPrioritiesByCriterion"][criterion["id"]]["profile"]
            for criterion in result["criteria"]
        )
        assert assignment["globalPriority"] == pytest.approx(expected_alternative_global)
        assert assignment["profileGlobalPriority"] == pytest.approx(expected_profile_global)
        assert assignment["globalPriority"] + assignment["profileGlobalPriority"] == pytest.approx(1.0)

    actual_categories = {
        supplier_id.removeprefix("supplier-").upper(): assignment["categoryId"]
        for supplier_id, assignment in results.items()
    }
    assert {name for name, category in actual_categories.items() if category == "accepted"} == set("ABCDEFG")
    assert {name for name, category in actual_categories.items() if category == "rejected"} == set("HIJKL")


def test_supplier_j_flexibility_preserves_appendix_judgment_and_documents_table_5_conflict() -> None:
    result = _run(_ishizaka_2012_case())
    flexibility = result["resultsByAlternative"]["supplier-j"]["localPrioritiesByCriterion"][
        "flexibility"
    ]
    published_priority = ISHIZAKA_2012_PUBLISHED_LOCAL_PRIORITIES["J"][1]

    assert ISHIZAKA_2012_SUPPLIER_JUDGMENTS["J"][1] == 1 / 9
    assert flexibility["alternativeToProfileJudgment"] == 1 / 9
    assert flexibility["alternative"] == pytest.approx((1 / 9) / (1 + 1 / 9))
    assert flexibility["alternative"] == pytest.approx(0.100)
    assert published_priority == 0.125
    assert published_priority / (1 - published_priority) == pytest.approx(1 / 7)
    assert abs(flexibility["alternative"] - published_priority) > 0.0005


def test_table_five_global_column_has_documented_arithmetic_discrepancies() -> None:
    result = _run(_ishizaka_2012_case())
    actual = {
        supplier_id.removeprefix("supplier-").upper(): round(assignment["globalPriority"], 3)
        for supplier_id, assignment in result["resultsByAlternative"].items()
    }
    actual_profile = {
        supplier_id.removeprefix("supplier-").upper(): round(
            assignment["profileGlobalPriority"], 3
        )
        for supplier_id, assignment in result["resultsByAlternative"].items()
    }
    matches_printed_rounding = {
        name
        for name, value in actual.items()
        if abs(value - ISHIZAKA_2012_TABLE5_ALTERNATIVE_GLOBAL[name]) <= 0.0005
    }

    # The local cells and criterion weights reproduce their printed tables,
    # but several Table 5 totals do not equal their weighted local rows.
    assert actual == {
        "A": 0.900,
        "B": 0.900,
        "C": 0.894,
        "D": 0.811,
        "E": 0.793,
        "F": 0.613,
        "G": 0.749,
        "H": 0.369,
        "I": 0.330,
        "J": 0.242,
        "K": 0.208,
        "L": 0.100,
    }
    assert matches_printed_rounding == set("ABCL")
    assert {
        name
        for name, value in actual_profile.items()
        if abs(value - ISHIZAKA_2012_TABLE5_PROFILE_GLOBAL[name]) <= 0.0005
    } == set("ABCL")


def _multiple_profile_input(
    *,
    alternatives: list[dict] | None = None,
    categories: list[dict] | None = None,
    profiles: list[dict] | None = None,
    alternative_profile_values: dict[str, tuple[float, ...]] | None = None,
    profile_ratio: float = 1 / 2,
    profile_comparisons: list[dict] | None = None,
    criteria: list[dict] | None = None,
    weights: dict | None = None,
) -> dict:
    criteria = criteria or [{"id": "quality", "name": "Quality"}]
    alternatives = alternatives or [{"id": "supplier-a", "name": "Supplier A"}]
    categories = categories or [
        {"id": "low", "name": "Low"},
        {"id": "medium", "name": "Medium"},
        {"id": "high", "name": "High"},
    ]
    profiles = profiles or [
        {
            "profileId": "boundary-low-medium",
            "lowerCategoryId": "low",
            "upperCategoryId": "medium",
        },
        {
            "profileId": "boundary-medium-high",
            "lowerCategoryId": "medium",
            "upperCategoryId": "high",
        },
    ]
    alternative_profile_values = alternative_profile_values or {
        alternatives[0]["id"]: (1, 1 / 2)
    }
    comparisons = [
        {
            "alternativeId": alternative["id"],
            "criterionId": criterion["id"],
            "profileId": profile["profileId"],
            "alternativeToProfile": alternative_profile_values[alternative["id"]][profile_index],
        }
        for alternative in alternatives
        for criterion in criteria
        for profile_index, profile in enumerate(profiles)
    ]
    if profile_comparisons is None:
        profile_comparisons = [
            {
                "criterionId": criterion["id"],
                "firstProfileId": profiles[0]["profileId"],
                "secondProfileId": profiles[1]["profileId"],
                "firstToSecond": profile_ratio,
            }
            for criterion in criteria
        ] if len(profiles) == 2 else []
    weights = weights or {criterion["id"]: 1 / len(criteria) for criterion in criteria}
    return {
        "criteria": criteria,
        "categories": categories,
        "alternatives": alternatives,
        "limiting_profiles": profiles,
        "criterion_weights_by_id": weights,
        "comparisons": comparisons,
        "profile_comparisons": profile_comparisons,
    }


def _run_multiple_profiles(data: dict) -> dict:
    return run_ahp_sort_i_multiple_profiles(**data)


def _multiple_profile_assignment(data: dict, alternative_id: str = "supplier-a") -> dict:
    return _run_multiple_profiles(data)["resultsByAlternative"][alternative_id]


def test_three_category_case_builds_a_complete_reciprocal_matrix_and_known_vector() -> None:
    # This input is deliberately solved directly: its known vector is the
    # requested 3x3 AHP example. Its profile order is not a valid category order.
    matrix = [[1, 2, 6], [1 / 2, 1, 3], [1 / 6, 1 / 3, 1]]
    priorities, diagnostics = _solve_local_pairwise_matrix(matrix)

    assert priorities == pytest.approx([0.6, 0.3, 0.1], abs=1e-12)
    assert diagnostics["lambdaMax"] == pytest.approx(3.0, abs=1e-12)
    assert diagnostics["consistencyIndex"] == pytest.approx(0.0, abs=1e-12)
    assert diagnostics["randomIndex"] == 0.58
    assert diagnostics["consistencyRatio"] == pytest.approx(0.0, abs=1e-12)


def test_three_category_result_exposes_complete_reciprocal_matrix_and_local_consistency() -> None:
    data = _multiple_profile_input(alternative_profile_values={"supplier-a": (1, 1 / 2)})
    result = _run_multiple_profiles(data)
    local = result["resultsByAlternative"]["supplier-a"]["localPrioritiesByCriterion"]["quality"]
    matrix = np.asarray(local["pairwiseMatrix"])

    np.testing.assert_allclose(matrix, [[1, 1, 1 / 2], [1, 1, 1 / 2], [2, 2, 1]])
    np.testing.assert_allclose(matrix * matrix.T, np.ones((3, 3)))
    assert np.diag(matrix) == pytest.approx([1, 1, 1])
    assert local["alternative"] == pytest.approx(0.25)
    assert local["profilesById"] == pytest.approx(
        {"boundary-low-medium": 0.25, "boundary-medium-high": 0.5}
    )
    assert local["consistency"]["consistencyRatio"] == pytest.approx(0.0, abs=1e-12)


def test_four_categories_accept_three_profiles_and_order_profiles_by_category_ids() -> None:
    categories = [
        {"id": "c0", "name": "Very Low"},
        {"id": "c1", "name": "Low"},
        {"id": "c2", "name": "Medium"},
        {"id": "c3", "name": "High"},
    ]
    profiles = [
        {"profileId": "p2", "lowerCategoryId": "c2", "upperCategoryId": "c3"},
        {"profileId": "p0", "lowerCategoryId": "c0", "upperCategoryId": "c1"},
        {"profileId": "p1", "lowerCategoryId": "c1", "upperCategoryId": "c2"},
    ]
    data = _multiple_profile_input(
        categories=categories,
        profiles=profiles,
        alternative_profile_values={"supplier-a": (1 / 8, 1 / 2, 1 / 4)},
        profile_comparisons=[
            {"criterionId": "quality", "firstProfileId": "p0", "secondProfileId": "p1", "firstToSecond": 1 / 2},
            {"criterionId": "quality", "firstProfileId": "p1", "secondProfileId": "p2", "firstToSecond": 1 / 2},
            {"criterionId": "quality", "firstProfileId": "p0", "secondProfileId": "p2", "firstToSecond": 1 / 4},
        ],
    )

    result = _run_multiple_profiles(data)

    assert [item["profileId"] for item in result["limitingProfiles"]] == ["p0", "p1", "p2"]
    assert result["resultsByAlternative"]["supplier-a"]["categoryId"] == "c0"


@pytest.mark.parametrize(
    ("values", "expected_category"),
    [
        ((1 / 2, 1 / 4), "low"),
        ((1, 1 / 2), "medium"),  # Exact tie at lower boundary goes upward.
        ((2, 1), "high"),  # Exact tie at upper boundary goes upward.
        ((1, 1), "medium"),
    ],
)
def test_assignment_uses_each_ordered_boundary_and_equalities_go_up(
    values: tuple[float, ...], expected_category: str
) -> None:
    data = _multiple_profile_input(alternative_profile_values={"supplier-a": values})
    assert _multiple_profile_assignment(data)["categoryId"] == expected_category


def test_strictly_middle_alternative_is_assigned_to_middle_category() -> None:
    data = _multiple_profile_input(
        alternative_profile_values={"supplier-a": (1, 1)},
        profile_ratio=1 / 2,
    )
    assignment = _multiple_profile_assignment(data)
    profiles = assignment["profileGlobalPrioritiesById"]

    assert profiles["boundary-low-medium"] < assignment["globalPriority"]
    assert assignment["globalPriority"] < profiles["boundary-medium-high"]
    assert assignment["categoryId"] == "medium"


def test_profile_profile_judgments_are_reused_but_local_vectors_are_recalculated_per_alternative() -> None:
    alternatives = [
        {"id": "a", "name": "A"},
        {"id": "b", "name": "B"},
    ]
    data = _multiple_profile_input(
        alternatives=alternatives,
        alternative_profile_values={"a": (1, 1 / 2), "b": (2, 1)},
    )
    result = _run_multiple_profiles(data)
    a_local = result["resultsByAlternative"]["a"]["localPrioritiesByCriterion"]["quality"]
    b_local = result["resultsByAlternative"]["b"]["localPrioritiesByCriterion"]["quality"]

    assert a_local["pairwiseMatrix"][1][2] == b_local["pairwiseMatrix"][1][2] == 1 / 2
    assert a_local["profilesById"] != b_local["profilesById"]
    assert a_local["profilesById"] == pytest.approx(
        {"boundary-low-medium": 0.25, "boundary-medium-high": 0.5}
    )
    assert b_local["profilesById"] == pytest.approx(
        {"boundary-low-medium": 0.2, "boundary-medium-high": 0.4}
    )


@pytest.mark.parametrize(
    ("profile_ratio", "expected_reason"),
    [(2, "inverted"), (1, "coincident")],
)
def test_inverted_or_coincident_profiles_raise_traceable_error(
    profile_ratio: float, expected_reason: str
) -> None:
    data = _multiple_profile_input(
        alternative_profile_values={"supplier-a": (1, profile_ratio)},
        profile_ratio=profile_ratio,
    )
    with pytest.raises(AHPSortIProfileOrderError) as error:
        _run_multiple_profiles(data)

    assert error.value.code == "ahpsort_i_profile_order_invalid"
    assert error.value.alternative_id == "supplier-a"
    assert error.value.profile_ids == ["boundary-low-medium", "boundary-medium-high"]
    assert error.value.as_dict()["alternativeId"] == "supplier-a"
    assert error.value.as_dict()["profilePrioritiesById"] == {
        "boundary-low-medium": error.value.lower_priority,
        "boundary-medium-high": error.value.upper_priority,
    }
    if expected_reason == "inverted":
        assert error.value.lower_priority > error.value.upper_priority
    else:
        assert error.value.lower_priority == pytest.approx(error.value.upper_priority, abs=1e-12)


def test_profile_order_tolerance_rejects_a_positive_but_numerically_indistinguishable_gap() -> None:
    profiles = [
        {"profileId": "lower", "lowerCategoryId": "low", "upperCategoryId": "medium"},
        {"profileId": "upper", "lowerCategoryId": "medium", "upperCategoryId": "high"},
    ]
    with pytest.raises(AHPSortIProfileOrderError) as error:
        _validate_profile_order(
            alternative_id="supplier-a",
            profiles=profiles,
            profile_priorities={"lower": 0.4, "upper": 0.4 + 5e-13},
        )
    assert error.value.profile_ids == ["lower", "upper"]


def test_classification_tie_tolerance_prevents_float_noise_from_changing_equality_side() -> None:
    categories = [
        {"id": "low", "name": "Low"},
        {"id": "medium", "name": "Medium"},
        {"id": "high", "name": "High"},
    ]
    profiles = [
        {"profileId": "p1", "lowerCategoryId": "low", "upperCategoryId": "medium"},
        {"profileId": "p2", "lowerCategoryId": "medium", "upperCategoryId": "high"},
    ]
    priorities = {"p1": 0.25, "p2": 0.5}

    within_tie_tolerance = _assign_category_from_ordered_profiles(
        alternative_priority=0.25 - 5e-13,
        profile_priorities=priorities,
        profiles=profiles,
        categories=categories,
    )
    distinctly_below_boundary = _assign_category_from_ordered_profiles(
        alternative_priority=0.25 - 2e-12,
        profile_priorities=priorities,
        profiles=profiles,
        categories=categories,
    )

    assert within_tie_tolerance["id"] == "medium"
    assert distinctly_below_boundary["id"] == "low"


def test_high_consistency_ratio_is_reported_without_blocking_assignment() -> None:
    data = _multiple_profile_input(alternative_profile_values={"supplier-a": (9, 1 / 9)})
    result = _run_multiple_profiles(data)
    assignment = result["resultsByAlternative"]["supplier-a"]
    consistency = assignment["localPrioritiesByCriterion"]["quality"]["consistency"]

    assert consistency["consistencyRatio"] > 0.10
    assert consistency["lambdaMax"] > 3
    assert assignment["categoryId"] in {"low", "medium", "high"}


def test_records_and_alternatives_are_order_independent_and_profile_reciprocity_is_generated() -> None:
    data = _multiple_profile_input(
        alternatives=[{"id": "a", "name": "A"}, {"id": "b", "name": "B"}],
        alternative_profile_values={"a": (1, 1 / 2), "b": (2, 1)},
    )
    reversed_data = deepcopy(data)
    reversed_data["limiting_profiles"].reverse()
    reversed_data["comparisons"].reverse()
    reversed_data["profile_comparisons"] = [
        {
            "criterionId": "quality",
            "firstProfileId": "boundary-medium-high",
            "secondProfileId": "boundary-low-medium",
            "firstToSecond": 2,
        }
    ]
    reversed_data["alternatives"].reverse()

    first = _run_multiple_profiles(data)["resultsByAlternative"]
    second = _run_multiple_profiles(reversed_data)["resultsByAlternative"]

    assert first == second
    matrix = first["a"]["localPrioritiesByCriterion"]["quality"]["pairwiseMatrix"]
    assert matrix[1][2] == 1 / 2
    assert matrix[2][1] == 2
    assert matrix[1][2] * matrix[2][1] == pytest.approx(1.0)


def test_multiple_profile_one_boundary_matches_phase_1a_priorities_and_assignments() -> None:
    binary_data = _ishizaka_2012_case()
    binary_result = _run(binary_data)
    generalized_data = {
        "criteria": binary_data["criteria"],
        "categories": binary_data["categories"],
        "alternatives": binary_data["alternatives"],
        "limiting_profiles": [
            {
                "profileId": binary_data["limiting_profile"]["id"],
                "lowerCategoryId": binary_data["categories"][0]["id"],
                "upperCategoryId": binary_data["categories"][1]["id"],
            }
        ],
        "criterion_weights_by_id": binary_data["criterion_weights_by_id"],
        "comparisons": binary_data["comparisons"],
        "profile_comparisons": [],
    }
    generalized_result = _run_multiple_profiles(generalized_data)

    assert generalized_result["criterionWeightsById"] == binary_result["criterionWeightsById"]
    assert generalized_result["categories"] == binary_result["categories"]
    assert generalized_result["resultsByAlternative"].keys() == binary_result[
        "resultsByAlternative"
    ].keys()
    for alternative_id, binary in binary_result["resultsByAlternative"].items():
        generalized = generalized_result["resultsByAlternative"][alternative_id]
        assert generalized["categoryId"] == binary["categoryId"]
        assert generalized["weightsByCriterion"] == binary["weightsByCriterion"]
        assert generalized["globalPriority"] == binary["globalPriority"]
        assert generalized["profileGlobalPrioritiesById"]["pqq-minimum"] == binary[
            "profileGlobalPriority"
        ]
        assert sum(generalized["profileGlobalPrioritiesById"].values()) + generalized[
            "globalPriority"
        ] == pytest.approx(1.0)
        assert generalized["weightedContributionsByCriterion"] == {
            criterion_id: {
                "alternative": contributions["alternative"],
                "profilesById": {"pqq-minimum": contributions["profile"]},
            }
            for criterion_id, contributions in binary[
                "weightedContributionsByCriterion"
            ].items()
        }
        for criterion_id, binary_local in binary["localPrioritiesByCriterion"].items():
            generalized_local = generalized["localPrioritiesByCriterion"][criterion_id]
            assert generalized_local["pairwiseMatrix"] == binary_local["pairwiseMatrix"]
            assert generalized_local["alternativeToProfileJudgments"]["pqq-minimum"] == binary_local[
                "alternativeToProfileJudgment"
            ]
            assert generalized_local["alternative"] == binary_local["alternative"]
            assert generalized_local["profilesById"]["pqq-minimum"] == binary_local["profile"]
            assert generalized_local["consistency"]["consistencyRatio"] is None


def test_multiple_criteria_weights_are_aggregated_by_id_and_every_matrix_is_retained() -> None:
    criteria = [{"id": "quality", "name": "Quality"}, {"id": "cost", "name": "Cost"}]
    data = _multiple_profile_input(
        criteria=criteria,
        weights={"quality": 0.75, "cost": 0.25},
        alternative_profile_values={"supplier-a": (1, 1 / 2)},
        profile_comparisons=[
            {"criterionId": "quality", "firstProfileId": "boundary-low-medium", "secondProfileId": "boundary-medium-high", "firstToSecond": 1 / 2},
            {"criterionId": "cost", "firstProfileId": "boundary-low-medium", "secondProfileId": "boundary-medium-high", "firstToSecond": 1 / 2},
        ],
    )
    # The helper's comparison generation uses the same profile judgments for
    # each criterion and has one alternative, so both maps are keyed by ID.
    assignment = _multiple_profile_assignment(data)

    assert assignment["weightsByCriterion"] == {"quality": 0.75, "cost": 0.25}
    assert set(assignment["localPrioritiesByCriterion"]) == {"quality", "cost"}
    assert set(assignment["weightedContributionsByCriterion"]) == {"quality", "cost"}
    assert assignment["globalPriority"] == pytest.approx(0.25)
    assert assignment["profileGlobalPrioritiesById"] == pytest.approx(
        {"boundary-low-medium": 0.25, "boundary-medium-high": 0.5}
    )


@pytest.mark.parametrize(
    ("mutate", "message"),
    [
        (lambda data: data["comparisons"].pop(), "comparisons are incomplete"),
        (lambda data: data["comparisons"].append(data["comparisons"][0].copy()), "duplicates"),
        (lambda data: data["comparisons"][0].update(profileId="unknown"), "unknown"),
        (lambda data: data["comparisons"][0].update(alternativeToProfile=1.5), "Saaty"),
        (lambda data: data["profile_comparisons"].clear(), "profile_comparisons are incomplete"),
        (lambda data: data["profile_comparisons"][0].update(firstProfileId="unknown"), "unknown"),
        (lambda data: data["profile_comparisons"][0].update(firstToSecond=1.5), "Saaty"),
        (lambda data: data["limiting_profiles"].pop(), "incomplete"),
        (lambda data: data["limiting_profiles"][0].update(upperCategoryId="high"), "consecutive"),
        (lambda data: data.update(criterion_weights_by_id={"quality": 0.9}), "normalized"),
    ],
)
def test_rejects_invalid_ids_missing_comparisons_and_invalid_configuration(mutate, message: str) -> None:
    data = _multiple_profile_input()
    mutate(data)
    with pytest.raises(ValueError, match=message):
        _run_multiple_profiles(data)


def test_rejects_duplicate_unordered_profile_judgment_even_if_orientation_is_reversed() -> None:
    data = _multiple_profile_input()
    data["profile_comparisons"].append(
        {
            "criterionId": "quality",
            "firstProfileId": "boundary-medium-high",
            "secondProfileId": "boundary-low-medium",
            "firstToSecond": 2,
        }
    )
    with pytest.raises(ValueError, match="duplicates an unordered"):
        _run_multiple_profiles(data)


def test_rejects_duplicate_alternative_profile_ids_and_category_boundary_ids() -> None:
    duplicate_alternative = _multiple_profile_input(
        alternatives=[{"id": "a", "name": "A"}, {"id": "a", "name": "Duplicate"}],
        alternative_profile_values={"a": (1, 1 / 2)},
    )
    with pytest.raises(ValueError, match="duplicate id"):
        _run_multiple_profiles(duplicate_alternative)

    duplicate_profile_id = _multiple_profile_input()
    duplicate_profile_id["limiting_profiles"][1]["profileId"] = "boundary-low-medium"
    with pytest.raises(ValueError, match="duplicate profileId"):
        _run_multiple_profiles(duplicate_profile_id)

    duplicate_boundary = _multiple_profile_input()
    duplicate_boundary["limiting_profiles"][1] = {
        "profileId": "another-profile",
        "lowerCategoryId": "low",
        "upperCategoryId": "medium",
    }
    with pytest.raises(ValueError, match="duplicates category boundary"):
        _run_multiple_profiles(duplicate_boundary)


def test_weighted_profile_priorities_and_alternative_priority_are_not_rounded() -> None:
    data = _multiple_profile_input(alternative_profile_values={"supplier-a": (1, 1 / 2)})
    assignment = _multiple_profile_assignment(data)
    local = assignment["localPrioritiesByCriterion"]["quality"]

    assert assignment["globalPriority"] == local["alternative"]
    assert assignment["profileGlobalPrioritiesById"] == local["profilesById"]
    assert all(isinstance(value, float) for value in assignment["profileGlobalPrioritiesById"].values())


def _central_profile_input(
    *,
    categories: list[dict] | None = None,
    central_profiles: list[dict] | None = None,
    alternatives: list[dict] | None = None,
    criteria: list[dict] | None = None,
    weights: dict | None = None,
    alternative_values_by_criterion: dict[str, dict[str, float]] | None = None,
    comparisons: list[dict] | None = None,
    profile_comparisons: list[dict] | None = None,
    profile_ratio: float = 1 / 2,
    tie_policy: str = "optimistic",
) -> dict:
    categories = categories or [
        {"id": "low", "name": "Low"},
        {"id": "high", "name": "High"},
    ]
    central_profiles = central_profiles or [
        {"profileId": "central-low", "categoryId": categories[0]["id"]},
        {"profileId": "central-high", "categoryId": categories[1]["id"]},
    ]
    alternatives = alternatives or [{"id": "alternative-a", "name": "Alternative A"}]
    criteria = criteria or [{"id": "quality", "name": "Quality"}]
    weights = weights or {criterion["id"]: 1 / len(criteria) for criterion in criteria}
    alternative_values_by_criterion = alternative_values_by_criterion or {
        criterion["id"]: {
            profile["profileId"]: (1 if index == 0 else 1 / 2)
            for index, profile in enumerate(central_profiles)
        }
        for criterion in criteria
    }
    if comparisons is None:
        comparisons = [
            {
                "alternativeId": alternative["id"],
                "criterionId": criterion["id"],
                "profileId": profile["profileId"],
                "alternativeToProfile": alternative_values_by_criterion[criterion["id"]][
                    profile["profileId"]
                ],
            }
            for alternative in alternatives
            for criterion in criteria
            for profile in central_profiles
        ]
    if profile_comparisons is None:
        profile_comparisons = [
            {
                "criterionId": criterion["id"],
                "firstProfileId": central_profiles[first]["profileId"],
                "secondProfileId": central_profiles[second]["profileId"],
                "firstToSecond": profile_ratio,
            }
            for criterion in criteria
            for first in range(len(central_profiles))
            for second in range(first + 1, len(central_profiles))
        ]
    return {
        "criteria": criteria,
        "categories": categories,
        "alternatives": alternatives,
        "central_profiles": central_profiles,
        "criterion_weights_by_id": weights,
        "comparisons": comparisons,
        "profile_comparisons": profile_comparisons,
        "tie_policy": tie_policy,
    }


def _run_central_profiles(data: dict) -> dict:
    return run_ahp_sort_i_central_profiles(**data)


def _central_assignment(data: dict, alternative_id: str = "alternative-a") -> dict:
    return _run_central_profiles(data)["resultsByAlternative"][alternative_id]


def test_central_profiles_two_categories_build_full_matrix_known_vector_and_diagnostics() -> None:
    data = _central_profile_input(
        alternative_values_by_criterion={
            "quality": {"central-low": 1 / 3, "central-high": 1 / 6}
        },
        profile_ratio=1 / 2,
    )
    result = _run_central_profiles(data)
    assignment = result["resultsByAlternative"]["alternative-a"]
    local = assignment["localPrioritiesByCriterion"]["quality"]
    matrix = np.asarray(local["pairwiseMatrix"])
    diagnostics = local["consistency"]

    np.testing.assert_allclose(matrix, [[1, 1 / 3, 1 / 6], [3, 1, 1 / 2], [6, 2, 1]])
    np.testing.assert_allclose(matrix * matrix.T, np.ones((3, 3)))
    assert np.diag(matrix) == pytest.approx([1, 1, 1])
    assert local["alternative"] == pytest.approx(0.1)
    assert local["centralProfilesById"] == pytest.approx(
        {"central-low": 0.3, "central-high": 0.6}
    )
    assert diagnostics["lambdaMax"] == pytest.approx(3.0, abs=1e-12)
    assert diagnostics["consistencyIndex"] == pytest.approx(0.0, abs=1e-12)
    assert diagnostics["randomIndex"] == 0.58
    assert diagnostics["consistencyRatio"] == pytest.approx(0.0, abs=1e-12)
    assert diagnostics["consistencyStatus"] == "consistent"


@pytest.mark.parametrize(
    ("alternative_values", "expected_category", "expected_center"),
    [
        ({"central-low": 1, "central-high": 1 / 2}, "low", "central-low"),
        ({"central-low": 1 / 3, "central-high": 1 / 6}, "low", "central-low"),
        ({"central-low": 4, "central-high": 2}, "high", "central-high"),
        ({"central-low": 2, "central-high": 1}, "high", "central-high"),
    ],
)
def test_central_assignment_selects_nearest_center_for_equal_to_below_and_above_cases(
    alternative_values: dict[str, float], expected_category: str, expected_center: str
) -> None:
    data = _central_profile_input(
        alternative_values_by_criterion={"quality": alternative_values}
    )
    assignment = _central_assignment(data)

    assert assignment["categoryId"] == expected_category
    assert assignment["selectedCenterProfileId"] == expected_center
    assert assignment["tieDetected"] is False
    assert assignment["distanceToSelectedCenter"] == assignment[
        "centerDistancesByProfileId"
    ][expected_center]


@pytest.mark.parametrize(
    ("tie_policy", "expected_profile", "expected_category"),
    [
        ("optimistic", "central-high", "high"),
        ("pessimistic", "central-low", "low"),
    ],
)
def test_exact_midpoint_between_centers_uses_explicit_tie_policy_in_complete_ahp_matrix(
    tie_policy: str, expected_profile: str, expected_category: str
) -> None:
    criteria = [{"id": "quality", "name": "Quality"}]
    # This inconsistent but valid Saaty matrix has principal vector
    # [1/3, 2/9, 4/9], putting the alternative exactly midway between centers.
    data = _central_profile_input(
        criteria=criteria,
        alternative_values_by_criterion={
            "quality": {"central-low": 9, "central-high": 1 / 8}
        },
        profile_ratio=3,
        tie_policy=tie_policy,
    )
    assignment = _central_assignment(data)
    local = assignment["localPrioritiesByCriterion"]["quality"]

    assert local["alternative"] == pytest.approx(1 / 3, abs=1e-12)
    assert local["centralProfilesById"] == pytest.approx(
        {"central-low": 2 / 9, "central-high": 4 / 9}, abs=1e-12
    )
    assert assignment["centerDistancesByProfileId"]["central-low"] == pytest.approx(
        assignment["centerDistancesByProfileId"]["central-high"], abs=1e-12
    )
    assert assignment["tieDetected"] is True
    assert assignment["tiedCenterProfileIds"] == ["central-low", "central-high"]
    assert assignment["selectedCenterProfileId"] == expected_profile
    assert assignment["categoryId"] == expected_category
    assert assignment["tiePolicy"] == tie_policy


def test_central_tie_tolerance_only_groups_distances_within_explicit_epsilon() -> None:
    profiles = [
        {"profileId": "central-low", "categoryId": "low"},
        {"profileId": "central-high", "categoryId": "high"},
    ]
    within_tolerance = _select_nearest_central_profile(
        alternative_priority=0.375 + 1e-13,
        profile_priorities={"central-low": 0.25, "central-high": 0.5},
        profiles=profiles,
        tie_policy="pessimistic",
    )
    outside_tolerance = _select_nearest_central_profile(
        alternative_priority=0.375 + 2e-12,
        profile_priorities={"central-low": 0.25, "central-high": 0.5},
        profiles=profiles,
        tie_policy="pessimistic",
    )

    assert within_tolerance["tieDetected"] is True
    assert within_tolerance["selectedProfile"]["profileId"] == "central-low"
    assert outside_tolerance["tieDetected"] is False
    assert outside_tolerance["selectedProfile"]["profileId"] == "central-high"


@pytest.mark.parametrize("category_count", [3, 4])
def test_three_and_four_categories_assign_by_center_id_and_support_complete_matrices(
    category_count: int,
) -> None:
    categories = [
        {"id": f"category-{index}", "name": f"Category {index}"}
        for index in range(category_count)
    ]
    profiles = [
        {"profileId": f"center-{index}", "categoryId": category["id"]}
        for index, category in enumerate(categories)
    ]
    profile_weights = [2**index for index in range(category_count)]
    profile_comparisons = [
        {
            "criterionId": "quality",
            "firstProfileId": profiles[first]["profileId"],
            "secondProfileId": profiles[second]["profileId"],
            "firstToSecond": profile_weights[first] / profile_weights[second],
        }
        for first in range(category_count)
        for second in range(first + 1, category_count)
    ]
    alternative_values = {
        profile["profileId"]: profile_weights[1] / weight
        for profile, weight in zip(profiles, profile_weights, strict=True)
    }
    data = _central_profile_input(
        categories=categories,
        central_profiles=profiles,
        alternative_values_by_criterion={"quality": alternative_values},
        profile_comparisons=profile_comparisons,
    )

    result = _run_central_profiles(data)
    assignment = result["resultsByAlternative"]["alternative-a"]
    matrix = assignment["localPrioritiesByCriterion"]["quality"]["pairwiseMatrix"]

    assert len(matrix) == category_count + 1
    assert len(matrix[0]) == category_count + 1
    assert assignment["categoryId"] == categories[1]["id"]
    assert assignment["selectedCenterProfileId"] == profiles[1]["profileId"]
    assert assignment["tieDetected"] is False
    assert result["centralProfiles"] == profiles


@pytest.mark.parametrize(
    ("profile_ratio", "expected_condition"), [(2, "inverted"), (1, "coincident")]
)
def test_central_centers_inverted_or_coincident_raise_structured_error(
    profile_ratio: float, expected_condition: str
) -> None:
    data = _central_profile_input(
        alternative_values_by_criterion={
            "quality": {"central-low": 1, "central-high": profile_ratio}
        },
        profile_ratio=profile_ratio,
    )
    with pytest.raises(AHPSortICentralProfileOrderError) as error:
        _run_central_profiles(data)

    assert error.value.code == "ahpsort_i_central_profile_order_invalid"
    assert error.value.alternative_id == "alternative-a"
    assert error.value.profile_ids == ["central-low", "central-high"]
    assert error.value.as_dict()["profilePrioritiesById"] == {
        "central-low": error.value.lower_priority,
        "central-high": error.value.upper_priority,
    }
    if expected_condition == "inverted":
        assert error.value.lower_priority > error.value.upper_priority
    else:
        assert error.value.lower_priority == pytest.approx(error.value.upper_priority, abs=1e-12)


def test_central_profile_order_uses_the_existing_small_numerical_tolerance() -> None:
    profiles = [
        {"profileId": "low", "categoryId": "low"},
        {"profileId": "high", "categoryId": "high"},
    ]
    with pytest.raises(AHPSortICentralProfileOrderError):
        _validate_profile_order(
            alternative_id="alternative-a",
            profiles=profiles,
            profile_priorities={"low": 0.4, "high": 0.4 + 5e-13},
            error_type=AHPSortICentralProfileOrderError,
        )


def test_central_profiles_are_sorted_by_category_id_not_request_order() -> None:
    data = _central_profile_input(
        categories=[
            {"id": "category-low", "name": "Low"},
            {"id": "category-middle", "name": "Middle"},
            {"id": "category-high", "name": "High"},
        ],
        central_profiles=[
            {"profileId": "high-center", "categoryId": "category-high"},
            {"profileId": "low-center", "categoryId": "category-low"},
            {"profileId": "middle-center", "categoryId": "category-middle"},
        ],
        alternative_values_by_criterion={
            "quality": {"high-center": 1 / 4, "low-center": 2, "middle-center": 1}
        },
        profile_comparisons=[
            {"criterionId": "quality", "firstProfileId": "low-center", "secondProfileId": "middle-center", "firstToSecond": 1 / 2},
            {"criterionId": "quality", "firstProfileId": "middle-center", "secondProfileId": "high-center", "firstToSecond": 1 / 2},
            {"criterionId": "quality", "firstProfileId": "low-center", "secondProfileId": "high-center", "firstToSecond": 1 / 4},
        ],
    )

    result = _run_central_profiles(data)

    assert [item["profileId"] for item in result["centralProfiles"]] == [
        "low-center",
        "middle-center",
        "high-center",
    ]


def test_profile_judgments_are_shared_but_central_priorities_are_recomputed_per_alternative() -> None:
    alternatives = [
        {"id": "at-low", "name": "At low center"},
        {"id": "at-high", "name": "At high center"},
    ]
    comparisons = [
        {"alternativeId": "at-low", "criterionId": "quality", "profileId": "central-low", "alternativeToProfile": 1},
        {"alternativeId": "at-low", "criterionId": "quality", "profileId": "central-high", "alternativeToProfile": 1 / 2},
        {"alternativeId": "at-high", "criterionId": "quality", "profileId": "central-low", "alternativeToProfile": 2},
        {"alternativeId": "at-high", "criterionId": "quality", "profileId": "central-high", "alternativeToProfile": 1},
    ]
    data = _central_profile_input(alternatives=alternatives, comparisons=comparisons)
    results = _run_central_profiles(data)["resultsByAlternative"]
    low_matrix = results["at-low"]["localPrioritiesByCriterion"]["quality"]
    high_matrix = results["at-high"]["localPrioritiesByCriterion"]["quality"]

    assert low_matrix["pairwiseMatrix"][1][2] == high_matrix["pairwiseMatrix"][1][2] == 1 / 2
    assert low_matrix["centralProfilesById"] != high_matrix["centralProfilesById"]
    assert results["at-low"]["categoryId"] == "low"
    assert results["at-high"]["categoryId"] == "high"


def test_central_consistency_ratio_above_threshold_is_reported_without_blocking() -> None:
    data = _central_profile_input(
        alternative_values_by_criterion={
            "quality": {"central-low": 9, "central-high": 1 / 9}
        }
    )
    assignment = _central_assignment(data)
    diagnostics = assignment["localPrioritiesByCriterion"]["quality"]["consistency"]

    assert diagnostics["consistencyRatio"] > 0.10
    assert diagnostics["consistencyStatus"] == "review"
    assert assignment["categoryId"] in {"low", "high"}


def test_central_contributions_are_aggregated_by_criterion_id() -> None:
    criteria = [{"id": "quality", "name": "Quality"}, {"id": "cost", "name": "Cost"}]
    data = _central_profile_input(
        criteria=criteria,
        weights={"quality": 0.75, "cost": 0.25},
        alternative_values_by_criterion={
            "quality": {"central-low": 1, "central-high": 1 / 2},
            "cost": {"central-low": 2, "central-high": 1},
        },
        profile_comparisons=[
            {"criterionId": "quality", "firstProfileId": "central-low", "secondProfileId": "central-high", "firstToSecond": 1 / 2},
            {"criterionId": "cost", "firstProfileId": "central-low", "secondProfileId": "central-high", "firstToSecond": 1 / 2},
        ],
    )
    assignment = _central_assignment(data)

    assert set(assignment["localPrioritiesByCriterion"]) == {"quality", "cost"}
    assert assignment["weightsByCriterion"] == {"quality": 0.75, "cost": 0.25}
    assert assignment["globalPriority"] == pytest.approx(0.2875)
    assert assignment["centralProfilePrioritiesById"] == pytest.approx(
        {"central-low": 0.2375, "central-high": 0.475}
    )
    assert assignment["categoryId"] == "low"


@pytest.mark.parametrize("tie_policy", [None, "optimistic", "pessimistic", "arbitrary", "Optimistic"])
def test_central_tie_policy_is_mandatory_and_restricted_to_documented_values(tie_policy) -> None:
    if tie_policy is None:
        data = _central_profile_input()
        del data["tie_policy"]
        with pytest.raises(TypeError):
            _run_central_profiles(data)
    elif tie_policy in {"optimistic", "pessimistic"}:
        data = _central_profile_input(tie_policy=tie_policy)
        assert _run_central_profiles(data)["tiePolicy"] == tie_policy
    else:
        data = _central_profile_input(tie_policy=tie_policy)
        with pytest.raises(ValueError, match="tie_policy must be exactly"):
            _run_central_profiles(data)


@pytest.mark.parametrize("tie_policy", [[], {"policy": "optimistic"}])
def test_central_tie_policy_rejects_non_string_values_without_type_errors(tie_policy) -> None:
    data = _central_profile_input(tie_policy=tie_policy)

    with pytest.raises(ValueError, match="tie_policy must be exactly"):
        _run_central_profiles(data)


@pytest.mark.parametrize(
    ("mutate", "message"),
    [
        (lambda data: data["central_profiles"].pop(), "exactly one profile per category"),
        (lambda data: data["central_profiles"][0].update(categoryId="unknown"), "unknown categoryId"),
        (lambda data: data["central_profiles"][1].update(profileId="central-low"), "duplicate profileId"),
        (lambda data: data["central_profiles"][1].update(categoryId="low"), "duplicate categoryId"),
        (lambda data: data["comparisons"].pop(), "comparisons are incomplete"),
        (lambda data: data["comparisons"][0].update(alternativeId="unknown"), "unknown alternative"),
        (lambda data: data["comparisons"][0].update(alternativeToProfile=1.5), "Saaty"),
        (lambda data: data["profile_comparisons"].clear(), "profile_comparisons are incomplete"),
        (lambda data: data["profile_comparisons"][0].update(secondProfileId="unknown"), "unknown criterion or profile"),
        (lambda data: data["profile_comparisons"][0].update(firstToSecond=0), "Saaty"),
        (lambda data: data.update(criterion_weights_by_id={"quality": 0.7}), "normalized"),
    ],
)
def test_central_profile_contract_rejects_missing_duplicate_unknown_and_invalid_values(
    mutate, message: str
) -> None:
    data = _central_profile_input()
    mutate(data)
    with pytest.raises(ValueError, match=message):
        _run_central_profiles(data)


def test_central_contract_rejects_duplicate_unordered_profile_judgments() -> None:
    data = _central_profile_input()
    data["profile_comparisons"].append(
        {
            "criterionId": "quality",
            "firstProfileId": "central-high",
            "secondProfileId": "central-low",
            "firstToSecond": 2,
        }
    )
    with pytest.raises(ValueError, match="duplicates an unordered"):
        _run_central_profiles(data)


def test_central_profile_matrix_size_respects_existing_random_index_limit() -> None:
    categories = [
        {"id": f"c{index}", "name": f"Category {index}"} for index in range(15)
    ]
    profiles = [
        {"profileId": f"p{index}", "categoryId": category["id"]}
        for index, category in enumerate(categories)
    ]
    data = _central_profile_input(categories=categories, central_profiles=profiles)

    with pytest.raises(ValueError, match="14 central profiles/categories"):
        _run_central_profiles(data)
