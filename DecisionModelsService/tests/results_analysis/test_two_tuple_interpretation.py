from __future__ import annotations

from copy import deepcopy
import re

import pytest

from models.two_tuple.analysis import analyze_issue
from models.two_tuple.analysis.interpretation import build_interpretation
from models.two_tuple.examples import TWO_TUPLE_REQUEST_EXAMPLES
from models.two_tuple.executor import execute_two_tuple
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


@pytest.fixture(scope="module")
def real_facts() -> dict:
    return _example_facts()


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


def test_unique_preferred_alternative_is_explained_without_repeating_ranking(
    facts: dict,
) -> None:
    interpretation = build_interpretation(facts)

    assert "**Alternative A** is the preferred alternative" in interpretation
    assert "criteria and preferences used" in interpretation
    assert "Alternative A > Alternative B" not in interpretation
    assert "β" not in interpretation
    assert len(interpretation.split()) < 280


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
    overall = interpretation.split("### Expert perspectives", maxsplit=1)[0]

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

    assert "Only **Alternative A** was evaluated" in interpretation
    assert "does not compare it with competing alternatives" in interpretation
    assert "preferred alternative in this evaluation" not in interpretation
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

    assert "Only **Expert 1**'s alternative evaluations are represented" in interpretation
    assert "cannot show agreement or disagreement between different experts" in interpretation
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
    expert_section = interpretation.split("### Expert perspectives", maxsplit=1)[1]

    assert "The evaluations from **Expert 1** were closest" in expert_section
    assert "those from **Expert 2** differed most" in expert_section
    assert "distance alone does not show a different personal ranking" in expert_section
    assert "Each expert's personal assessment also favored **Alternative A**" in expert_section


def test_equivalent_expert_distances_do_not_select_a_closest_or_farthest(
    facts: dict,
) -> None:
    interpretation = build_interpretation(facts)
    expert_section = interpretation.split("### Expert perspectives", maxsplit=1)[1]

    assert "distances from the collective assessment were equivalent" in expert_section
    assert "evidence does not identify one as closer or farther" in expert_section
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
    expert_section = interpretation.split("### Expert perspectives", maxsplit=1)[1]

    assert "The personal ordering from **Expert 2** differed below the preferred option" in expert_section
    assert "still favored **Alternative A**" in expert_section


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
    expert_section = interpretation.split("### Expert perspectives", maxsplit=1)[1]

    assert "**Expert 2**'s personal assessment favored **Alternative B**" in expert_section
    assert "collective result favored **Alternative A**" in expert_section


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
    expert_section = interpretation.split("### Expert perspectives", maxsplit=1)[1]

    assert "collective evaluation left **Alternative A** and **Alternative B** tied for the lead" in expert_section
    assert "collective result favored **Alternative A**" not in expert_section


def test_cell_disagreement_names_alternative_and_criterion(facts: dict) -> None:
    interpretation = build_interpretation(facts)
    expert_section = interpretation.split("### Expert perspectives", maxsplit=1)[1]

    assert "clearest differences from the collective assessment" in expert_section
    assert "**Alternative A**'s **Service** assessment" in expert_section
    assert "**Alternative B**'s **Service** assessment" in expert_section


def test_identical_expert_assessments_do_not_claim_a_cell_disagreement(
    facts: dict,
) -> None:
    facts["evaluators"]["cellDisagreement"]["strongestDisagreement"].update(
        {"value": 0.0, "items": []}
    )

    interpretation = build_interpretation(facts)

    assert "clearest differences from the collective assessment" not in interpretation


def test_preferred_alternative_stays_stable_under_single_evaluator_and_criterion_removal(
    facts: dict,
) -> None:
    interpretation = build_interpretation(facts)
    stability = interpretation.split("### Stability and points to review", maxsplit=1)[1]

    assert "**Alternative A** remained the preferred alternative" in stability
    assert "single-expert and single-criterion removal" in stability
    assert "changes to how much importance each criterion received" in stability


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
    stability = interpretation.split("### Stability and points to review", maxsplit=1)[1]

    assert f"Removing {removed_label} changed the preferred alternative to **Alternative B**" in stability
    if group_key == "leaveOneCriterionOut":
        assert "does not establish that the criterion caused the result" in stability


def test_available_and_unavailable_weight_checks_are_reported_selectively(
    facts: dict,
) -> None:
    interpretation = build_interpretation(facts)
    stability = interpretation.split("### Stability and points to review", maxsplit=1)[1]

    assert "changes to how much importance each criterion received" in stability
    assert "evaluator-weight sensitivity is unavailable" not in stability.lower()
    assert "weight checks are sampled" in stability

    facts.pop("sensitivity")
    without_sensitivity = build_interpretation(facts)
    assert "### Stability and points to review" in without_sensitivity
    assert "changes to how much importance each criterion received" not in without_sensitivity
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
    stability = interpretation.split("### Stability and points to review", maxsplit=1)[1]

    assert "Only extreme tested settings changed the leading result" in stability
    assert "giving all importance to **Quality**" in stability
    assert "preferred alternative shifted from **Alternative A** to **Alternative B**" in stability
    assert "ordinary local sensitivity" not in stability


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
    stability = interpretation.split("### Stability and points to review", maxsplit=1)[1]

    assert "interior tested scenarios" in stability
    assert "**Service**" in stability
    assert "preferred alternative shifted from **Alternative A** to **Alternative B**" in stability
    assert "weight checks are sampled" in stability


def test_l2towa_is_described_as_positional_not_named_importance(
    facts: dict,
) -> None:
    facts["aggregation"]["criteriaAggregation"]["summary"]["method"] = "l2towa"
    facts["sensitivity"]["criterionWeights"] = {
        "availability": {
            "available": False,
            "reason": "criteria_aggregation_not_weighted_average",
        },
        "items": [],
    }

    interpretation = build_interpretation(facts)
    stability = interpretation.split("### Stability and points to review", maxsplit=1)[1]

    assert "weights follow assessment values from highest to lowest" in stability
    assert "rather than specific criteria" in stability
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

    assert "**Alternative A** is the preferred alternative" in interpretation
    assert "Each expert's personal assessment also favored **Alternative A**" in interpretation
    assert "clearest differences" not in interpretation
    assert "closest to the collective" not in interpretation
    assert "### Stability and points to review" not in interpretation


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


def test_output_is_deterministic_and_uses_compact_markdown_headings(
    facts: dict,
) -> None:
    first = build_interpretation(facts)
    second = build_interpretation(deepcopy(facts))

    assert first == second
    assert re.findall(r"^### .+$", first, flags=re.MULTILINE) == [
        "### Overall result",
        "### Expert perspectives",
        "### Stability and points to review",
    ]
    assert "#### " not in first
    assert len(first.split()) < 280
