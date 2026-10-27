from copy import deepcopy
import math

import numpy as np
import pytest

from models.ahp_criteria_weights.run import (
    CONSISTENCY_REVIEW_THRESHOLD,
    _build_matrix,
    run_ahp_criteria_weights,
)
from models.ahp_criteria_weights.diagnostics import (
    MAX_REPORTED_TRIADS,
    MAX_RECOMMENDATIONS,
    SAATY_SCALE_VALUES,
    diagnose_ahp_consistency,
)


def _evaluation(expert_id: str, comparisons: list[dict]) -> dict:
    return {
        "expert": {"id": expert_id, "name": expert_id.title()},
        "payload": {"comparisons": comparisons},
    }


def _context(criteria: list[dict]) -> dict:
    return {"criteria": criteria}


def _criteria(names: str) -> list[dict]:
    return [{"id": name.lower(), "name": name} for name in names.split(",")]


def _three_criteria_inconsistent() -> tuple[list[dict], dict]:
    criteria = _criteria("Quality,Cost,Sustainability")
    evaluation = _evaluation(
        "expert-1",
        [
            {"criterionId": "quality", "comparedCriterionId": "cost", "value": 9},
            {"criterionId": "quality", "comparedCriterionId": "sustainability", "value": 1},
            {"criterionId": "cost", "comparedCriterionId": "sustainability", "value": 9},
        ],
    )
    return criteria, evaluation


def test_perfectly_consistent_matrix_has_no_discrepant_triads_or_recommendations() -> None:
    criteria = _criteria("Quality,Cost,Sustainability")
    evaluation = _evaluation(
        "expert-1",
        [
            {"criterionId": "quality", "comparedCriterionId": "cost", "value": 2},
            {"criterionId": "quality", "comparedCriterionId": "sustainability", "value": 6},
            {"criterionId": "cost", "comparedCriterionId": "sustainability", "value": 3},
        ],
    )

    result = diagnose_ahp_consistency(context=_context(criteria), evaluation=evaluation)

    assert result["consistencyRatio"] == pytest.approx(0.0, abs=1e-12)
    assert result["consistencyIndex"] == pytest.approx(0.0, abs=1e-12)
    assert result["lambdaMax"] == pytest.approx(3.0)
    assert result["consistencyStatus"] == "consistent"
    assert result["consistencyThreshold"] == CONSISTENCY_REVIEW_THRESHOLD
    assert result["triads"] == []
    assert result["recommendations"] == []


def test_acceptable_inconsistent_matrix_keeps_review_threshold_semantics() -> None:
    names = ["Experience", "Flexibility", "Security", "Resilience", "Environment"]
    criteria = [{"id": f"c{index}", "name": name} for index, name in enumerate(names)]
    values = [7, 4, 7, 8, 1 / 4, 1, 3, 4, 5, 3]
    comparisons = []
    cursor = 0
    for row in range(len(criteria)):
        for column in range(row + 1, len(criteria)):
            comparisons.append({
                "criterionId": criteria[row]["id"],
                "comparedCriterionId": criteria[column]["id"],
                "value": values[cursor],
            })
            cursor += 1

    result = diagnose_ahp_consistency(
        context=_context(criteria),
        evaluation=_evaluation("expert-1", comparisons),
    )

    assert result["consistencyRatio"] == pytest.approx(0.0511905, abs=1e-6)
    assert result["consistencyStatus"] == "consistent"
    assert result["consistencyRatio"] <= result["consistencyThreshold"]


def test_inconsistent_triad_reports_oriented_values_and_all_three_review_candidates() -> None:
    criteria, evaluation = _three_criteria_inconsistent()

    result = diagnose_ahp_consistency(context=_context(criteria), evaluation=evaluation)

    assert result["consistencyRatio"] > 0.10
    assert result["consistencyStatus"] == "review"
    assert len(result["triads"]) == 1
    triad = result["triads"][0]
    assert triad["criteria"] == [
        {"id": "quality", "name": "Quality"},
        {"id": "cost", "name": "Cost"},
        {"id": "sustainability", "name": "Sustainability"},
    ]
    assert [
        (comparison["fromCriterionId"], comparison["toCriterionId"], comparison["value"])
        for comparison in triad["comparisons"]
    ] == [
        ("quality", "cost", 9.0),
        ("cost", "sustainability", 9.0),
        ("quality", "sustainability", 1.0),
    ]
    assert triad["impliedRatio"] == pytest.approx(81.0)
    assert triad["directRatio"] == pytest.approx(1.0)
    assert triad["cycleRatio"] == pytest.approx(81.0)
    assert triad["multiplicativeDiscrepancy"] == pytest.approx(math.log(81.0))
    assert len(triad["candidateComparisons"]) == 3
    assert len(result["candidateComparisons"]) == 3


def test_diagnostic_reuses_final_solver_cr_values_exactly() -> None:
    criteria, evaluation = _three_criteria_inconsistent()
    final = run_ahp_criteria_weights(
        context=_context(criteria),
        evaluations=[evaluation],
    )["expertDiagnosticsByExpert"]["expert-1"]
    preview = diagnose_ahp_consistency(context=_context(criteria), evaluation=evaluation)

    for field in (
        "lambdaMax",
        "consistencyIndex",
        "randomIndex",
        "consistencyRatio",
        "consistencyStatus",
        "completedComparisons",
        "requiredComparisons",
    ):
        assert preview[field] == final[field]


def test_recommendations_are_valid_counterfactuals_and_do_not_mutate_input() -> None:
    criteria, evaluation = _three_criteria_inconsistent()
    original = deepcopy(evaluation)

    result = diagnose_ahp_consistency(context=_context(criteria), evaluation=evaluation)

    assert evaluation == original
    assert 0 < len(result["recommendations"]) <= MAX_RECOMMENDATIONS
    assert all(item["suggestedValue"] in SAATY_SCALE_VALUES for item in result["recommendations"])
    assert all(item["originalCR"] == result["consistencyRatio"] for item in result["recommendations"])
    assert all(item["counterfactualCR"] < item["originalCR"] for item in result["recommendations"])
    assert all(
        item["improvement"] == pytest.approx(item["originalCR"] - item["counterfactualCR"])
        for item in result["recommendations"]
    )
    assert result["recommendations"] == sorted(
        result["recommendations"],
        key=lambda item: (
            -item["improvement"],
            item["counterfactualCR"],
        ),
    )


def test_recommendation_uses_stored_orientation_and_counterfactual_is_reciprocal() -> None:
    criteria = _criteria("A,B,C")
    evaluation = _evaluation(
        "expert-1",
        [
            {"criterionId": "b", "comparedCriterionId": "a", "value": 1 / 9},
            {"criterionId": "a", "comparedCriterionId": "c", "value": 1},
            {"criterionId": "c", "comparedCriterionId": "b", "value": 1 / 9},
        ],
    )

    result = diagnose_ahp_consistency(context=_context(criteria), evaluation=evaluation)
    matrix, _ = _build_matrix(evaluation=evaluation, criteria=criteria, evaluation_index=0)

    assert result["triads"][0]["comparisons"][0]["value"] == pytest.approx(9.0)
    assert result["triads"][0]["comparisons"][0]["storedComparison"] == {
        "criterionId": "b",
        "comparedCriterionId": "a",
        "value": 1 / 9,
    }
    assert result["recommendations"]
    recommendation = result["recommendations"][0]
    first = recommendation["comparison"]["criterionId"]
    second = recommendation["comparison"]["comparedCriterionId"]
    modified = deepcopy(evaluation)
    for comparison in modified["payload"]["comparisons"]:
        if {comparison["criterionId"], comparison["comparedCriterionId"]} == {first, second}:
            comparison["value"] = recommendation["suggestedValue"]
            break
    counterfactual, _ = _build_matrix(evaluation=modified, criteria=criteria, evaluation_index=0)
    np.testing.assert_allclose(counterfactual * counterfactual.T, np.ones_like(counterfactual))
    assert matrix[0, 1] * matrix[1, 0] == pytest.approx(1.0)
    final_result = run_ahp_criteria_weights(
        context=_context(criteria),
        evaluations=[modified],
    )["expertDiagnosticsByExpert"]["expert-1"]
    assert final_result["consistencyRatio"] == recommendation["counterfactualCR"]


def test_saaty_scale_contains_exactly_the_seventeen_supported_ratios() -> None:
    assert SAATY_SCALE_VALUES == (
        1 / 9,
        1 / 8,
        1 / 7,
        1 / 6,
        1 / 5,
        1 / 4,
        1 / 3,
        1 / 2,
        1.0,
        2.0,
        3.0,
        4.0,
        5.0,
        6.0,
        7.0,
        8.0,
        9.0,
    )


def test_one_and_two_criteria_report_cr_as_not_applicable() -> None:
    one_criterion = _criteria("Only")
    one_result = diagnose_ahp_consistency(
        context=_context(one_criterion),
        evaluation=_evaluation("expert-1", []),
    )
    assert one_result["consistencyRatio"] is None
    assert one_result["consistencyIndex"] is None
    assert one_result["consistencyStatus"] == "not_applicable"

    two_criteria = _criteria("A,B")
    two_result = diagnose_ahp_consistency(
        context=_context(two_criteria),
        evaluation=_evaluation(
            "expert-1",
            [{"criterionId": "a", "comparedCriterionId": "b", "value": 9}],
        ),
    )
    assert two_result["consistencyRatio"] is None
    assert two_result["consistencyIndex"] is None
    assert two_result["consistencyStatus"] == "not_applicable"
    assert two_result["triads"] == []
    assert two_result["recommendations"] == []


@pytest.mark.parametrize(
    "comparisons",
    [
        [],
        [{"criterionId": "a", "comparedCriterionId": "b", "value": 2}],
        [
            {"criterionId": "a", "comparedCriterionId": "b", "value": 2},
            {"criterionId": "b", "comparedCriterionId": "a", "value": 0.5},
            {"criterionId": "a", "comparedCriterionId": "c", "value": 3},
        ],
        [
            {"criterionId": "a", "comparedCriterionId": "b", "value": 1.5},
            {"criterionId": "a", "comparedCriterionId": "c", "value": 3},
            {"criterionId": "b", "comparedCriterionId": "c", "value": 2},
        ],
    ],
)
def test_incomplete_duplicate_and_out_of_scale_matrices_are_rejected(comparisons) -> None:
    with pytest.raises(ValueError):
        diagnose_ahp_consistency(
            context=_context(_criteria("A,B,C")),
            evaluation=_evaluation("expert-1", comparisons),
        )


def test_results_are_deterministic_and_triads_and_recommendations_are_bounded() -> None:
    criteria = _criteria("A,B,C,D,E,F,G")
    comparisons = []
    for row in range(len(criteria)):
        for column in range(row + 1, len(criteria)):
            value = SAATY_SCALE_VALUES[(row * 3 + column * 5) % len(SAATY_SCALE_VALUES)]
            comparisons.append({
                "criterionId": criteria[row]["id"],
                "comparedCriterionId": criteria[column]["id"],
                "value": value,
            })
    evaluation = _evaluation("expert-1", comparisons)

    first = diagnose_ahp_consistency(context=_context(criteria), evaluation=evaluation)
    second = diagnose_ahp_consistency(context=_context(criteria), evaluation=evaluation)

    assert first == second
    assert len(first["triads"]) <= MAX_REPORTED_TRIADS
    assert len(first["recommendations"]) <= MAX_RECOMMENDATIONS
    candidate_pairs = [
        frozenset((item["criterionId"], item["comparedCriterionId"]))
        for item in first["candidateComparisons"]
    ]
    assert len(candidate_pairs) == len(set(candidate_pairs))
    discrepancies = [triad["multiplicativeDiscrepancy"] for triad in first["triads"]]
    assert discrepancies == sorted(discrepancies, reverse=True)


def test_maximum_supported_criteria_complete_matrix_is_supported() -> None:
    criteria = [{"id": f"c{index}", "name": f"Criterion {index}"} for index in range(15)]
    comparisons = [
        {
            "criterionId": criteria[row]["id"],
            "comparedCriterionId": criteria[column]["id"],
            "value": 1,
        }
        for row in range(len(criteria))
        for column in range(row + 1, len(criteria))
    ]

    result = diagnose_ahp_consistency(
        context=_context(criteria),
        evaluation=_evaluation("expert-1", comparisons),
    )

    assert result["criterionCount"] == 15
    assert result["completedComparisons"] == result["requiredComparisons"] == 105
    assert result["consistencyRatio"] == pytest.approx(0.0, abs=1e-12)
    assert result["triads"] == []
