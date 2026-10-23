from copy import deepcopy
import json

import pytest

from models.topsis_sort_2016.analysis import analyze_issue
from models.topsis_sort_2016.examples import TOPSIS_SORT_2016_REQUEST_EXAMPLES
from models.topsis_sort_2016.executor import execute_topsis_sort_2016
from models.topsis_sort_2016.analysis.interpretation import build_interpretation
from schemas.model_requests import GenericModelExecutionRequest
from services.results_analysis.contexts import build_model_issue_context
from services.results_analysis.model_analysis import load_model_analysis_handlers


def _request():
    return deepcopy(
        TOPSIS_SORT_2016_REQUEST_EXAMPLES["numeric_benefit_cost_sorting"]["value"]
    )


def _analysis_context(request=None, *, phase=0):
    frozen_input = deepcopy(request or _request())
    response = execute_topsis_sort_2016(
        GenericModelExecutionRequest.model_validate(frozen_input)
    )
    assert response["success"] is True
    return {
        "rounds": [
            {
                "phase": phase,
                "execution": {
                    "attemptId": f"attempt-{phase}",
                    "modelContext": {"apiModelKey": "topsis_sort_2016"},
                    "input": frozen_input,
                    "result": {"standardResult": response["data"]},
                },
            }
        ]
    }


def _sensitivity_by_criterion(analysis):
    return {
        item["criterionId"]: item
        for item in analysis["facts"]["sensitivity"]["items"]
    }


def _sample_change(alternative_id, from_category="Medium", to_category="Low"):
    return {
        "alternativeId": alternative_id,
        "alternativeName": alternative_id.title(),
        "fromCategoryId": from_category.casefold(),
        "fromCategory": from_category,
        "toCategoryId": to_category.casefold(),
        "toCategory": to_category,
    }


def _sensitivity_item(
    criterion_id,
    criterion_name,
    configured_weight,
    observations=None,
    *,
    available=True,
    unavailable_sample_count=0,
    valid_sample_count=21,
):
    observations = observations or []
    nearest = min(
        observations,
        key=lambda item: abs(item["variedWeight"] - configured_weight),
        default=None,
    )
    return {
        "criterionId": criterion_id,
        "criterionIndex": len(criterion_id),
        "criterionName": criterion_name,
        "configuredWeight": configured_weight,
        "available": available,
        "reason": None if available else "insufficient_valid_weight_samples",
        "summary": {
            "validSampleCount": valid_sample_count,
            "unavailableSampleCount": unavailable_sample_count,
            "observedChanges": observations,
            "nearestObservedChange": nearest,
            "noChangesAcrossValidSamples": not observations,
        },
    }


def _weight_observation(varied_weight, *changes):
    return {
        "variedWeight": varied_weight,
        "weightDifferenceFromConfigured": None,
        "changedAssignments": list(changes),
    }


def _interpretation_facts(items=None, *, alternatives=None, availability=None):
    return {
        "status": "available",
        "categories": [
            {"categoryId": "low", "label": "Low", "order": 0},
            {"categoryId": "medium", "label": "Medium", "order": 1},
            {"categoryId": "high", "label": "High", "order": 2},
        ],
        "alternatives": alternatives or [
            {
                "alternativeId": "alpha",
                "name": "Alpha",
                "categoryId": "medium",
                "closeness": 0.48,
            },
            {
                "alternativeId": "beta",
                "name": "Beta",
                "categoryId": "medium",
                "closeness": 0.76,
            },
            {
                "alternativeId": "gamma",
                "name": "Gamma",
                "categoryId": "low",
                "closeness": 0.25,
            },
        ],
        "sensitivity": {
            "availability": availability or {"available": True, "reason": None},
            "items": items or [],
        },
    }


def test_analysis_is_loader_discovered_and_reproduces_the_executed_sorting_result():
    context = _analysis_context(phase=3)
    analysis = load_model_analysis_handlers("topsis_sort_2016")["analyze_issue"](context)
    json.dumps(analysis, allow_nan=False)

    assert analysis["facts"]["status"] == "available"
    assert analysis["facts"]["sourcePhase"] == 3
    assert analysis["facts"]["baselineValidation"]["checks"] == [
        "categories",
        "assignments",
        "alternative_closeness",
        "profile_closeness",
        "alternative_ideal_distances",
        "profile_ideal_distances",
    ]
    assert [item["label"] for item in analysis["facts"]["categories"]] == [
        "Low",
        "Middle",
        "High",
    ]
    assert [item["name"] for item in analysis["facts"]["alternatives"]] == [
        "Supplier A",
        "Supplier B",
        "Supplier C",
    ]
    assert analysis["facts"]["alternatives"][0]["categoryLabel"] == "High"
    assert analysis["facts"]["alternatives"][1]["categoryLabel"] == "Middle"
    assert analysis["facts"]["alternatives"][2]["categoryLabel"] == "Low"
    assert len(analysis["facts"]["collectiveEvaluations"]) == 3
    stored = context["rounds"][0]["execution"]["result"]["standardResult"]["diagnostics"]
    assert analysis["facts"]["profiles"][0]["closeness"] == pytest.approx(
        stored["closeness_by_profile_id"]["profile-mid"]
    )
    assert "### Criterion weight sensitivity" in analysis["interpretation"]
    assert [section["title"] for section in analysis["sections"]] == [
        "Closeness and category boundaries",
        "Criterion weight sensitivity",
    ]


def test_issue_analysis_uses_the_latest_frozen_execution_for_scenarios_and_history():
    context = _analysis_context(phase=1)
    scenario_request = _request()
    scenario_request["modelParameters"]["weights"] = {"quality": 0.7, "cost": 0.3}
    context["rounds"].append(_analysis_context(scenario_request, phase=4)["rounds"][0])
    issue_context = build_model_issue_context({
        "issue": {},
        "decisionSpace": {},
        "participants": {},
        "semanticDirectory": {},
        "rounds": [
            {"phase": item["phase"], "selectedExecution": item["execution"]}
            for item in context["rounds"]
        ],
    })

    analysis = analyze_issue(issue_context)

    assert analysis["facts"]["status"] == "available"
    assert analysis["facts"]["sourcePhase"] == 4
    assert analysis["facts"]["executedRounds"] == 2
    assert analysis["facts"]["criteria"][0]["weight"] == 0.7
    assert analysis["facts"]["comparisonKey"] != analyze_issue(
        _analysis_context(phase=1)
    )["facts"]["comparisonKey"]


def test_weight_sensitivity_preserves_ratios_includes_exact_baseline_and_recomputes_profiles():
    analysis = analyze_issue(_analysis_context())
    sensitivity = _sensitivity_by_criterion(analysis)
    quality = sensitivity["quality"]
    original_point = next(
        point for point in quality["points"]
        if point["variedWeight"] == 0.65
    )
    changed_point = next(
        point for point in quality["points"]
        if point["variedWeight"] == 0.6
    )

    assert original_point["available"] is True
    assert original_point["criterionWeights"] == [
        {"criterionId": "quality", "weight": 0.65},
        {"criterionId": "cost", "weight": 0.35},
    ]
    assert sum(item["weight"] for item in changed_point["criterionWeights"]) == pytest.approx(1)
    assert changed_point["criterionWeights"][1]["weight"] == pytest.approx(0.4)
    assert changed_point["closenessByProfileId"]["profile-high"] != pytest.approx(
        original_point["closenessByProfileId"]["profile-high"]
    )
    assert changed_point["changedAssignments"]
    assert "Supplier A" in analysis["interpretation"]
    assert "**High** to **Middle**" in analysis["interpretation"]
    assert "the tested scenario" in analysis["interpretation"]


def test_analysis_visualizations_include_two_graphs_and_dynamic_alternative_and_profile_series():
    analysis = analyze_issue(_analysis_context())
    closeness = analysis["visualizations"][0]
    sensitivity = next(item for item in analysis["visualizations"] if item["type"] == "line")

    assert closeness["title"] == "Closeness and category boundaries"
    assert closeness["xAxis"] == {
        "label": "Relative closeness coefficient",
        "min": 0,
        "max": 1,
        "scaleType": "linear",
    }
    assert closeness["presentation"]["tooltip"] == {
        "variant": "closeness-boundaries",
        "precision": 4,
    }
    assert closeness["presentation"]["referenceLines"] == {"interactive": False}
    assert len(closeness["data"]["series"][0]["points"]) == 3
    alternative = analysis["facts"]["alternatives"][0]
    alternative_point = closeness["data"]["series"][0]["points"][0]
    assert alternative_point["id"] == alternative["alternativeId"]
    assert alternative_point["x"] == alternative["closeness"]
    assert alternative_point["details"] == {
        "Category": alternative["categoryLabel"],
        "Relative closeness coefficient": alternative["closeness"],
        "Nearest boundary": alternative["nearestBoundary"]["label"],
        "Distance from nearest boundary": alternative["nearestBoundary"]["distance"],
    }
    assert all(series["showLine"] is True for series in closeness["data"]["series"][1:])
    assert all(series["borderDash"] for series in closeness["data"]["series"][1:])
    assert len(closeness["data"]["series"][1:]) == len(analysis["facts"]["profiles"])
    assert all(series["pointRadius"] == 0 for series in closeness["data"]["series"][1:])
    assert all(series["pointHoverRadius"] == 0 for series in closeness["data"]["series"][1:])
    assert all(series["pointHitRadius"] == 0 for series in closeness["data"]["series"][1:])

    assert sensitivity["title"] == "Criterion weight sensitivity · Quality"
    assert sensitivity["xAxis"]["label"] == "Varied importance weight"
    assert sensitivity["yAxis"]["label"] == "Relative closeness coefficient"
    assert sensitivity["data"]["x"] == sorted(sensitivity["data"]["x"])
    assert 0.65 in sensitivity["data"]["x"]
    assert len(sensitivity["data"]["series"]) == 5
    assert all(item["values"] for item in sensitivity["data"]["series"])
    assert all(item["style"]["borderDash"] for item in sensitivity["data"]["series"][3:])
    assert all(item["role"] == "alternative" for item in sensitivity["data"]["series"][:3])
    assert all(item["role"] == "boundary" for item in sensitivity["data"]["series"][3:])
    assert sensitivity["presentation"]["chartHeight"] == {"xs": 420, "sm": 500, "md": 580}
    assert sensitivity["presentation"]["alternativeSelector"] == {"recommendedCount": 3}
    assert "methodDetails" not in sensitivity["presentation"]
    assert "unavailableSamples" in sensitivity["data"]


def test_boundary_profiles_are_presented_in_category_preference_order():
    request = _request()
    request["modelParameters"]["boundaryProfiles"]["profiles"].reverse()

    analysis = analyze_issue(_analysis_context(request))

    assert [item["profileId"] for item in analysis["facts"]["profiles"]] == [
        "profile-mid",
        "profile-high",
    ]
    closeness = analysis["visualizations"][0]
    assert [item["label"] for item in closeness["data"]["series"][1:]] == [
        "Low / Middle boundary",
        "Middle / High boundary",
    ]


def test_weight_sensitivity_gaps_invalid_samples_when_profile_limits_coincide():
    request = _request()
    request["modelParameters"]["boundaryProfiles"]["profiles"][1]["valuesByCriterionId"] = {
        "quality": 4.0,
        "cost": 5.0,
    }
    analysis = analyze_issue(_analysis_context(request))

    assert analysis["facts"]["status"] == "available"
    quality = _sensitivity_by_criterion(analysis)["quality"]
    endpoint = next(point for point in quality["points"] if point["variedWeight"] == 1.0)
    assert endpoint["available"] is False
    assert endpoint["reason"] == "profile_closeness_order_not_strict"
    descriptor = next(
        item for item in analysis["visualizations"]
        if item["key"].endswith("-quality")
    )
    assert {"weight": 1.0, "reason": "profile_closeness_order_not_strict"} in descriptor["data"]["unavailableSamples"]
    for series in descriptor["data"]["series"]:
        assert series["values"][-1]["x"] == 1.0
        assert series["values"][-1]["y"] is None
        assert series["values"][-1]["details"]["Unavailable reason"]


def test_baseline_assignment_mismatch_is_reported_as_invalid_execution_not_analysis_unavailable():
    context = _analysis_context()
    context["rounds"][0]["execution"]["result"]["standardResult"]["assignments"][0]["categoryId"] = "middle"

    analysis = analyze_issue(context)

    assert analysis["facts"]["status"] == "invalid_execution"
    assert analysis["visualizations"] == []
    assert "does not reproduce from its frozen input" in analysis["interpretation"]


def test_incomplete_historical_input_returns_analysis_unavailable_without_conclusions():
    context = _analysis_context()
    del context["rounds"][0]["execution"]["input"]

    analysis = analyze_issue(context)

    assert analysis["facts"]["status"] == "unavailable"
    assert analysis["visualizations"] == []
    assert "frozen execution request" in analysis["interpretation"]


def test_single_criterion_and_zero_complement_are_controlled_sensitivity_cases():
    request = _request()
    request["context"]["criteria"] = request["context"]["criteria"][:1]
    request["modelParameters"]["weights"] = {"quality": 1.0}
    request["modelParameters"]["boundaryProfiles"]["profiles"] = [
        {
            "profileId": "profile-mid",
            "categoryId": "middle",
            "valuesByCriterionId": {"quality": 4.0},
        },
        {
            "profileId": "profile-high",
            "categoryId": "high",
            "valuesByCriterionId": {"quality": 7.0},
        },
    ]
    for evaluation in request["evaluations"]:
        for alternative in evaluation["payload"].values():
            alternative.pop("cost")
    analysis = analyze_issue(_analysis_context(request))
    assert analysis["facts"]["sensitivity"]["availability"] == {
        "available": False,
        "reason": "single_criterion",
    }
    assert all(item["type"] != "line" for item in analysis["visualizations"])

    request = _request()
    request["modelParameters"]["weights"] = {"quality": 1.0, "cost": 0.0}
    analysis = analyze_issue(_analysis_context(request))
    quality = _sensitivity_by_criterion(analysis)["quality"]
    assert quality["available"] is False
    assert quality["reason"] == "insufficient_valid_weight_samples"
    assert quality["summary"]["unavailableSampleCount"] == 20
    assert "Some criteria could not be assessed across enough valid scenarios." in analysis["interpretation"]


def test_no_observed_category_changes_are_limited_to_the_valid_sample_grid():
    request = _request()
    request["context"]["alternatives"] = [{"id": "alt-a", "name": "Premium option"}]
    request["evaluations"][0]["payload"] = {
        "alt-a": {"quality": 10.0, "cost": 0.0},
    }
    analysis = analyze_issue(_analysis_context(request))
    sensitivity = _sensitivity_by_criterion(analysis)

    for item in sensitivity.values():
        assert item["summary"]["noChangesAcrossValidSamples"] is True
        assert item["summary"]["observedAdjacentTransitions"] == []
    assert "valid weight variations examined" in analysis["interpretation"]
    assert "only to the tested scenarios" in analysis["interpretation"]


def test_interpretation_selects_relevant_nearby_changes_and_limits_many_criteria():
    purchase_changes = [
        _sample_change("alpha"),
        _sample_change("beta"),
        _sample_change("gamma"),
    ]
    far_changes = purchase_changes + [
        _sample_change("delta"),
        _sample_change("epsilon"),
        _sample_change("zeta"),
    ]
    items = [
        _sensitivity_item(
            "purchase-cost",
            "Purchase cost",
            0.2,
            [
                _weight_observation(0.25, *purchase_changes),
                _weight_observation(0.45, *far_changes),
            ],
        ),
        _sensitivity_item(
            "sustainability",
            "Sustainability",
            0.145,
            [_weight_observation(0.1, _sample_change("alpha"))],
        ),
        _sensitivity_item(
            "delivery-time",
            "Delivery time",
            0.125,
            [_weight_observation(0.2, *purchase_changes)],
        ),
        _sensitivity_item(
            "quality",
            "Product quality",
            0.25,
            [_weight_observation(0.3, _sample_change("alpha"))],
        ),
        _sensitivity_item(
            "reliability",
            "Delivery reliability",
            0.175,
            [_weight_observation(0.25, _sample_change("alpha"))],
        ),
        _sensitivity_item(
            "support",
            "After-sales support",
            0.105,
            [_weight_observation(0.2, _sample_change("alpha"))],
        ),
    ]
    facts = _interpretation_facts(items)

    interpretation = build_interpretation(facts)

    sensitivity_text = interpretation.split("### Criterion weight sensitivity\n\n", 1)[1]
    assert "Purchase cost" in sensitivity_text
    assert "Delivery time" in sensitivity_text
    assert "Sustainability" in sensitivity_text
    assert "Product quality" not in sensitivity_text
    assert "Delivery reliability" not in sensitivity_text
    assert "After-sales support" not in sensitivity_text
    assert "from 20% to 25%" in sensitivity_text
    assert "from 20% to 45%" not in sensitivity_text
    assert len(interpretation.split()) <= 160


def test_interpretation_groups_many_assignments_and_keeps_single_changes_clear():
    many = _interpretation_facts(
        [
            _sensitivity_item(
                "purchase-cost",
                "Purchase cost",
                0.2,
                [
                    _weight_observation(
                        0.25,
                        _sample_change("alpha"),
                        _sample_change("beta"),
                        _sample_change("gamma"),
                    )
                ],
            )
        ]
    )

    grouped = build_interpretation(many)

    assert "three alternatives move from **Medium** to **Low**" in grouped
    assert "including **Alpha** and **Beta**" in grouped
    assert "Alpha; Beta; Gamma" not in grouped

    one = _interpretation_facts(
        [
            _sensitivity_item(
                "purchase-cost",
                "Purchase cost",
                0.2,
                [_weight_observation(0.25, _sample_change("alpha"))],
            )
        ]
    )
    single = build_interpretation(one)
    assert "**Alpha** moves from **Medium** to **Low**" in single


def test_interpretation_keeps_distinct_category_transitions_in_the_same_scenario():
    facts = _interpretation_facts(
        [
            _sensitivity_item(
                "quality",
                "Product quality",
                0.25,
                [
                    _weight_observation(
                        0.3,
                        _sample_change("alpha", "Medium", "Low"),
                        _sample_change("beta", "High", "Medium"),
                    )
                ],
            )
        ]
    )

    interpretation = build_interpretation(facts)

    assert "**Alpha** moves from **Medium** to **Low**" in interpretation
    assert "while **Beta** moves from **High** to **Medium**" in interpretation


def test_no_observed_changes_are_summarized_once_and_partial_invalid_samples_are_quiet():
    complete = _interpretation_facts(
        [
            _sensitivity_item("cost", "Purchase cost", 0.2),
            _sensitivity_item("quality", "Product quality", 0.8),
        ]
    )
    complete_text = build_interpretation(complete)
    assert complete_text.count("Assignments stayed the same") == 1
    assert "valid weight variations examined" in complete_text
    assert "Purchase cost" not in complete_text

    partial = _interpretation_facts(
        [
            _sensitivity_item(
                "cost",
                "Purchase cost",
                0.2,
                unavailable_sample_count=4,
            ),
            _sensitivity_item(
                "quality",
                "Product quality",
                0.8,
                unavailable_sample_count=7,
            ),
        ]
    )
    partial_text = build_interpretation(partial)
    assert "Assignments stayed the same" in partial_text
    assert "sampled weight(s)" not in partial_text
    assert "not evidence of stability" not in partial_text


def test_unavailable_and_partially_unavailable_sensitivity_use_short_explanations():
    unavailable = _interpretation_facts(
        availability={"available": False, "reason": "single_criterion"}
    )
    unavailable["sensitivity"]["items"] = [
        _sensitivity_item(
            "cost", "Purchase cost", 1.0, available=False, valid_sample_count=0
        )
    ]
    unavailable_text = build_interpretation(unavailable)
    assert "only one criterion" in unavailable_text
    assert "Purchase cost" not in unavailable_text
    assert "independently" in unavailable_text

    partial = _interpretation_facts(
        [
            _sensitivity_item(
                "cost",
                "Purchase cost",
                0.2,
                [_weight_observation(0.25, _sample_change("alpha"))],
            ),
            _sensitivity_item(
                "support",
                "After-sales support",
                0.8,
                available=False,
                valid_sample_count=1,
            ),
        ]
    )
    partial_text = build_interpretation(partial)
    assert "After-sales support" not in partial_text
    assert "Some criteria could not be assessed across enough valid scenarios." in partial_text


def test_interpretation_breaks_ties_deterministically_and_has_no_ranking_claims():
    items = [
        _sensitivity_item(
            criterion_id,
            criterion_name,
            0.2,
            [_weight_observation(0.25, _sample_change("alpha"))],
        )
        for criterion_id, criterion_name in [
            ("criterion-a", "Criterion A"),
            ("criterion-b", "Criterion B"),
            ("criterion-c", "Criterion C"),
            ("criterion-d", "Criterion D"),
        ]
    ]
    facts = _interpretation_facts(items)
    first = build_interpretation(facts)

    assert build_interpretation(deepcopy(facts)) == first
    sensitivity_text = first.split("### Criterion weight sensitivity\n\n", 1)[1]
    assert "Criterion A" in sensitivity_text
    assert "Criterion B" in sensitivity_text
    assert "Criterion C" in sensitivity_text
    assert "Criterion D" not in sensitivity_text
    assert "ranking" not in first.lower()
    assert "winner" not in first.lower()
    assert "probability" not in first.lower()
    assert "closest alternative" not in first.lower()
    assert "boundary" not in first.lower()
    assert "exact switching points were not calculated" in first


def test_dynamic_labels_escape_markdown_and_disambiguate_duplicate_alternatives():
    duplicate_name = "A* [Supply] | Group"
    alternatives = [
        {
            "alternativeId": "alternative-one-id",
            "name": duplicate_name,
            "categoryId": "medium",
            "closeness": 0.48,
        },
        {
            "alternativeId": "alternative-two-id",
            "name": duplicate_name,
            "categoryId": "medium",
            "closeness": 0.76,
        },
        {
            "alternativeId": "alternative-three-id",
            "name": "Gamma",
            "categoryId": "low",
            "closeness": 0.25,
        },
    ]
    first = _sample_change("alternative-one-id")
    second = _sample_change("alternative-two-id")
    first["alternativeName"] = duplicate_name
    second["alternativeName"] = duplicate_name
    facts = _interpretation_facts(
        [
            _sensitivity_item(
                "purchase-cost",
                "Purchase_cost [urgent]",
                0.2,
                [_weight_observation(0.25, first, second)],
            )
        ],
        alternatives=alternatives,
    )

    interpretation = build_interpretation(facts)

    assert "alternative 1" in interpretation and "alternative 2" in interpretation
    assert r"A\* \[Supply\] \| Group" in interpretation
    assert "alternative-one-id" not in interpretation
    assert "alternative-two-id" not in interpretation
    assert r"Purchase\_cost \[urgent\]" in interpretation


def test_building_interpretation_does_not_change_complete_math_evidence():
    analysis = analyze_issue(_analysis_context())
    original_facts = deepcopy(analysis["facts"])

    interpretation = build_interpretation(analysis["facts"])

    assert analysis["facts"] == original_facts
    assert len(analysis["facts"]["sensitivity"]["items"]) == 2
    assert all(
        len(item["points"]) == 21
        for item in analysis["facts"]["sensitivity"]["items"]
    )
    assert "### Result interpretation" in interpretation
    assert "### Criterion weight sensitivity" in interpretation
