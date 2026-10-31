"""Independent numerical checks against published AHPSort reference data.

The expected vectors in this file are produced from the source judgments with
small NumPy/equation-level calculations. The audited model functions are used
only as the system under test, never to generate the expected values.
"""

from __future__ import annotations

import numpy as np
import pytest

from models.ahp_criteria_weights.run import run_ahp_criteria_weights
from models.ahp_sort_i.group import aggregate_category_votes
from models.ahp_sort_i.run import (
    run_ahp_sort_i,
    run_ahp_sort_i_central_profiles,
    run_ahp_sort_i_multiple_profiles,
)
from services.criteria_weights_consensus.mcc_weights import solve_mcc_weights


def _independent_principal_priorities(matrix: list[list[float]]) -> tuple[float, np.ndarray]:
    """Solve the principal right eigenpair without using DMS implementation."""
    values, vectors = np.linalg.eig(np.asarray(matrix, dtype=float))
    index = int(np.argmax(values.real))
    eigenvalue = float(values[index].real)
    vector = vectors[:, index].real
    if vector.sum() < 0:
        vector = -vector
    priorities = vector / vector.sum()
    return eigenvalue, priorities


def _reciprocal_matrix(size: int, judgments: list[tuple[int, int, float]]) -> list[list[float]]:
    matrix = np.ones((size, size), dtype=float)
    for row, column, value in judgments:
        matrix[row, column] = value
        matrix[column, row] = 1 / value
    return matrix.tolist()


def test_published_2012_criteria_matrix_independently_reproduces_table_4() -> None:
    names = ["Experience", "Flexibility", "Security", "Resilience", "Environment"]
    criteria = [{"id": f"c{index}", "name": name} for index, name in enumerate(names)]
    source_upper_triangle = [7, 4, 7, 8, 1 / 4, 1, 3, 4, 5, 3]
    judgments = []
    comparisons = []
    cursor = 0
    for row in range(len(criteria)):
        for column in range(row + 1, len(criteria)):
            value = source_upper_triangle[cursor]
            cursor += 1
            judgments.append((row, column, value))
            comparisons.append(
                {
                    "criterionId": criteria[row]["id"],
                    "comparedCriterionId": criteria[column]["id"],
                    "value": value,
                }
            )

    matrix = _reciprocal_matrix(len(criteria), judgments)
    independent_lambda, independent_weights = _independent_principal_priorities(matrix)
    ci = (independent_lambda - len(criteria)) / (len(criteria) - 1)
    cr = ci / 1.12  # Saaty's RI for n=5; the 2012 paper reports CR ≈ 0.05.

    response = run_ahp_criteria_weights(
        context={"criteria": criteria},
        evaluations=[
            {
                "expert": {"id": "source-case"},
                "payload": {"comparisons": comparisons},
            }
        ],
    )
    actual = response["expertResultsByExpert"]["source-case"]

    assert np.asarray(matrix) * np.asarray(matrix).T == pytest.approx(np.ones((5, 5)))
    assert independent_weights == pytest.approx(
        [0.565, 0.081, 0.234, 0.081, 0.040], abs=0.0005
    )
    assert actual["weightsByCriterion"] == pytest.approx(
        dict(zip((item["id"] for item in criteria), independent_weights, strict=True)),
        abs=1e-10,
    )
    assert actual["lambdaMax"] == pytest.approx(independent_lambda, abs=1e-10)
    assert actual["consistencyIndex"] == pytest.approx(ci, abs=1e-10)
    assert actual["randomIndex"] == 1.12
    assert actual["consistencyRatio"] == pytest.approx(cr, abs=1e-10)
    assert round(cr, 2) == 0.05
    assert actual["consistencyStatus"] == "consistent"


ISHIZAKA_2012_LOCAL_JUDGMENTS = {
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

ISHIZAKA_2012_TABLE5_LOCAL = {
    "A": [0.9, 0.9, 0.9, 0.9, 0.9],
    "B": [0.9, 0.9, 0.9, 0.9, 0.9],
    "C": [0.889, 0.9, 0.9, 0.9, 0.9],
    "D": [0.875, 0.9, 0.833, 0.167, 0.9],
    "E": [0.833, 0.875, 0.875, 0.167, 0.833],
    "F": [0.5, 0.143, 0.9, 0.9, 0.9],
    "G": [0.833, 0.75, 0.5, 0.833, 0.833],
    "H": [0.125, 0.9, 0.5, 0.9, 0.9],
    "I": [0.2, 0.125, 0.8, 0.167, 0.167],
    "J": [0.1, 0.125, 0.5, 0.5, 0.5],
    "K": [0.111, 0.1, 0.5, 0.167, 0.167],
    "L": [0.1, 0.1, 0.1, 0.1, 0.1],
}

ISHIZAKA_2012_TABLE5_GLOBAL = {
    "A": 0.900,
    "B": 0.900,
    "C": 0.894,
    "D": 0.809,
    "E": 0.791,
    "F": 0.577,
    "G": 0.715,
    "H": 0.386,
    "I": 0.332,
    "J": 0.300,
    "K": 0.252,
    "L": 0.100,
}


def test_2012_supplier_case_independently_reproduces_local_global_and_categories() -> None:
    criteria = [
        {"id": name.lower(), "name": name}
        for name in ("Experience", "Flexibility", "Security", "Resilience", "Environment")
    ]
    pair_values = [7, 4, 7, 8, 1 / 4, 1, 3, 4, 5, 3]
    criterion_judgments = []
    cursor = 0
    for row in range(5):
        for column in range(row + 1, 5):
            value = pair_values[cursor]
            cursor += 1
            criterion_judgments.append((row, column, value))

    weights_matrix = _reciprocal_matrix(5, criterion_judgments)
    _, weights = _independent_principal_priorities(weights_matrix)
    alternatives = [{"id": f"s-{name.lower()}", "name": name} for name in "ABCDEFGHIJKL"]
    comparisons = [
        {
            "alternativeId": alternative["id"],
            "criterionId": criterion["id"],
            "profileId": "threshold",
            "alternativeToProfile": judgment,
        }
        for alternative in alternatives
        for criterion, judgment in zip(
            criteria,
            ISHIZAKA_2012_LOCAL_JUDGMENTS[alternative["name"]],
            strict=True,
        )
    ]

    independent_local = {
        supplier: [judgment / (1 + judgment) for judgment in judgments]
        for supplier, judgments in ISHIZAKA_2012_LOCAL_JUDGMENTS.items()
    }
    independent_global = {
        supplier: float(np.dot(weights, local))
        for supplier, local in independent_local.items()
    }
    independent_category = {
        supplier: "accepted" if priority >= 0.5 else "rejected"
        for supplier, priority in independent_global.items()
    }

    actual = run_ahp_sort_i(
        criteria=criteria,
        categories=[
            {"id": "rejected", "name": "Rejected"},
            {"id": "accepted", "name": "Accepted"},
        ],
        alternatives=alternatives,
        limiting_profile={"id": "threshold", "name": "PQQ minimum"},
        criterion_weights_by_id=dict(zip((item["id"] for item in criteria), weights, strict=True)),
        comparisons=comparisons,
    )

    table_local_mismatches = []
    global_table_mismatches = []
    for supplier in "ABCDEFGHIJKL":
        evidence = actual["resultsByAlternative"][f"s-{supplier.lower()}"]
        actual_locals = [
            evidence["localPrioritiesByCriterion"][criterion["id"]]["alternative"]
            for criterion in criteria
        ]
        assert actual_locals == pytest.approx(independent_local[supplier], abs=1e-12)
        assert evidence["globalPriority"] == pytest.approx(independent_global[supplier], abs=1e-12)
        assert evidence["categoryId"] == independent_category[supplier]
        table_local_mismatches.extend(
            (supplier, index)
            for index, (actual_value, table_value) in enumerate(
                zip(independent_local[supplier], ISHIZAKA_2012_TABLE5_LOCAL[supplier], strict=True)
            )
            if abs(actual_value - table_value) > 0.0005
        )
        if abs(independent_global[supplier] - ISHIZAKA_2012_TABLE5_GLOBAL[supplier]) > 0.0005:
            global_table_mismatches.append(supplier)

    assert table_local_mismatches == [("J", 1)]
    assert independent_local["J"][1] == pytest.approx(0.1, abs=1e-12)
    assert ISHIZAKA_2012_TABLE5_LOCAL["J"][1] == 0.125
    assert global_table_mismatches == list("DEFGHIJK")
    assert [supplier for supplier in "ABCDEFGHIJKL" if independent_category[supplier] == "accepted"] == list("ABCDEFG")


def test_limiting_and_central_multicategory_matrices_match_independent_eigenpairs() -> None:
    # One criterion; source judgments encode the consistent vector [6, 1, 2]
    # for [alternative, lower boundary/center, upper boundary/center].
    expected_matrix = [
        [1, 6, 3],
        [1 / 6, 1, 1 / 2],
        [1 / 3, 2, 1],
    ]
    expected_lambda, expected_priorities = _independent_principal_priorities(expected_matrix)
    assert expected_priorities == pytest.approx([2 / 3, 1 / 9, 2 / 9], abs=1e-12)
    assert expected_lambda == pytest.approx(3.0, abs=1e-12)

    criteria = [{"id": "q", "name": "Quality"}]
    alternatives = [{"id": "a", "name": "Alternative"}]
    limiting = run_ahp_sort_i_multiple_profiles(
        criteria=criteria,
        categories=[
            {"id": "low", "name": "Low"},
            {"id": "mid", "name": "Medium"},
            {"id": "high", "name": "High"},
        ],
        alternatives=alternatives,
        limiting_profiles=[
            {"profileId": "b1", "lowerCategoryId": "low", "upperCategoryId": "mid"},
            {"profileId": "b2", "lowerCategoryId": "mid", "upperCategoryId": "high"},
        ],
        criterion_weights_by_id={"q": 1.0},
        comparisons=[
            {"alternativeId": "a", "criterionId": "q", "profileId": "b1", "alternativeToProfile": 6},
            {"alternativeId": "a", "criterionId": "q", "profileId": "b2", "alternativeToProfile": 3},
        ],
        profile_comparisons=[
            {"criterionId": "q", "firstProfileId": "b1", "secondProfileId": "b2", "firstToSecond": 1 / 2}
        ],
    )
    limiting_assignment = limiting["resultsByAlternative"]["a"]
    limiting_local = limiting_assignment["localPrioritiesByCriterion"]["q"]
    np.testing.assert_allclose(limiting_local["pairwiseMatrix"], expected_matrix, atol=1e-12)
    assert limiting_local["alternative"] == pytest.approx(expected_priorities[0], abs=1e-12)
    assert limiting_local["profilesById"] == pytest.approx({"b1": 1 / 9, "b2": 2 / 9}, abs=1e-12)
    assert limiting_local["consistency"]["lambdaMax"] == pytest.approx(expected_lambda, abs=1e-12)
    assert limiting_assignment["globalPriority"] == pytest.approx(2 / 3, abs=1e-12)
    assert limiting_assignment["categoryId"] == "high"

    central = run_ahp_sort_i_central_profiles(
        criteria=criteria,
        categories=[{"id": "low", "name": "Low"}, {"id": "high", "name": "High"}],
        alternatives=alternatives,
        central_profiles=[
            {"profileId": "c-low", "categoryId": "low"},
            {"profileId": "c-high", "categoryId": "high"},
        ],
        criterion_weights_by_id={"q": 1.0},
        comparisons=[
            {"alternativeId": "a", "criterionId": "q", "profileId": "c-low", "alternativeToProfile": 6},
            {"alternativeId": "a", "criterionId": "q", "profileId": "c-high", "alternativeToProfile": 3},
        ],
        profile_comparisons=[
            {"criterionId": "q", "firstProfileId": "c-low", "secondProfileId": "c-high", "firstToSecond": 1 / 2}
        ],
        tie_policy="optimistic",
    )
    central_assignment = central["resultsByAlternative"]["a"]
    central_local = central_assignment["localPrioritiesByCriterion"]["q"]
    np.testing.assert_allclose(central_local["pairwiseMatrix"], expected_matrix, atol=1e-12)
    assert central_local["alternative"] == pytest.approx(expected_priorities[0], abs=1e-12)
    assert central_local["centralProfilesById"] == pytest.approx({"c-low": 1 / 9, "c-high": 2 / 9}, abs=1e-12)
    assert central_assignment["categoryId"] == "high"


@pytest.mark.parametrize(
    ("expert_count", "votes", "policy", "expected"),
    [
        (2, ["low", "high"], "optimistic", "high"),
        (3, ["low", "high", "high"], "pessimistic", "high"),
        (3, ["low", "mid", "high"], "optimistic", "high"),
        (4, ["low", "low", "high", "high"], "optimistic", "high"),
        (4, ["low", "mid", "mid", "high"], "pessimistic", "mid"),
        (5, ["low", "low", "mid", "mid", "high"], "pessimistic", "low"),
    ],
)
def test_dss_group_vote_cases_are_explicit_and_not_mislabeled_as_article_distance_rule(
    expert_count: int,
    votes: list[str],
    policy: str,
    expected: str,
) -> None:
    categories = [{"categoryId": item, "order": index} for index, item in enumerate(("low", "mid", "high"))]
    assignments, diagnostics = aggregate_category_votes(
        categories=categories,
        alternatives=[{"id": "a", "name": "Alternative"}],
        category_by_expert_and_alternative={
            f"expert-{index}": {"a": category}
            for index, category in enumerate(votes)
        },
        tie_policy=policy,
    )
    assert len(votes) == expert_count
    assert assignments == [{"alternativeId": "a", "categoryId": expected}]
    assert diagnostics["a"]["selectedCategoryId"] == expected


def test_published_gahpsort_distance_tie_can_disagree_with_dss_optimistic_tie() -> None:
    # Two experts split across adjacent classes at limiting score 0.5.
    # Article step 9 chooses the lower class because its side's summed distance
    # is larger: |0.05 - 0.5| > |0.51 - 0.5|. The DSS has no priorities at
    # this layer and resolves the same 1:1 votes optimistically to High.
    lower_side_distance = abs(0.05 - 0.5)
    upper_side_distance = abs(0.51 - 0.5)
    article_limiting_choice = "low" if lower_side_distance > upper_side_distance else "high"

    assignments, _ = aggregate_category_votes(
        categories=[{"categoryId": "low", "order": 0}, {"categoryId": "high", "order": 1}],
        alternatives=[{"id": "a", "name": "Alternative"}],
        category_by_expert_and_alternative={
            "expert-low": {"a": "low"},
            "expert-high": {"a": "high"},
        },
        tie_policy="optimistic",
    )
    assert article_limiting_choice == "low"
    assert assignments[0]["categoryId"] == "high"

    # For central profiles .25 and .75, the lower-assigned expert at .24 and
    # upper-assigned expert at .55 give aggregate distances .31 and .71;
    # GAHPSort's smaller-distance rule selects Low, while DSS still selects
    # High through the optimistic ordinal tie policy.
    lower_center_distance = abs(0.24 - 0.25) + abs(0.55 - 0.25)
    upper_center_distance = abs(0.24 - 0.75) + abs(0.55 - 0.75)
    article_central_choice = "low" if lower_center_distance < upper_center_distance else "high"
    assert (lower_center_distance, upper_center_distance) == pytest.approx((0.31, 0.71))
    assert article_central_choice == "low"


def test_2017_published_vendor_9_scores_expose_case_method_disagreement() -> None:
    # Table 5 reports individual scores and an overall score. Applying the
    # stated two-class .5 threshold to individual scores then Step 9 majority
    # produces eight upper assignments; the printed overall scores yield seven.
    published = {
        "Vendor 2": ([0.814, 0.816, 0.800], 0.811),
        "Vendor 1": ([0.660, 0.655, 0.626], 0.647),
        "Vendor 3": ([0.636, 0.597, 0.631], 0.625),
        "Vendor 4": ([0.619, 0.619, 0.619], 0.614),
        "Vendor 5": ([0.534, 0.532, 0.586], 0.548),
        "Vendor 8": ([0.243, 0.655, 0.741], 0.524),
        "Vendor 11": ([0.195, 0.613, 0.742], 0.508),
        "Vendor 10": ([0.192, 0.443, 0.803], 0.468),
        "Vendor 9": ([0.247, 0.507, 0.528], 0.424),
        "Vendor 7": ([0.243, 0.443, 0.634], 0.421),
        "Vendor 6": ([0.227, 0.670, 0.395], 0.412),
    }
    individual_votes_by_vendor = {
        vendor: ["high" if value > 0.5 else "low" for value in scores]
        for vendor, (scores, _overall) in published.items()
    }
    overall_assignments = {
        vendor: "high" if overall > 0.5 else "low"
        for vendor, (_scores, overall) in published.items()
    }
    assignments, diagnostics = aggregate_category_votes(
        categories=[{"categoryId": "low", "order": 0}, {"categoryId": "high", "order": 1}],
        alternatives=[{"id": vendor, "name": vendor} for vendor in published],
        category_by_expert_and_alternative={
            f"dm-{index}": {
                vendor: votes[index]
                for vendor, votes in individual_votes_by_vendor.items()
            }
            for index in range(3)
        },
        tie_policy="pessimistic",
    )
    majority_categories = {item["alternativeId"]: item["categoryId"] for item in assignments}
    assert individual_votes_by_vendor["Vendor 9"] == ["low", "high", "high"]
    assert majority_categories["Vendor 9"] == "high"
    assert diagnostics["Vendor 9"]["aggregationStatus"] == "unique_plurality"
    assert sum(value == "high" for value in majority_categories.values()) == 8
    assert sum(value == "high" for value in overall_assignments.values()) == 7
    assert {vendor for vendor in published if majority_categories[vendor] != overall_assignments[vendor]} == {"Vendor 9"}


def test_mcc_result_satisfies_independently_checked_consensus_lp_constraints() -> None:
    criteria = [{"id": item, "name": item.upper()} for item in ("a", "b", "c")]
    original = {
        "expert-1": {"a": 0.8, "b": 0.1, "c": 0.1},
        "expert-2": {"a": 0.1, "b": 0.6, "c": 0.3},
    }
    epsilon = 0.05
    result = solve_mcc_weights(
        criteria=criteria,
        expert_weights_by_expert=original,
        eps=epsilon,
    )

    original_matrix = np.asarray(
        [[original[expert][criterion["id"]] for criterion in criteria] for expert in sorted(original)],
        dtype=float,
    )
    adjusted_matrix = np.asarray(
        [[result["adjustedWeightsByExpert"][expert][criterion["id"]] for criterion in criteria]
         for expert in sorted(original)],
        dtype=float,
    )
    collective = np.asarray([result["weightsByCriterion"][item["id"]] for item in criteria])

    # Check the published LP semantics directly: normalized adjusted vectors,
    # normalized collective vector, equal-expert mean link and epsilon box.
    np.testing.assert_allclose(adjusted_matrix.sum(axis=1), np.ones(2), atol=1e-8)
    np.testing.assert_allclose(collective.sum(), 1.0, atol=1e-8)
    np.testing.assert_allclose(adjusted_matrix.mean(axis=0), collective, atol=1e-8)
    assert np.max(np.abs(adjusted_matrix - collective)) <= epsilon + 1e-8
    independently_calculated_l1_cost = np.abs(adjusted_matrix - original_matrix).sum()
    assert result["objective"] == pytest.approx(independently_calculated_l1_cost, abs=1e-8)
    assert not np.allclose(collective, original_matrix.mean(axis=0), atol=1e-8)
