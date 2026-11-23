from copy import deepcopy

import pytest

from models.ahp_sort_i.analysis.evidence import extract_ahp_sort_i_evidence
from models.ahp_sort_i.analysis.sensitivity import build_sensitivity_facts
from models.ahp_sort_i.examples import AHPSORT_I_REQUEST_EXAMPLES
from models.ahp_sort_i.executor import execute_ahp_sort_i
from schemas.model_requests import GenericModelExecutionRequest


def _limiting_request() -> dict:
    return deepcopy(AHPSORT_I_REQUEST_EXAMPLES["limiting_profiles"]["value"])


def _central_request() -> dict:
    request = deepcopy(AHPSORT_I_REQUEST_EXAMPLES["central_profiles_with_tie"]["value"])
    request["context"]["criteria"].append({"id": "safety", "name": "Safety"})
    request["modelParameters"]["weights"] = {"quality": 0.65, "safety": 0.35}
    payload = request["evaluations"][0]["payload"]
    payload["alternativeProfileComparisons"].extend(
        {
            **comparison,
            "criterionId": "safety",
        }
        for comparison in list(payload["alternativeProfileComparisons"])
    )
    payload["profileComparisons"].extend(
        {
            **comparison,
            "criterionId": "safety",
        }
        for comparison in list(payload["profileComparisons"])
    )
    return request


def _collective_request() -> dict:
    request = _limiting_request()
    second = deepcopy(request["evaluations"][0])
    second["expert"] = {"id": "expert-2", "name": "Expert Two"}
    for comparison in second["payload"]["alternativeProfileComparisons"]:
        comparison["alternativeToProfile"] = 1 / comparison["alternativeToProfile"]
    request["evaluations"].append(second)
    request["modelParameters"]["ahpSortGroup"] = {"tiePolicy": "pessimistic"}
    return request


def _profile_order_crossing_request() -> dict:
    request = _limiting_request()
    request["context"]["criteria"] = [
        {"id": "criterion-a", "name": "Criterion A"},
        {"id": "criterion-b", "name": "Criterion B"},
    ]
    request["context"]["alternatives"] = [
        {"id": "alternative", "name": "Alternative"}
    ]
    request["modelParameters"]["weights"] = {
        "criterion-a": 0.8,
        "criterion-b": 0.2,
    }
    request["modelParameters"]["orderedCategories"] = [
        {"categoryId": "low", "label": "Low", "order": 0},
        {"categoryId": "middle", "label": "Middle", "order": 1},
        {"categoryId": "high", "label": "High", "order": 2},
    ]
    request["modelParameters"]["ahpSortProfiles"]["profiles"] = [
        {
            "profileId": "profile-low-middle",
            "lowerCategoryId": "low",
            "upperCategoryId": "middle",
        },
        {
            "profileId": "profile-middle-high",
            "lowerCategoryId": "middle",
            "upperCategoryId": "high",
        },
    ]
    request["evaluations"][0]["payload"] = {
        "alternativeProfileComparisons": [
            {
                "alternativeId": "alternative",
                "criterionId": "criterion-a",
                "profileId": "profile-low-middle",
                "alternativeToProfile": 1,
            },
            {
                "alternativeId": "alternative",
                "criterionId": "criterion-a",
                "profileId": "profile-middle-high",
                "alternativeToProfile": 1 / 2,
            },
            {
                "alternativeId": "alternative",
                "criterionId": "criterion-b",
                "profileId": "profile-low-middle",
                "alternativeToProfile": 1 / 2,
            },
            {
                "alternativeId": "alternative",
                "criterionId": "criterion-b",
                "profileId": "profile-middle-high",
                "alternativeToProfile": 1,
            },
        ],
        "profileComparisons": [
            {
                "criterionId": "criterion-a",
                "firstProfileId": "profile-low-middle",
                "secondProfileId": "profile-middle-high",
                "firstToSecond": 1 / 2,
            },
            {
                "criterionId": "criterion-b",
                "firstProfileId": "profile-low-middle",
                "secondProfileId": "profile-middle-high",
                "firstToSecond": 2,
            },
        ],
    }
    return request


def _evidence(request_data: dict):
    request = GenericModelExecutionRequest.model_validate(request_data)
    response = execute_ahp_sort_i(request)
    assert response["success"] is True
    return extract_ahp_sort_i_evidence(
        {
            "rounds": [
                {
                    "phase": 2,
                    "execution": {
                        "attemptId": "sensitivity-attempt",
                        "modelContext": {"apiModelKey": "ahp_sort_i"},
                        "input": request_data,
                        "result": {"standardResult": response["data"]},
                    },
                }
            ]
        }
    )


def _item_for(facts: dict, criterion_id: str) -> dict:
    return next(item for item in facts["items"] if item["criterionId"] == criterion_id)


def _point_at(item: dict, weight: float) -> dict:
    return next(point for point in item["points"] if point["variedWeight"] == weight)


def test_original_weight_sample_reproduces_limiting_baseline() -> None:
    evidence = _evidence(_limiting_request())

    facts = build_sensitivity_facts(evidence)
    item = _item_for(facts, "quality")
    point = _point_at(item, evidence.criterion_weights_by_id["quality"])

    assert point["available"] is True
    assert point["baselineComparison"] == {
        "individualAssignmentsMatch": True,
        "alternativePrioritiesMatch": True,
        "alternativeSpecificProfilePrioritiesMatch": True,
        "assignmentRulesMatch": True,
        "centralProfileTieResultsMatch": None,
        "collectiveVotesMatch": None,
    }
    assert point["criterionWeights"] == [
        {"criterionId": "safety", "weight": 0.35},
        {"criterionId": "quality", "weight": 0.65},
    ]
    assert len(item["points"]) == 21
    assert item["summary"]["validSampleCount"] == 21


def test_central_profile_sensitivity_preserves_profile_tie_policy_and_priorities() -> None:
    evidence = _evidence(_central_request())

    facts = build_sensitivity_facts(evidence)
    item = _item_for(facts, "quality")
    point = _point_at(item, evidence.criterion_weights_by_id["quality"])
    alternative = point["expertResults"][0]["alternativesById"]["supplier-midpoint"]

    assert evidence.profile_mode == "central"
    assert point["baselineComparison"]["centralProfileTieResultsMatch"] is True
    assert alternative["classification"]["tiePolicy"] == "optimistic"
    assert alternative["classification"]["tieDetected"] is True
    assert set(alternative["profilePrioritiesById"]) == {"center-low", "center-high"}
    assert point["criterionWeights"] == [
        {"criterionId": "quality", "weight": 0.65},
        {"criterionId": "safety", "weight": 0.35},
    ]


def test_collective_sensitivity_recomputes_experts_and_repeats_plurality_vote() -> None:
    evidence = _evidence(_collective_request())

    facts = build_sensitivity_facts(evidence)
    item = _item_for(facts, "quality")
    point = _point_at(item, evidence.criterion_weights_by_id["quality"])
    collective = point["collectiveClassification"]

    assert len(point["expertResults"]) == 2
    assert {item["expertId"] for item in point["expertResults"]} == {
        "expert-1",
        "expert-2",
    }
    assert collective["aggregationMethod"] == "unweighted_plurality_vote"
    assert collective["groupTiePolicy"] == "pessimistic"
    assert collective["assignmentsByAlternativeId"] == evidence.executed_assignments
    assert all(
        result["tieDetected"] is True
        for result in collective["resultsByAlternativeId"].values()
    )
    assert point["baselineComparison"]["collectiveVotesMatch"] is True


def test_single_criterion_and_impossible_redistribution_are_explicitly_unavailable() -> None:
    single_criterion = build_sensitivity_facts(
        _evidence(AHPSORT_I_REQUEST_EXAMPLES["central_profiles_with_tie"]["value"])
    )
    assert single_criterion["availability"] == {
        "available": False,
        "reason": "single_criterion",
    }
    assert single_criterion["items"][0]["points"] == []

    request = _limiting_request()
    request["modelParameters"]["weights"] = {"quality": 1.0, "safety": 0.0}
    facts = build_sensitivity_facts(_evidence(request))
    item = _item_for(facts, "quality")
    unavailable = _point_at(item, 0.95)

    assert unavailable["available"] is False
    assert unavailable["reason"] == "proportional_redistribution_impossible_zero_complement"
    assert unavailable["criterionWeights"] is None
    assert item["summary"]["invalidSampleCount"] == 20
    assert item["summary"]["unavailableReasons"] == {
        "proportional_redistribution_impossible_zero_complement": 20
    }


def test_profile_order_failure_is_recorded_as_an_unavailable_sample() -> None:
    evidence = _evidence(_profile_order_crossing_request())

    facts = build_sensitivity_facts(evidence)
    item = _item_for(facts, "criterion-a")
    point = _point_at(item, 0.0)

    assert point["available"] is False
    assert point["reason"] == "profile_order_invalid"
    assert point["expertResults"][0]["available"] is False
    assert point["expertResults"][0]["errorDetails"]["code"] == (
        "ahpsort_i_profile_order_invalid"
    )
    assert item["summary"]["unavailableReasons"]["profile_order_invalid"] > 0
