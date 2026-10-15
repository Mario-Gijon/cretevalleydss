from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path
import re
import warnings

import pytest

from models.two_tuple.analysis import analyze_issue
from models.two_tuple.analysis.interpretation import build_interpretation
from models.two_tuple.examples import (
    LINGUISTIC_2TUPLE_DOMAIN,
    TWO_TUPLE_REQUEST_EXAMPLES,
)
from models.two_tuple.executor import execute_two_tuple
from models.preference_order_criteria_weights.executor import (
    execute_preference_order_criteria_weights,
)
from schemas.model_requests import GenericModelExecutionRequest


def _example_facts() -> dict:
    request_value = deepcopy(
        TWO_TUPLE_REQUEST_EXAMPLES[
            "basic_linguistic_2tuple_matrix"
        ]["value"]
    )
    response = execute_two_tuple(
        GenericModelExecutionRequest.model_validate(request_value)
    )
    assert response["success"] is True
    analysis = analyze_issue(
        {
            "issue": {"id": "issue-1", "name": "Example issue"},
            "rounds": [
                {
                    "phase": 0,
                    "execution": {
                        "input": request_value,
                        "result": {
                            "rawOutput": response["data"]["rawOutput"],
                        },
                    },
                }
            ],
        }
    )
    return analysis["facts"]


def _greece_execution(*, multi_expert: bool) -> dict:
    fixture_name = (
        "two_tuple_greece_video.json"
        if multi_expert
        else "two_tuple_greece.json"
    )
    fixture_path = (
        Path(__file__).resolve().parents[3]
        / "Automation"
        / "issue_scenario_lab"
        / "data"
        / fixture_name
    )
    scenario = json.loads(fixture_path.read_text(encoding="utf-8"))
    parents = scenario["parents"]
    leaves = [child for parent in parents for child in parent["children"]]
    weighting_experts = scenario["participants"]["criteriaWeightingExperts"]
    weighting_request = {
        "context": {
            "criteria": [
                {"id": parent["key"], "name": parent["name"]}
                for parent in parents
            ],
            "structure": {
                "key": "criteriaPreferenceOrder",
                "stage": "criteriaWeighting",
            },
        },
        "modelParameters": {},
        "evaluations": [
            {
                "expert": {
                    "id": alias,
                    "name": f"Expert {alias[-1].upper()}",
                },
                "payload": {
                    "criterionOrder": scenario["rankings"][alias],
                },
            }
            for alias in weighting_experts
        ],
    }
    weighting_response = execute_preference_order_criteria_weights(
        GenericModelExecutionRequest.model_validate(weighting_request)
    )
    assert weighting_response["success"] is True
    parent_weights = weighting_response["data"]["weightsByCriterion"]
    weights = {
        child["key"]: parent_weights[parent["key"]] / len(parent["children"])
        for parent in parents
        for child in parent["children"]
    }

    criteria = []
    for leaf in leaves:
        criterion_type = (
            "cost"
            if not multi_expert and leaf["key"].startswith("c6_")
            else "benefit"
        )
        criteria.append(
            {
                "id": leaf["key"],
                "name": leaf["name"],
                "type": criterion_type,
                "expressionDomain": deepcopy(LINGUISTIC_2TUPLE_DOMAIN),
            }
        )

    source_values = (
        scenario["sourceValuesByExpert"]
        if multi_expert
        else {
            scenario["participants"]["finalExpert"]: scenario["sourceValues"]
        }
    )
    evaluations = []
    for alias, matrix in source_values.items():
        payload = {}
        for alternative in scenario["alternatives"]:
            row = {}
            for index, leaf in enumerate(leaves):
                source_value = matrix[alternative["key"]][index]
                if leaf["key"] == "c3_clustering_possible":
                    level = {"Yes": 5, "Unsure": 3, "No": 1}[source_value]
                elif multi_expert and leaf["key"] in {
                    "c6_land_rent",
                    "c6_installation_cost",
                    "c6_maintenance_cost",
                }:
                    level = 6 - source_value
                elif not multi_expert and leaf["key"] in {
                    "c6_long_term_potential",
                    "c7_landowner_cooperation",
                }:
                    level = 6 - source_value
                else:
                    level = source_value
                row[leaf["key"]] = {
                    "labelKey": f"s{int(level) - 1}",
                    "alpha": 0,
                }
            payload[alternative["key"]] = row
        evaluations.append(
            {
                "expert": {
                    "id": alias,
                    "name": f"Expert {alias[-1].upper()}",
                    "email": f"{alias}@example.com",
                },
                "payload": payload,
            }
        )

    request_value = {
        "context": {
            "issue": {"id": "greece-fixture", "name": scenario["issue"]["name"]},
            "alternatives": [
                {"id": item["key"], "name": item["name"]}
                for item in scenario["alternatives"]
            ],
            "criteria": criteria,
            "consensusPhase": 0,
            "previousStageResult": None,
            "structure": {
                "key": "alternativeCriteriaMatrix",
                "stage": "alternativeEvaluation",
            },
        },
        "modelParameters": {
            "expertAggregation": {"method": "arithmetic_mean", "options": {}},
            "criteriaAggregation": {"method": "weighted_average", "options": {}},
            "weights": weights,
        },
        "evaluations": evaluations,
    }
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        response = execute_two_tuple(
            GenericModelExecutionRequest.model_validate(request_value)
        )
        assert response["success"] is True
        analysis = analyze_issue(
            {
                "issue": {
                    "id": "greece-fixture",
                    "name": scenario["issue"]["name"],
                },
                "rounds": [
                    {
                        "phase": 0,
                        "execution": {
                            "input": request_value,
                            "result": {
                                "rawOutput": response["data"]["rawOutput"],
                            },
                        },
                    }
                ],
            }
        )
    return {
        "scenario": scenario,
        "parentWeights": parent_weights,
        "request": request_value,
        "response": response,
        "analysis": analysis,
    }


@pytest.fixture(scope="module")
def real_facts() -> dict:
    return _example_facts()


@pytest.fixture(scope="module")
def greece_execution() -> dict:
    return _greece_execution(multi_expert=False)


@pytest.fixture(scope="module")
def multi_expert_execution() -> dict:
    return _greece_execution(multi_expert=True)


@pytest.fixture
def facts(real_facts: dict) -> dict:
    return deepcopy(real_facts)


def _set_counterfactual_leader(
    facts: dict,
    *,
    group_key: str,
    item_index: int,
    alternative_name: str = "Alternative B",
) -> None:
    group = facts["robustness"][group_key]
    item = group["items"][item_index]
    alternative = next(
        result
        for result in facts["result"]["technicalRanking"]
        if result["name"] == alternative_name
    )
    item["impact"]["winnerStateChanged"] = True
    item["impact"]["semanticLeadingGroupChanged"] = True
    item["counterfactualResult"] = {
        "winner": {
            "available": True,
            "reason": None,
            "alternative": alternative,
        },
        "leadingGroup": [alternative],
    }


def _section(interpretation: str, title: str) -> str:
    heading = f"### {title}\n\n"
    if heading not in interpretation:
        return ""
    return interpretation.split(heading, 1)[1].split("\n\n### ", 1)[0]


def test_unique_preferred_alternative_is_explained_without_repeating_ranking(
    facts: dict,
) -> None:
    interpretation = build_interpretation(facts)
    overall = _section(interpretation, "Overall result")

    assert "**Alternative A** is favored under the criteria" in overall
    assert "criteria and preferences used" in overall
    assert "**Alternative A** had higher recorded assessments" in overall
    assert "**Quality** (**High** vs **Medium**)" in overall
    assert "**Service** (**High** vs **Medium**)" in overall
    assert "**Quality** had the largest individual criterion weight" in overall
    assert "### Expert perspectives" in interpretation
    assert "### Stability of the result" in interpretation
    assert "### Points worth reviewing" in interpretation
    assert "Alternative A > Alternative B" not in interpretation
    assert "β" not in interpretation
    assert "assessments were stronger" not in interpretation
    assert "\n- " not in interpretation
    assert 4 <= len(interpretation.split("### ")) <= 5


def test_tied_leading_alternatives_are_not_presented_as_a_winner(
    facts: dict,
) -> None:
    first, second = facts["result"]["technicalRanking"]
    second["beta"] = first["beta"]
    facts["result"]["leadingGroup"] = [first, second]
    facts["result"]["winner"] = {
        "available": False,
        "reason": "tied_leading_group",
        "alternative": None,
    }

    interpretation = build_interpretation(facts)
    overall = _section(interpretation, "Overall result")

    assert "**Alternative A** and **Alternative B** tied" in overall
    assert "does not establish one as the preferred choice" in overall
    assert "unique leading alternative" not in overall


def test_single_alternative_is_not_described_as_a_competitive_victory(
    facts: dict,
) -> None:
    only = facts["result"]["technicalRanking"][0]
    facts["counts"]["alternatives"] = 1
    facts["result"]["technicalRanking"] = [only]
    facts["result"]["leadingGroup"] = [only]
    facts["result"]["winner"] = {
        "available": False,
        "reason": "single_alternative",
        "alternative": None,
    }
    facts["evaluators"]["capabilities"]["comparePersonalAndCollectiveRanking"] = {
        "available": False,
        "reason": "single_alternative",
    }

    interpretation = build_interpretation(facts)
    overall = _section(interpretation, "Overall result")

    assert "Only **Alternative A** was evaluated" in overall
    assert "does not compare it with competing alternatives" in overall
    assert "preferred alternative in this evaluation" not in overall
    assert "personal assessment also favored" not in interpretation


def test_single_evaluator_is_described_without_using_weighting_participants(
    facts: dict,
) -> None:
    facts["counts"]["evaluators"] = 1
    facts["evaluators"]["items"] = facts["evaluators"]["items"][:1]
    facts["evaluators"]["closestToCollective"] = {
        "available": False,
        "reason": "single_evaluator",
        "evaluators": [],
    }
    facts["evaluators"]["farthestFromCollective"] = {
        "available": False,
        "reason": "single_evaluator",
        "evaluators": [],
    }

    interpretation = build_interpretation(facts)

    assert "result reflects only **Expert 1**'s alternative evaluations" in interpretation
    assert "cannot establish whether other experts would reach the same conclusion" in interpretation
    assert "closest to the collective" not in interpretation


def test_different_profile_distances_name_experts_but_do_not_imply_rank_changes(
    facts: dict,
) -> None:
    items = facts["evaluators"]["items"]
    items[0]["distanceToCollective"]["meanAbsoluteBetaDistance"] = 0.1
    items[1]["distanceToCollective"]["meanAbsoluteBetaDistance"] = 0.8
    facts["evaluators"]["closestToCollective"] = {
        "available": True,
        "reason": None,
        "value": 0.1,
        "evaluators": [{"expertLabel": "Expert 1"}],
    }
    facts["evaluators"]["farthestFromCollective"] = {
        "available": True,
        "reason": None,
        "value": 0.8,
        "evaluators": [{"expertLabel": "Expert 2"}],
    }

    interpretation = build_interpretation(facts)
    expert_section = _section(interpretation, "Expert perspectives")

    assert "The ratings from **Expert 1** were closest overall" in expert_section
    assert "those from **Expert 2** were furthest from it" in expert_section
    assert "Each expert's personal assessment also favored **Alternative A**" in expert_section


def test_equivalent_expert_distances_do_not_select_a_closest_or_farthest(
    facts: dict,
) -> None:
    interpretation = build_interpretation(facts)
    expert_section = _section(interpretation, "Expert perspectives")

    assert "Both experts' ratings were equally distant" in expert_section
    assert "neither was closer" in expert_section
    assert "Expert 1's evaluations were closest" not in expert_section
    assert "Expert 2's evaluations were farthest" not in expert_section


def test_personal_ranking_difference_that_keeps_the_same_lead_is_distinguished(
    facts: dict,
) -> None:
    expert = facts["evaluators"]["items"][1]
    alignment = expert["alignmentWithCollective"]
    alignment["technicalRankingMatchesCollective"] = False
    alignment["semanticLeadingGroupMatchesCollective"] = True

    interpretation = build_interpretation(facts)
    expert_section = _section(interpretation, "Expert perspectives")

    assert "The personal assessments from **Expert 2** still favored **Alternative A**" in expert_section
    assert "their ordering of the remaining alternatives differed" in expert_section


def test_personal_leading_alternative_difference_uses_actual_names(
    facts: dict,
) -> None:
    expert = facts["evaluators"]["items"][1]
    expert["alignmentWithCollective"]["technicalRankingMatchesCollective"] = False
    expert["alignmentWithCollective"]["semanticLeadingGroupMatchesCollective"] = False
    expert["personalResult"]["leadingGroup"] = [
        {
            "alternativeId": "alt-b",
            "name": "Alternative B",
            "technicalRank": 1,
        }
    ]

    interpretation = build_interpretation(facts)
    expert_section = _section(interpretation, "Expert perspectives")

    assert "**Expert 2**'s personal assessment favored **Alternative B**" in expert_section
    assert "collective result favored **Alternative A**" in expert_section
    assert "### Points worth reviewing" in interpretation
    assert "**Expert 2**'s personal preference differs from the collective lead" in _section(
        interpretation,
        "Points worth reviewing",
    )


def test_personal_difference_does_not_break_a_collective_tie(
    facts: dict,
) -> None:
    first, second = facts["result"]["technicalRanking"]
    second["beta"] = first["beta"]
    facts["result"]["leadingGroup"] = [first, second]
    facts["result"]["winner"] = {
        "available": False,
        "reason": "tied_leading_group",
        "alternative": None,
    }
    expert = facts["evaluators"]["items"][1]
    expert["alignmentWithCollective"]["technicalRankingMatchesCollective"] = False
    expert["alignmentWithCollective"]["semanticLeadingGroupMatchesCollective"] = False
    expert["personalResult"]["leadingGroup"] = [
        {"alternativeId": "alt-b", "name": "Alternative B", "technicalRank": 1}
    ]

    interpretation = build_interpretation(facts)
    expert_section = _section(interpretation, "Expert perspectives")

    assert "collective evaluation left **Alternative A** and **Alternative B** tied for the lead" in expert_section
    assert "collective result favored **Alternative A**" not in expert_section


def test_cell_disagreement_names_alternative_and_criterion(facts: dict) -> None:
    interpretation = build_interpretation(facts)
    points_section = _section(interpretation, "Points worth reviewing")

    assert "largest cell-level differences from the collective" in points_section
    assert "**Alternative A** on **Service**" in points_section
    assert "**Alternative B** on **Service**" in points_section


def test_identical_expert_assessments_do_not_claim_a_cell_disagreement(
    facts: dict,
) -> None:
    facts["evaluators"]["cellDisagreement"]["strongestDisagreement"].update(
        {"value": 0.0, "items": []}
    )

    interpretation = build_interpretation(facts)

    assert "largest cell-level differences from the collective" not in interpretation


def test_criterion_comparison_is_omitted_when_collective_cell_evidence_is_missing(
    facts: dict,
) -> None:
    facts["alternatives"]["items"][0].pop("collectiveCriteria")

    interpretation = build_interpretation(facts)

    assert "**Quality**" not in _section(interpretation, "Overall result")


def test_criterion_comparison_is_omitted_for_a_tied_collective_result(
    facts: dict,
) -> None:
    first, second = facts["result"]["technicalRanking"]
    second["beta"] = first["beta"]
    facts["result"]["leadingGroup"] = [first, second]
    facts["result"]["winner"] = {
        "available": False,
        "reason": "tied_leading_group",
        "alternative": None,
    }

    interpretation = build_interpretation(facts)

    assert "tied for the strongest overall assessment" in interpretation
    assert "higher recorded assessments" not in interpretation


def test_preferred_alternative_stays_stable_under_single_evaluator_and_criterion_removal(
    facts: dict,
) -> None:
    interpretation = build_interpretation(facts)
    stability = _section(interpretation, "Stability of the result")

    assert "One-at-a-time expert removals and criterion removals both kept **Alternative A** in first place" in stability
    assert "tested changes to how much importance each criterion received" in stability


@pytest.mark.parametrize(
    ("group_key", "item_index", "removed_label"),
    [
        ("leaveOneEvaluatorOut", 1, "**Expert 2**"),
        ("leaveOneCriterionOut", 0, "**Quality**"),
    ],
)
def test_leave_one_out_winner_change_is_named_and_not_overstated(
    facts: dict,
    group_key: str,
    item_index: int,
    removed_label: str,
) -> None:
    _set_counterfactual_leader(
        facts,
        group_key=group_key,
        item_index=item_index,
    )

    interpretation = build_interpretation(facts)
    stability = _section(interpretation, "Stability of the result")

    action = "was left out" if group_key == "leaveOneEvaluatorOut" else "was excluded"
    assert f"When {removed_label} {action}, the preferred alternative changed to **Alternative B**" in stability
    if group_key == "leaveOneCriterionOut":
        assert "caused the outcome" not in stability


def test_available_and_unavailable_weight_checks_are_reported_selectively(
    facts: dict,
) -> None:
    interpretation = build_interpretation(facts)
    stability = _section(interpretation, "Stability of the result")

    assert "tested changes to how much importance each criterion received" in stability
    assert "evaluator-weight sensitivity is unavailable" not in stability.lower()
    assert "selected weight settings, not every possible combination" in stability

    facts.pop("sensitivity")
    without_sensitivity = build_interpretation(facts)
    assert "kept **Alternative A** in first place" in _section(without_sensitivity, "Stability of the result")
    assert "tested changes to how much importance each criterion received" not in _section(without_sensitivity, "Stability of the result")
    assert "sensitivity is unavailable" not in without_sensitivity.lower()


def test_only_extreme_weight_changes_are_described_as_extreme(
    facts: dict,
) -> None:
    item = facts["sensitivity"]["criterionWeights"]["items"][0]
    item["points"] = [
        {
            "variedWeight": 1.0,
            "changesFromBaseline": {
                "winnerStateChanged": True,
                "semanticLeadingGroupChanged": True,
            },
            "result": {
                "leadingGroup": [
                    {"alternativeId": "alt-b", "name": "Alternative B"}
                ],
            },
        }
    ]
    item["summary"].update(
        {
            "winnerStateChangedSampleCount": 1,
            "semanticLeadingGroupChangedSampleCount": 1,
            "interiorWinnerStateChangedSampleCount": 0,
            "winnerStateChangesOnlyAtEndpoints": True,
            "endpointWinnerStateChanges": [
                {
                    "variedWeight": 1.0,
                    "endpoint": "one",
                    "targetImportance": "all",
                }
            ],
        }
    )

    interpretation = build_interpretation(facts)
    stability = _section(interpretation, "Stability of the result")

    assert "Only extreme tested settings changed the leading result" in stability
    assert "giving all importance to **Quality**" in stability
    assert "preferred alternative shifted from **Alternative A** to **Alternative B**" in stability
    assert "ordinary local sensitivity" not in stability
    assert "current priority assigned to **Quality**" not in _section(
        interpretation,
        "Points worth reviewing",
    )


def test_interior_weight_change_names_the_criterion_and_sampled_limit(
    facts: dict,
) -> None:
    item = facts["sensitivity"]["criterionWeights"]["items"][1]
    item["points"] = [
        {
            "variedWeight": 0.55,
            "changesFromBaseline": {
                "winnerStateChanged": True,
                "semanticLeadingGroupChanged": True,
            },
            "result": {
                "leadingGroup": [
                    {"alternativeId": "alt-b", "name": "Alternative B"}
                ],
            },
        }
    ]
    item["summary"].update(
        {
            "winnerStateChangedSampleCount": 1,
            "semanticLeadingGroupChangedSampleCount": 1,
            "interiorWinnerStateChangedSampleCount": 1,
            "winnerStateChangesOnlyAtEndpoints": False,
        }
    )

    interpretation = build_interpretation(facts)
    stability = _section(interpretation, "Stability of the result")

    assert "raising the weight assigned to **Service** above its starting value" in stability
    assert "**Service**" in stability
    assert "changed the preferred alternative from **Alternative A** to **Alternative B**" in stability
    assert "selected weight settings, not every possible combination" in stability
    assert "current priority assigned to **Service** reflects the project's intended trade-off" in _section(
        interpretation,
        "Points worth reviewing",
    )


def test_l2towa_is_described_as_positional_not_named_importance(
    facts: dict,
) -> None:
    facts["aggregation"]["criteriaAggregation"]["summary"]["method"] = "l2towa"
    facts["aggregation"]["criteriaAggregation"]["summary"].update(
        {
            "weightSemantics": "ordered_positions_descending_beta",
            "usesOrderedPositions": True,
        }
    )
    facts["sensitivity"]["criterionWeights"] = {
        "availability": {
            "available": False,
            "reason": "criteria_aggregation_not_weighted_average",
        },
        "items": [],
    }

    interpretation = build_interpretation(facts)
    stability = _section(interpretation, "Stability of the result")

    assert "combined according to their relative position" in interpretation
    assert "rather than by fixed importance assigned to named criteria" in interpretation
    assert "**Quality**'s weight" not in interpretation
    assert "L2TOWA" not in interpretation


def test_missing_optional_findings_are_omitted_without_losing_core_narrative(
    facts: dict,
) -> None:
    facts["evaluators"].pop("closestToCollective")
    facts["evaluators"].pop("farthestFromCollective")
    facts["evaluators"].pop("cellDisagreement")
    facts.pop("robustness")
    facts.pop("sensitivity")

    interpretation = build_interpretation(facts)

    assert "**Alternative A** is favored under the criteria" in interpretation
    assert "Each expert's personal assessment also favored **Alternative A**" in interpretation
    assert "largest differences" not in interpretation
    assert "closest to the collective" not in interpretation
    assert "### Overall result" in interpretation
    assert "### Expert perspectives" in interpretation
    assert "### Stability of the result" not in interpretation
    assert "### Points worth reviewing" not in interpretation


def test_weighted_average_and_arithmetic_mean_do_not_leak_technical_details(
    facts: dict,
) -> None:
    facts["aggregation"]["expertAggregation"]["summary"]["method"] = "arithmetic_mean"
    facts["aggregation"]["criteriaAggregation"]["summary"]["method"] = "weighted_average"

    interpretation = build_interpretation(facts)

    assert "arithmetic mean" not in interpretation.lower()
    assert "weighted average" not in interpretation.lower()
    assert "aggregation coefficient" not in interpretation.lower()
    assert "probability" not in interpretation.lower()
    assert "confidence percentage" not in interpretation.lower()


def test_arithmetic_mean_names_equal_criterion_treatment(facts: dict) -> None:
    summary = facts["aggregation"]["criteriaAggregation"]["summary"]
    summary.update(
        {
            "method": "arithmetic_mean",
            "weightSemantics": "equal_arguments",
            "usesEqualArguments": True,
        }
    )

    overall = _section(build_interpretation(facts), "Overall result")

    assert "Each criterion had equal weight in this alternative evaluation" in overall
    assert "arithmetic mean" not in overall.lower()


@pytest.mark.parametrize("criterion_type", ["cost", "benefit"])
def test_criterion_comparison_reports_labels_without_assuming_direction(
    facts: dict,
    criterion_type: str,
) -> None:
    criterion = facts["criteria"]["items"][0]
    criterion["type"] = criterion_type
    criterion["name"] = "Operating cost" if criterion_type == "cost" else "Service quality"

    overall = _section(build_interpretation(facts), "Overall result")

    assert f"**{criterion['name']}**" in overall
    assert "**Alternative A**" in overall
    assert "**Alternative B**" in overall
    assert "more favorable on" not in overall
    assert "stronger than" not in overall


def test_criterion_and_alternative_comparisons_follow_stable_ids(
    facts: dict,
) -> None:
    facts["criteria"]["items"].reverse()
    for alternative in facts["alternatives"]["items"]:
        alternative["collectiveCriteria"].reverse()

    overall = _section(build_interpretation(facts), "Overall result")

    assert "**Alternative A** had higher recorded assessments" in overall
    assert "**Quality** had the largest individual criterion weight" in overall


def test_incompatible_linguistic_label_is_omitted_from_criterion_comparison(
    facts: dict,
) -> None:
    alternative_b = next(
        item
        for item in facts["alternatives"]["items"]
        if item["alternativeId"] == "alt-b"
    )
    quality = next(
        item
        for item in alternative_b["collectiveCriteria"]
        if item["criterionId"] == "quality"
    )
    quality["tuple"]["labelKey"] = "foreign-scale-medium"

    overall = _section(build_interpretation(facts), "Overall result")

    assert "**Quality** (**High** vs **Medium**)" not in overall
    assert "**Service**" in overall


def test_greece_parent_and_leaf_weights_are_separate_executions(
    greece_execution: dict,
) -> None:
    parent_weights = greece_execution["parentWeights"]
    assert max(parent_weights, key=parent_weights.get) == "c5"

    facts = greece_execution["analysis"]["facts"]
    trace = facts["aggregation"]["criteriaAggregation"]["trace"]["alternatives"]
    leaf_sources = trace[0]["sources"]
    largest_leaf = max(leaf_sources, key=lambda item: item["effectiveWeight"])

    assert facts["aggregation"]["criteriaAggregation"]["summary"]["method"] == "weighted_average"
    assert largest_leaf["criterionName"] == "Wind potential"
    assert largest_leaf["effectiveWeight"] == pytest.approx(0.10714286)
    assert parent_weights["c5"] == pytest.approx(0.22142857)
    assert "Wind potential** had the largest individual criterion weight" in greece_execution["analysis"]["interpretation"]
    assert "Local Socio-Economic Benefits" not in greece_execution["analysis"]["interpretation"]
    assert "other 17 alternatives" not in greece_execution["analysis"]["interpretation"]


def test_greece_narrative_groups_observations_and_keeps_review_action_distinct(
    greece_execution: dict,
) -> None:
    interpretation = greece_execution["analysis"]["interpretation"]
    overall = _section(interpretation, "Overall result")
    stability = _section(interpretation, "Stability of the result")
    points = _section(interpretation, "Points worth reviewing")

    assert overall.count("Compared with") == 1
    assert "**Compatibility with planned PV if any**" in overall
    assert "**Shared infrastructure potential in future**" in overall
    assert "**Irrigation & public building benefits**" in overall
    assert "For **" not in overall
    assert "The overall choice reflects all criteria together" in overall
    assert "when each criterion was left out in turn" in stability
    assert "raising the weight assigned to **Land rent** above its starting value" in stability
    assert "changed the preferred alternative from **Psyxro** to **Old TEEI**" in stability
    assert "Before choosing, confirm whether the current priority assigned to **Land rent**" in points
    assert "above its starting value" not in points
    assert "leading result changed" not in points


def test_executed_five_expert_greece_fixture_distinguishes_profiles_rankings_and_cells(
    multi_expert_execution: dict,
) -> None:
    facts = multi_expert_execution["analysis"]["facts"]
    interpretation = multi_expert_execution["analysis"]["interpretation"]
    expert_section = _section(interpretation, "Expert perspectives")
    stability = _section(interpretation, "Stability of the result")
    points = _section(interpretation, "Points worth reviewing")

    assert facts["counts"]["evaluators"] == 5
    assert [item["expertLabel"] for item in facts["evaluators"]["closestToCollective"]["evaluators"]] == ["Expert A"]
    assert {
        item["expertLabel"]
        for item in facts["evaluators"]["farthestFromCollective"]["evaluators"]
    } == {"Expert B", "Expert C", "Expert D", "Expert E"}
    personal_leaders = {
        item["expertLabel"]: [leader["name"] for leader in item["personalResult"]["leadingGroup"]]
        for item in facts["evaluators"]["items"]
    }
    assert personal_leaders == {
        "Expert A": ["Psyxro"],
        "Expert B": ["Psyxro"],
        "Expert C": ["Psyxro"],
        "Expert D": ["Psyxro"],
        "Expert E": ["Saint George Village Entrance"],
    }
    assert "The ratings from **Expert A** were closest overall" in expert_section
    assert "**Expert B**, **Expert C**, **Expert D**, and **Expert E** tied for the greatest distance" in expert_section
    assert "**Expert E**'s personal assessment favored **Saint George Village Entrance**" in expert_section
    assert "personal assessments from **Expert A**, **Expert B**, **Expert C**, and **Expert D** also favored **Psyxro**" in expert_section
    assert "**Agios Georgios (Saint George Village)** on **Accessibility of location**" in points
    assert "**Expert B** furthest from the collective" in points
    assert "**Visibility from roads/public areas**" in points
    assert "**Expert C** furthest from the collective" in points
    assert "When **Irrigation & public building benefits** was excluded" in stability
    assert "raising the weight assigned to **Accessibility of location** above its starting value changed the preferred alternative from **Psyxro** to **Saint George Village Entrance**" in stability
    assert "raising the weight assigned to either **Land rent** or **Long-term operational potential (after project period)** above its starting value changed the preferred alternative from **Psyxro** to **Plati**" in stability
    assert "raising the weight assigned to either **Installation cost** or **Landowner cooperation Risk** above its starting value changed the preferred alternative from **Psyxro** to **Old TEEI**" in stability
    assert "Irrigation & public building benefits** was excluded" not in points
    assert "preferred alternative changed to **Plati**" not in points
    assert "statistically significant" not in interpretation.lower()
    assert "additional experts" not in interpretation.lower()
    assert build_interpretation(deepcopy(facts)) == interpretation


def test_three_experts_with_equal_distances_are_all_named(facts: dict) -> None:
    facts["counts"]["evaluators"] = 3
    third = deepcopy(facts["evaluators"]["items"][0])
    third["expertLabel"] = "Expert 3"
    facts["evaluators"]["items"].append(third)
    facts["evaluators"]["closestToCollective"] = {
        "available": False,
        "reason": "no_variation",
        "value": None,
        "evaluators": [],
    }
    facts["evaluators"]["farthestFromCollective"] = {
        "available": False,
        "reason": "no_variation",
        "value": None,
        "evaluators": [],
    }

    expert_section = _section(build_interpretation(facts), "Expert perspectives")

    assert "The ratings from **Expert 1**, **Expert 2**, and **Expert 3** were equally distant" in expert_section
    assert "Both experts" not in expert_section


def test_weight_sensitivity_reports_increases_and_decreases_without_a_threshold(
    facts: dict,
) -> None:
    item = next(
        item
        for item in facts["sensitivity"]["criterionWeights"]["items"]
        if item["name"] == "Service"
    )
    item["configuredWeight"] = 0.4
    item["points"] = [
        {
            "variedWeight": varied_weight,
            "changesFromBaseline": {
                "winnerStateChanged": True,
                "semanticLeadingGroupChanged": True,
            },
            "result": {
                "leadingGroup": [
                    {"alternativeId": "alt-b", "name": "Alternative B"}
                ],
            },
        }
        for varied_weight in (0.2, 0.55)
    ]
    item["summary"].update(
        {
            "winnerStateChangedSampleCount": 2,
            "semanticLeadingGroupChangedSampleCount": 2,
            "interiorWinnerStateChangedSampleCount": 2,
            "winnerStateChangesOnlyAtEndpoints": False,
        }
    )

    interpretation = build_interpretation(facts)
    stability = _section(interpretation, "Stability of the result")
    points = _section(interpretation, "Points worth reviewing")

    assert "raising the weight assigned to **Service** above its starting value" in stability
    assert "lowering the weight assigned to **Service** below its starting value" in stability
    assert stability.count("changed the preferred alternative from **Alternative A** to **Alternative B**") == 2
    assert "universal threshold" not in stability.lower()
    assert "current priority assigned to **Service**" in points
    assert "raising the weight assigned to **Service**" not in points


def test_l2towa_expert_weights_are_not_assigned_to_named_experts(
    facts: dict,
) -> None:
    summary = facts["aggregation"]["expertAggregation"]["summary"]
    summary.update(
        {
            "method": "l2towa",
            "weightSemantics": "ordered_positions_descending_beta",
            "usesOrderedPositions": True,
        }
    )
    facts["sensitivity"]["expertWeights"] = {
        "availability": {
            "available": False,
            "reason": "expert_aggregation_not_weighted_average",
        },
        "items": [],
    }

    expert_section = _section(build_interpretation(facts), "Expert perspectives")

    assert "relative order of their ratings" in expert_section
    assert "fixed importance assigned to each person" in expert_section
    assert "Expert 1 was given more weight" not in expert_section


def test_many_criterion_weights_never_report_the_criterion_count_as_alternatives(
    facts: dict,
) -> None:
    criteria = facts["criteria"]["items"]
    for index in range(2, 18):
        criteria.append(
            {
                "criterionId": f"criterion-{index}",
                "name": f"Criterion {index}",
                "index": index,
                "minimumBeta": 1.0,
                "maximumBeta": 2.0,
                "betaRange": 1.0,
                "hasObservedSeparation": True,
            }
        )
    facts["counts"]["criteria"] = len(criteria)
    weights = [0.2] + [0.8 / 17] * 17
    summary = facts["aggregation"]["criteriaAggregation"]["summary"]
    summary["effectiveWeights"] = weights
    summary["argumentCount"] = len(criteria)

    source_by_id = {
        "quality": ("Quality", weights[0]),
        "service": ("Service", weights[1]),
    }
    source_by_id.update(
        {
            f"criterion-{index}": (f"Criterion {index}", weights[index])
            for index in range(2, 18)
        }
    )
    for alternative in facts["aggregation"]["criteriaAggregation"]["trace"]["alternatives"]:
        alternative["sources"] = [
            {
                "criterionId": criterion_id,
                "criterionName": name,
                "effectiveWeight": weight,
            }
            for criterion_id, (name, weight) in source_by_id.items()
        ]

    interpretation = build_interpretation(facts)

    assert "**Quality** had the largest individual criterion weight" in interpretation
    assert "17 alternatives" not in interpretation


def test_no_points_section_is_added_without_a_concrete_review_finding(
    facts: dict,
) -> None:
    facts["evaluators"]["cellDisagreement"]["strongestDisagreement"].update(
        {"value": 0.0, "items": []}
    )

    interpretation = build_interpretation(facts)

    assert "### Points worth reviewing" not in interpretation


def test_single_evaluator_limitation_is_not_repeated_in_points_to_review(
    facts: dict,
) -> None:
    facts["counts"]["evaluators"] = 1
    facts["evaluators"]["items"] = facts["evaluators"]["items"][:1]
    facts["evaluators"]["cellDisagreement"]["strongestDisagreement"].update(
        {"value": 0.0, "items": []}
    )
    facts["robustness"].pop("leaveOneEvaluatorOut", None)

    interpretation = build_interpretation(facts)
    expert_section = _section(interpretation, "Expert perspectives")

    assert "result reflects only **Expert 1**'s alternative evaluations" in expert_section
    assert "### Points worth reviewing" not in interpretation


def test_output_is_deterministic_and_uses_connected_natural_paragraphs(
    facts: dict,
) -> None:
    first = build_interpretation(facts)
    second = build_interpretation(deepcopy(facts))

    assert first == second
    headings = re.findall(r"^### (.+)$", first, flags=re.MULTILINE)
    assert headings == [
        "Overall result",
        "Expert perspectives",
        "Stability of the result",
        "Points worth reviewing",
    ]
    for title in headings:
        section = _section(first, title)
        assert section
        assert len(section.split("\n\n")) <= 2
    assert not re.search(r"^\s*[-*] ", first, flags=re.MULTILINE)
