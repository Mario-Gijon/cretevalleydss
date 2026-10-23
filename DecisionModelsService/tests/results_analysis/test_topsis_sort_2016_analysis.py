from copy import deepcopy
import json
import math

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


def _baseline_point(item):
    return next(
        point
        for point in item["points"]
        if point["available"] is True
        and point["variedWeight"] == item["configuredWeight"]
    )


def _sensitivity_by_criterion(analysis):
    return {
        item["criterionId"]: item for item in analysis["facts"]["sensitivity"]["items"]
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
    items = list(items or [])
    configured_alternatives = deepcopy(
        alternatives
        or [
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
        ]
    )
    baseline_by_id = {
        str(item["alternativeId"]): str(item["categoryId"])
        for item in configured_alternatives
    }
    # Test observations describe category transitions. Use their stated source
    # category as the fixture's baseline so the generated points are coherent.
    for item in items:
        for observation in (item.get("summary") or {}).get("observedChanges", []):
            for change in observation.get("changedAssignments", []):
                alternative_id = str(change.get("alternativeId", ""))
                if alternative_id in baseline_by_id:
                    baseline_by_id[alternative_id] = str(
                        change.get("fromCategoryId", baseline_by_id[alternative_id])
                    )
    for alternative in configured_alternatives:
        alternative["categoryId"] = baseline_by_id[str(alternative["alternativeId"])]

    criteria = [
        {
            "criterionId": item["criterionId"],
            "name": item["criterionName"],
            "weight": item["configuredWeight"],
        }
        for item in items
    ]
    if criteria and sum(item["weight"] for item in criteria) < 1.0:
        criteria.append(
            {
                "criterionId": "fixture-complement",
                "name": "Fixture complement",
                "weight": 1.0 - sum(item["weight"] for item in criteria),
            }
        )

    categories = [
        {"categoryId": "low", "label": "Low", "order": 0},
        {"categoryId": "medium", "label": "Medium", "order": 1},
        {"categoryId": "high", "label": "High", "order": 2},
    ]
    categories_by_id = {item["categoryId"]: item for item in categories}
    alternatives_by_id = {
        str(item["alternativeId"]): item for item in configured_alternatives
    }
    baseline = {
        key: str(item["categoryId"]) for key, item in alternatives_by_id.items()
    }

    def make_point(criterion_index, varied_weight, assignments):
        configured_weights = [float(item["weight"]) for item in criteria]
        if varied_weight == configured_weights[criterion_index]:
            weights = configured_weights
        else:
            complement = math.fsum(
                weight
                for index, weight in enumerate(configured_weights)
                if index != criterion_index
            )
            if complement == 0.0:
                return None
            weights = [0.0] * len(configured_weights)
            weights[criterion_index] = varied_weight
            for index, weight in enumerate(configured_weights):
                if index != criterion_index:
                    weights[index] = (1.0 - varied_weight) * weight / complement
        return {
            "variedWeight": varied_weight,
            "available": True,
            "reason": None,
            "criterionWeights": [
                {"criterionId": criterion["criterionId"], "weight": weights[index]}
                for index, criterion in enumerate(criteria)
            ],
            "assignments": [
                {
                    "alternativeId": alternative_id,
                    "alternativeName": alternatives_by_id[alternative_id]["name"],
                    "categoryId": category_id,
                    "category": categories_by_id[category_id]["label"],
                }
                for alternative_id, category_id in assignments.items()
            ],
        }

    for item_index, item in enumerate(items):
        item["points"] = []
        configured_weight = item["configuredWeight"]
        if item["summary"]["validSampleCount"] > 0:
            baseline_point = make_point(item_index, configured_weight, baseline)
            if baseline_point:
                item["points"].append(baseline_point)
        for observation in item["summary"]["observedChanges"]:
            assignments = dict(baseline)
            for change in observation["changedAssignments"]:
                alternative_id = str(change.get("alternativeId", ""))
                target_category_id = str(change.get("toCategoryId", ""))
                if (
                    alternative_id in assignments
                    and target_category_id in categories_by_id
                ):
                    assignments[alternative_id] = target_category_id
            point = make_point(item_index, observation["variedWeight"], assignments)
            if point:
                item["points"].append(point)
        if (
            not item["summary"]["observedChanges"]
            and item["available"] is True
            and item["summary"]["validSampleCount"] > 1
        ):
            varied_weight = configured_weight + 0.05
            if varied_weight > 1.0:
                varied_weight = configured_weight - 0.05
            if 0.0 <= varied_weight <= 1.0:
                point = make_point(item_index, varied_weight, baseline)
                if point:
                    item["points"].append(point)

    result = {
        "status": "available",
        "criteria": criteria,
        "categories": categories,
        "alternatives": configured_alternatives,
        "sensitivity": {
            "availability": availability or {"available": True, "reason": None},
            "items": items,
        },
    }
    return result


def test_analysis_is_loader_discovered_and_reproduces_the_executed_sorting_result():
    context = _analysis_context(phase=3)
    analysis = load_model_analysis_handlers("topsis_sort_2016")["analyze_issue"](
        context
    )
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
    stored = context["rounds"][0]["execution"]["result"]["standardResult"][
        "diagnostics"
    ]
    assert analysis["facts"]["profiles"][0]["closeness"] == pytest.approx(
        stored["closeness_by_profile_id"]["profile-mid"]
    )
    assert "### Criterion weight sensitivity" in analysis["interpretation"]
    assert [section["title"] for section in analysis["sections"]] == [
        "Closeness and category boundaries",
        "Criterion weight sensitivity",
    ]


def test_model_analysis_collective_matrix_preserves_ids_and_four_expert_mean():
    alternative_ids = [f"alternative-{index + 1}" for index in range(10)]
    criterion_ids = [f"criterion-{index + 1}" for index in range(6)]
    request = {
        "modelParameters": {
            "weights": {criterion_id: 1 / len(criterion_ids) for criterion_id in criterion_ids},
            "orderedCategories": [
                {"categoryId": "low", "label": "Low", "order": 0},
                {"categoryId": "high", "label": "High", "order": 1},
            ],
            "boundaryProfiles": {
                "profiles": [{
                    "profileId": "profile-high",
                    "categoryId": "high",
                    "valuesByCriterionId": {criterion_id: 50 for criterion_id in criterion_ids},
                }]
            },
        },
        "evaluations": [],
        "context": {
            "issue": {"id": "advanced-sorting-issue", "name": "Advanced sorting fixture"},
            "alternatives": [
                {"id": alternative_id, "name": f"Alternative {index + 1}"}
                for index, alternative_id in enumerate(alternative_ids)
            ],
            "criteria": [
                {
                    "id": criterion_id,
                    "name": f"Criterion {index + 1}",
                    "type": "benefit" if index % 2 == 0 else "cost",
                    "expressionDomain": {
                        "typeKey": "numericContinuous",
                        "definition": {"min": 0, "max": 100},
                    },
                }
                for index, criterion_id in enumerate(criterion_ids)
            ],
            "consensusPhase": 5,
            "previousStageResult": None,
            "structure": {"key": "alternativeCriteriaMatrix", "stage": "alternativeEvaluation"},
        },
    }
    for expert_index in range(4):
        request["evaluations"].append({
            "expert": {"id": f"expert-{expert_index + 1}", "name": f"Expert {expert_index + 1}"},
            "payload": {
                alternative_id: {
                    criterion_id: 10 + alternative_index + criterion_index + expert_index * 10
                    for criterion_index, criterion_id in enumerate(criterion_ids)
                }
                for alternative_index, alternative_id in enumerate(alternative_ids)
            },
        })

    parsed_request = GenericModelExecutionRequest.model_validate(request)
    execution = execute_topsis_sort_2016(parsed_request)
    assert execution["success"] is True
    analysis = analyze_issue({
        "rounds": [{
            "phase": 5,
            "execution": {
                "attemptId": "attempt-advanced-sorting",
                "modelContext": {"apiModelKey": "topsis_sort_2016"},
                "input": request,
                "result": {"standardResult": execution["data"]},
            },
        }]
    })

    collective = analysis["facts"]["collectiveEvaluations"]
    assert analysis["facts"]["executionId"] == "attempt-advanced-sorting"
    assert analysis["facts"]["sourcePhase"] == 5
    assert len(collective) == 10
    assert [entry["alternativeId"] for entry in collective] == alternative_ids
    for alternative_index, row in enumerate(collective):
        assert set(row["valuesByCriterionId"]) == set(criterion_ids)
        assert row["valuesByCriterionId"] == {
            criterion_id: 25 + alternative_index + criterion_index
            for criterion_index, criterion_id in enumerate(criterion_ids)
        }


def test_issue_analysis_uses_the_latest_frozen_execution_for_scenarios_and_history():
    context = _analysis_context(phase=1)
    scenario_request = _request()
    scenario_request["modelParameters"]["weights"] = {"quality": 0.7, "cost": 0.3}
    context["rounds"].append(_analysis_context(scenario_request, phase=4)["rounds"][0])
    issue_context = build_model_issue_context(
        {
            "issue": {},
            "decisionSpace": {},
            "participants": {},
            "semanticDirectory": {},
            "rounds": [
                {"phase": item["phase"], "selectedExecution": item["execution"]}
                for item in context["rounds"]
            ],
        }
    )

    analysis = analyze_issue(issue_context)

    assert analysis["facts"]["status"] == "available"
    assert analysis["facts"]["sourcePhase"] == 4
    assert analysis["facts"]["executedRounds"] == 2
    assert analysis["facts"]["criteria"][0]["weight"] == 0.7
    assert (
        analysis["facts"]["comparisonKey"]
        != analyze_issue(_analysis_context(phase=1))["facts"]["comparisonKey"]
    )


def test_weight_sensitivity_preserves_ratios_includes_exact_baseline_and_recomputes_profiles():
    analysis = analyze_issue(_analysis_context())
    sensitivity = _sensitivity_by_criterion(analysis)
    quality = sensitivity["quality"]
    original_point = next(
        point for point in quality["points"] if point["variedWeight"] == 0.65
    )
    changed_point = next(
        point for point in quality["points"] if point["variedWeight"] == 0.6
    )

    assert original_point["available"] is True
    assert original_point["criterionWeights"] == [
        {"criterionId": "quality", "weight": 0.65},
        {"criterionId": "cost", "weight": 0.35},
    ]
    assert sum(
        item["weight"] for item in changed_point["criterionWeights"]
    ) == pytest.approx(1)
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
    sensitivity = next(
        item for item in analysis["visualizations"] if item["type"] == "line"
    )

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
    assert all(
        series["pointHoverRadius"] == 0 for series in closeness["data"]["series"][1:]
    )
    assert all(
        series["pointHitRadius"] == 0 for series in closeness["data"]["series"][1:]
    )

    assert sensitivity["title"] == "Criterion weight sensitivity · Quality"
    assert sensitivity["xAxis"]["label"] == "Varied importance weight"
    assert sensitivity["yAxis"]["label"] == "Relative closeness coefficient"
    assert sensitivity["data"]["x"] == sorted(sensitivity["data"]["x"])
    assert 0.65 in sensitivity["data"]["x"]
    assert len(sensitivity["data"]["series"]) == 5
    assert all(item["values"] for item in sensitivity["data"]["series"])
    assert all(
        item["style"]["borderDash"] for item in sensitivity["data"]["series"][3:]
    )
    assert all(
        item["role"] == "alternative" for item in sensitivity["data"]["series"][:3]
    )
    assert all(item["role"] == "boundary" for item in sensitivity["data"]["series"][3:])
    assert sensitivity["presentation"]["chartHeight"] == {
        "xs": 420,
        "sm": 500,
        "md": 580,
    }
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
    request["modelParameters"]["boundaryProfiles"]["profiles"][1][
        "valuesByCriterionId"
    ] = {
        "quality": 4.0,
        "cost": 5.0,
    }
    analysis = analyze_issue(_analysis_context(request))

    assert analysis["facts"]["status"] == "available"
    quality = _sensitivity_by_criterion(analysis)["quality"]
    endpoint = next(
        point for point in quality["points"] if point["variedWeight"] == 1.0
    )
    assert endpoint["available"] is False
    assert endpoint["reason"] == "profile_closeness_order_not_strict"
    descriptor = next(
        item for item in analysis["visualizations"] if item["key"].endswith("-quality")
    )
    assert {
        "weight": 1.0,
        "reason": "profile_closeness_order_not_strict",
    } in descriptor["data"]["unavailableSamples"]
    for series in descriptor["data"]["series"]:
        assert series["values"][-1]["x"] == 1.0
        assert series["values"][-1]["y"] is None
        assert series["values"][-1]["details"]["Unavailable reason"]


def test_baseline_assignment_mismatch_is_reported_as_invalid_execution_not_analysis_unavailable():
    context = _analysis_context()
    context["rounds"][0]["execution"]["result"]["standardResult"]["assignments"][0][
        "categoryId"
    ] = "middle"

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
    assert (
        "Some criteria could not be assessed with sufficient evidence."
        in analysis["interpretation"]
    )


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
    assert "only describes the tested scenarios" in analysis["interpretation"]


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

    sensitivity_text = interpretation.split("### Criterion weight sensitivity\n\n", 1)[
        1
    ]
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
    assert complete_text.count("No category changes were observed") == 1
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
    assert "No category changes were observed" in partial_text
    assert "sampled weight(s)" not in partial_text
    assert "not enough valid variations" not in partial_text


def test_unavailable_and_partially_unavailable_sensitivity_use_short_explanations():
    unavailable = _interpretation_facts(
        [
            _sensitivity_item(
                "cost", "Purchase cost", 1.0, available=False, valid_sample_count=0
            )
        ],
        availability={"available": False, "reason": "single_criterion"},
    )
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
    assert (
        "Some criteria could not be assessed with sufficient evidence." in partial_text
    )


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


def test_result_interpretation_handles_sparse_and_within_category_comparisons():
    empty = _interpretation_facts()
    empty["alternatives"] = []
    empty_text = build_interpretation(empty)
    assert "No validated alternatives are available for comparison." in empty_text

    one = _interpretation_facts()
    one["alternatives"] = one["alternatives"][:1]
    assert "Only one alternative was evaluated" in build_interpretation(one)

    separate_categories = _interpretation_facts()
    separate_categories["alternatives"] = [
        {"alternativeId": "a", "name": "A", "categoryId": "low", "closeness": 0.2},
        {"alternativeId": "b", "name": "B", "categoryId": "medium", "closeness": 0.5},
        {"alternativeId": "c", "name": "C", "categoryId": "high", "closeness": 0.8},
    ]
    assert "no within-category positions to compare" in build_interpretation(
        separate_categories
    )

    same_category = _interpretation_facts()
    same_category["alternatives"] = [
        {"alternativeId": "a", "name": "A", "categoryId": "medium", "closeness": 0.5},
        {"alternativeId": "b", "name": "B", "categoryId": "medium", "closeness": 0.5},
    ]
    same_text = build_interpretation(same_category)
    assert "have the same relative closeness" in same_text
    assert "ranking" not in same_text.lower()

    same_category["alternatives"][1]["closeness"] = 0.501
    assert "very similar relative closeness values" in build_interpretation(
        same_category
    )
    same_category["alternatives"][1]["closeness"] = 0.8
    relevant = build_interpretation(same_category)
    assert "relative closeness values differ by 0.30" in relevant
    assert "ranking" not in relevant.lower()

    no_categories = _interpretation_facts()
    no_categories["categories"] = []
    assert "No category information is available" in build_interpretation(no_categories)

    no_empty_header = build_interpretation(empty)
    assert (
        "### Result interpretation\n\n### Criterion weight sensitivity"
        not in no_empty_header
    )
    assert "### Result interpretation\n\nNo validated alternatives" in no_empty_header


def test_sensitivity_interpretation_uses_valid_points_not_summaries_or_item_flags():
    changed = _interpretation_facts(
        [
            _sensitivity_item(
                "cost",
                "Purchase cost",
                0.2,
                [_weight_observation(0.25, _sample_change("alpha"))],
            )
        ]
    )
    item = changed["sensitivity"]["items"][0]
    item["available"] = False
    item["summary"]["validSampleCount"] = 0
    item["summary"]["observedChanges"] = []
    item["summary"]["nearestObservedChange"] = None
    assert "**Alpha** moves from **Medium** to **Low**" in build_interpretation(changed)

    no_change = _interpretation_facts([_sensitivity_item("cost", "Purchase cost", 0.2)])
    item = no_change["sensitivity"]["items"][0]
    baseline = _baseline_point(item)
    variation = next(point for point in item["points"] if point is not baseline)
    item["points"].append(deepcopy(variation))
    item["summary"]["validSampleCount"] = 99
    item["summary"]["observedChanges"] = [
        _weight_observation(0.3, _sample_change("alpha"))
    ]
    no_change_text = build_interpretation(no_change)
    assert (
        "No category changes were observed across the valid weight variations examined."
        in no_change_text
    )
    assert "This only describes the tested scenarios." in no_change_text
    assert "Purchase cost" not in no_change_text

    inconsistent = deepcopy(no_change)
    item = inconsistent["sensitivity"]["items"][0]
    duplicate = deepcopy(item["points"][-1])
    duplicate["assignments"][0]["categoryId"] = "high"
    item["points"].append(duplicate)
    inconsistent_text = build_interpretation(inconsistent)
    assert "There isn't enough information to assess how changing" in inconsistent_text
    assert "No category changes were observed" not in inconsistent_text

    invalid_intermediate = deepcopy(changed)
    item = invalid_intermediate["sensitivity"]["items"][0]
    item["points"].insert(
        1,
        {
            "variedWeight": 0.3,
            "available": False,
            "reason": "profile_closeness_order_not_strict",
            "criterionWeights": None,
            "assignments": None,
        },
    )
    assert "**Alpha** moves from **Medium** to **Low**" in build_interpretation(
        invalid_intermediate
    )


def test_sensitivity_states_require_a_valid_baseline_and_distinct_weight_evidence():
    sufficient_no_change = _interpretation_facts(
        [
            _sensitivity_item("cost", "Purchase cost", 0.2),
            _sensitivity_item("quality", "Product quality", 0.8),
        ]
    )
    first, second = sufficient_no_change["sensitivity"]["items"]
    second["points"] = [_baseline_point(second)]
    second["summary"]["validSampleCount"] = 21
    partial_text = build_interpretation(sufficient_no_change)
    assert (
        "No category changes were observed across the valid weight variations examined."
        in partial_text
    )
    assert (
        "Some criteria could not be assessed with sufficient evidence." in partial_text
    )

    baseline_only = deepcopy(sufficient_no_change)
    for item in baseline_only["sensitivity"]["items"]:
        baseline = _baseline_point(item)
        item["points"] = [baseline]
        item["summary"]["validSampleCount"] = 99
        item["available"] = True
    baseline_text = build_interpretation(baseline_only)
    assert "There isn't enough information to assess how changing" in baseline_text
    assert "No category changes were observed" not in baseline_text

    no_valid = deepcopy(sufficient_no_change)
    for item in no_valid["sensitivity"]["items"]:
        for point in item["points"]:
            point["available"] = False
        item["summary"]["validSampleCount"] = 99
    no_valid_text = build_interpretation(no_valid)
    assert "There isn't enough information to assess how changing" in no_valid_text
    assert "No category changes were observed" not in no_valid_text

    empty_criteria = deepcopy(sufficient_no_change)
    empty_criteria["criteria"] = []
    empty_criteria["sensitivity"]["items"] = []
    assert "There isn't enough information to assess" in build_interpretation(
        empty_criteria
    )

    single_criterion = _interpretation_facts(
        [
            _sensitivity_item(
                "quality", "Quality", 1.0, available=False, valid_sample_count=0
            )
        ]
    )
    assert "only one criterion" in build_interpretation(single_criterion)

    impossible = _interpretation_facts(
        [
            _sensitivity_item(
                "quality", "Quality", 1.0, available=False, valid_sample_count=1
            ),
            _sensitivity_item(
                "cost", "Cost", 0.0, available=False, valid_sample_count=1
            ),
        ]
    )
    impossible["sensitivity"]["items"][0]["points"].append(
        {
            "variedWeight": 0.95,
            "available": False,
            "reason": "proportional_redistribution_impossible_zero_complement",
            "criterionWeights": None,
            "assignments": None,
        }
    )
    impossible_text = build_interpretation(impossible)
    assert (
        "remaining criteria have no weight available for redistribution"
        in impossible_text
    )


def test_partial_sensitivity_keeps_observed_changes_and_omits_redundant_recaps():
    facts = _interpretation_facts(
        [
            _sensitivity_item(
                "cost",
                "Purchase cost",
                0.2,
                [_weight_observation(0.25, _sample_change("alpha"))],
            ),
            _sensitivity_item(
                "quality",
                "Product quality",
                0.8,
                available=False,
                valid_sample_count=1,
            ),
        ]
    )
    text = build_interpretation(facts)
    assert "**Alpha** moves from **Medium** to **Low**" in text
    assert "Some criteria could not be assessed with sufficient evidence." in text
    assert "changed category under multiple tested criterion variations" not in text
    assert "exact switching points were not calculated" in text


def test_building_interpretation_does_not_change_complete_math_evidence():
    analysis = analyze_issue(_analysis_context())
    original_facts = deepcopy(analysis["facts"])

    interpretation = build_interpretation(analysis["facts"])

    assert analysis["facts"] == original_facts
    assert len(analysis["facts"]["sensitivity"]["items"]) == 2
    assert all(
        len(item["points"]) == 21 for item in analysis["facts"]["sensitivity"]["items"]
    )
    assert "### Result interpretation" in interpretation
    assert "### Criterion weight sensitivity" in interpretation
