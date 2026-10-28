from __future__ import annotations

from copy import deepcopy

import numpy as np
import pytest

from models.ahp_criteria_weights.run import run_ahp_criteria_weights
from models.ahp_sort_i.run import run_ahp_sort_i


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
