from __future__ import annotations

import json
import math
from copy import deepcopy
from pathlib import Path

import pytest
from models.ahp_criteria_weights.run import run_ahp_criteria_weights
from models.ahp_sort_i.group import aggregate_category_votes
from models.ahp_sort_i.run import run_ahp_sort_i_multiple_profiles
from services.criteria_weights_consensus.mcc_weights import solve_mcc_weights

FIXTURE_PATH = (
    Path(__file__).resolve().parents[3]
    / "Automation"
    / "issue_scenario_lab"
    / "data"
    / "ahp_sort_i_sustainable_multicriteria_v3.json"
)
FIXTURE = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
EXPERT_ALIASES = ("expert_a", "expert_b", "expert_c")


def _entities_and_weights():
    criteria = [
        {"id": f"criterion-{item['key']}", "name": item["name"]}
        for item in FIXTURE["criteria"]
    ]
    criteria_by_alias = {}
    for alias, overrides in FIXTURE["expertPairwiseOverrides"].items():
        comparisons = [
            {
                "criterionId": criteria[item["row"]]["id"],
                "comparedCriterionId": criteria[item["column"]]["id"],
                "value": item["value"],
            }
            for item in overrides
        ]
        result = run_ahp_criteria_weights(
            context={"criteria": criteria},
            evaluations=[{"expert": {"id": alias}, "payload": {"comparisons": comparisons}}],
        )["expertResultsByExpert"][alias]
        assert result["completedComparisons"] == 15
        assert math.fsum(result["weightsByCriterion"].values()) == pytest.approx(1)
        assert result["weightsByCriterion"] == pytest.approx(
            dict(zip((item["id"] for item in criteria), FIXTURE["expectedAHPWeightsByExpert"][alias], strict=True)),
            abs=2e-7,
        )
        expected_consistency = FIXTURE["expectedConsistencyByExpert"][alias]
        assert result["lambdaMax"] == pytest.approx(expected_consistency["lambdaMax"], abs=1e-9)
        assert result["consistencyIndex"] == pytest.approx(expected_consistency["consistencyIndex"], abs=1e-9)
        assert result["consistencyRatio"] == pytest.approx(expected_consistency["consistencyRatio"], abs=1e-9)
        assert result["consistencyStatus"] == "consistent"
        criteria_by_alias[alias] = result["weightsByCriterion"]

    mcc = solve_mcc_weights(criteria=criteria, expert_weights_by_expert=criteria_by_alias)
    expected_mcc = dict(zip((item["id"] for item in criteria), FIXTURE["expectedMCCWeights"], strict=True))
    assert mcc["weightsByCriterion"] == pytest.approx(expected_mcc, abs=2e-7)
    assert math.fsum(mcc["weightsByCriterion"].values()) == pytest.approx(1, abs=2e-7)
    total = math.fsum(mcc["weightsByCriterion"].values())
    normalized_mcc = {key: value / total for key, value in mcc["weightsByCriterion"].items()}
    return criteria, criteria_by_alias, mcc, normalized_mcc


def _run_individual(alias: str, weights: dict[str, float], comparisons_override=None):
    criteria = [
        {"id": f"criterion-{item['key']}", "name": item["name"]}
        for item in FIXTURE["criteria"]
    ]
    alternatives = [{"id": name, "name": name} for name in FIXTURE["alternatives"]]
    profiles = FIXTURE["profiles"]
    profile_comparisons = [
        {
            "criterionId": f"criterion-{criterion['key']}",
            "firstProfileId": profiles[0]["profileId"],
            "secondProfileId": profiles[1]["profileId"],
            "firstToSecond": FIXTURE["profileComparisonsByCriterion"][criterion["key"]],
        }
        for criterion in FIXTURE["criteria"]
    ]
    comparisons = []
    source = comparisons_override or FIXTURE["alternativeToProfileByExpert"][alias]
    for alternative in FIXTURE["alternatives"]:
        for criterion in FIXTURE["criteria"]:
            for profile_id, value in source[alternative][criterion["key"]].items():
                comparisons.append({
                    "alternativeId": alternative,
                    "criterionId": f"criterion-{criterion['key']}",
                    "profileId": profile_id,
                    "alternativeToProfile": value,
                })
    return run_ahp_sort_i_multiple_profiles(
        criteria=criteria,
        categories=[{"id": item["categoryId"], "name": item["label"]} for item in FIXTURE["categories"]],
        alternatives=alternatives,
        limiting_profiles=profiles,
        criterion_weights_by_id=weights,
        comparisons=comparisons,
        profile_comparisons=profile_comparisons,
    )


def test_multicriteria_sustainable_v3_ahp_mcc_individual_results_and_plurality_are_frozen():
    criteria, individual_ahp, mcc, collective_weights = _entities_and_weights()
    assert len({tuple(result[criterion["id"]] for criterion in criteria) for result in individual_ahp.values()}) == 3

    assignments_by_expert = {}
    local_cr_values = []
    for alias in EXPERT_ALIASES:
        result = _run_individual(alias, collective_weights)
        diagnostics_by_alternative = result["resultsByAlternative"]
        assignments_by_expert[alias] = {}
        for alternative, evidence in diagnostics_by_alternative.items():
            category = next(
                item["label"] for item in FIXTURE["categories"] if item["categoryId"] == evidence["categoryId"]
            )
            assignments_by_expert[alias][alternative] = category
            for _criterion_id, local in evidence["localPrioritiesByCriterion"].items():
                metrics = local["consistency"]
                local_cr_values.append(metrics["consistencyRatio"])
                assert metrics["consistencyStatus"] == "consistent"
                assert metrics["consistencyIndex"] == pytest.approx(0, abs=1e-12)
                assert metrics["consistencyRatio"] == pytest.approx(0, abs=1e-12)

    assert assignments_by_expert == FIXTURE["expectedIndividualAssignmentsByExpert"]
    assert len(local_cr_values) == FIXTURE["expectedLocalConsistency"]["matrixCount"] == 90
    assert sum(value > 0.10 for value in local_cr_values) == FIXTURE["expectedLocalConsistency"]["reviewCount"] == 0
    assert max(local_cr_values) == pytest.approx(FIXTURE["expectedLocalConsistency"]["maximumCR"], abs=1e-12)

    categories = [{"categoryId": item["categoryId"], "label": item["label"], "order": item["order"]} for item in FIXTURE["categories"]]
    alternatives = [{"id": name, "name": name} for name in FIXTURE["alternatives"]]
    category_by_expert = {
        alias: {alternative: next(item["categoryId"] for item in categories if item["label"] == label)
                for alternative, label in assignments.items()}
        for alias, assignments in assignments_by_expert.items()
    }
    collective, votes = aggregate_category_votes(
        categories=categories,
        alternatives=alternatives,
        category_by_expert_and_alternative=category_by_expert,
        tie_policy="optimistic",
    )
    label_by_category = {item["categoryId"]: item["label"] for item in categories}
    collective_assignments = {
        item["alternativeId"]: label_by_category[item["categoryId"]] for item in collective
    }
    assert collective_assignments == FIXTURE["expectedAssignments"]
    for alternative, expected in FIXTURE["expectedVotes"].items():
        assert votes[alternative]["aggregationStatus"] == expected["status"]
        assert [votes[alternative]["votesByCategoryId"].get(item["categoryId"], 0) for item in categories] == expected["categoryCounts"]
    assert votes["Spain"]["isUnanimous"] is True
    assert votes["Croatia"]["isUniquePlurality"] is True
    assert votes["United Kingdom"]["tieDetected"] is True
    assert votes["United Kingdom"]["tiePolicy"] == "optimistic"
    assert votes["United Kingdom"]["selectedCategoryId"] == "good"
    assert mcc["status"] == "Optimal"


def test_multicriteria_sensitivity_changes_only_the_selected_criterion_judgment():
    _, _, _, collective_weights = _entities_and_weights()
    original_fixture = deepcopy(FIXTURE)
    original_result = _run_individual("expert_a", collective_weights)
    altered = deepcopy(FIXTURE["alternativeToProfileByExpert"]["expert_a"])
    before = altered["Spain"]["poverty"]["bad-moderate-boundary"]
    altered["Spain"]["poverty"]["bad-moderate-boundary"] = 1 / 2
    assert before == 1 / 3

    changed_result = _run_individual("expert_a", collective_weights, comparisons_override=altered)
    before_evidence = original_result["resultsByAlternative"]["Spain"]
    changed_evidence = changed_result["resultsByAlternative"]["Spain"]
    before_local = before_evidence["localPrioritiesByCriterion"]["criterion-poverty"]
    changed_local = changed_evidence["localPrioritiesByCriterion"]["criterion-poverty"]
    assert changed_local["alternativeToProfileJudgments"]["bad-moderate-boundary"] == 1 / 2
    assert changed_local["pairwiseMatrix"] != before_local["pairwiseMatrix"]
    assert changed_evidence["globalPriority"] != pytest.approx(before_evidence["globalPriority"])
    for criterion_key in ("obesity", "life_expectancy", "neet", "gender_gap", "homicide"):
        criterion_id = f"criterion-{criterion_key}"
        assert changed_evidence["localPrioritiesByCriterion"][criterion_id] == before_evidence["localPrioritiesByCriterion"][criterion_id]
    assert FIXTURE == original_fixture
