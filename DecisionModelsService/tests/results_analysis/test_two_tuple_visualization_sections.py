from __future__ import annotations

from copy import deepcopy

import pytest

from models.two_tuple.analysis import analyze_issue
from models.two_tuple.examples import TWO_TUPLE_REQUEST_EXAMPLES
from models.two_tuple.executor import execute_two_tuple
from schemas.model_requests import GenericModelExecutionRequest


def _analyze_request(request_value: dict) -> dict:
    request = GenericModelExecutionRequest.model_validate(request_value)
    response = execute_two_tuple(request)
    assert response["success"] is True

    return analyze_issue(
        {
            "issue": {
                "id": "issue-1",
                "name": "Example issue",
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
                },
            ],
        }
    )


def _visualization_keys(analysis: dict) -> list[str]:
    return [
        item["key"]
        for item in analysis["visualizations"]
    ]


def _assert_removed_views_are_absent(analysis: dict) -> None:
    keys = _visualization_keys(analysis)
    removed = {
        "two-tuple-final-ranking",
        "two-tuple-loco-rank-impact",
        "two-tuple-criterion-separation",
    }

    assert removed.isdisjoint(keys)
    assert not any(
        key.startswith("two-tuple-criteria-aggregation-")
        for key in keys
    )
    assert all(
        section["visualizations"]
        for section in analysis["sections"]
    )


def test_two_tuple_analysis_omits_removed_views_and_preserves_result_facts():
    request_value = deepcopy(
        TWO_TUPLE_REQUEST_EXAMPLES[
            "basic_linguistic_2tuple_matrix"
        ]["value"]
    )
    analysis = _analyze_request(request_value)
    keys = _visualization_keys(analysis)

    _assert_removed_views_are_absent(analysis)
    assert {
        "two-tuple-collective-profile",
        "two-tuple-alpha-heatmap",
        "two-tuple-evaluator-distance",
        "two-tuple-evaluator-disagreement",
    }.issubset(keys)
    assert any(
        key.startswith("two-tuple-criterion-weight-sensitivity-")
        for key in keys
    )

    result = analysis["facts"]["result"]
    assert [
        (item["name"], item["technicalRank"])
        for item in result["technicalRanking"]
    ] == [
        ("Alternative A", 1),
        ("Alternative B", 2),
    ]
    assert [
        item["beta"]
        for item in result["technicalRanking"]
    ] == pytest.approx([3.025, 1.575])
    assert result["winner"]["available"] is True
    assert result["winner"]["alternative"]["alternativeId"] == "alt-a"

    aggregation = analysis["facts"]["aggregation"]["criteriaAggregation"]
    assert aggregation["summary"]["method"] == "weighted_average"
    assert aggregation["summary"]["effectiveWeights"] == pytest.approx(
        [0.6, 0.4]
    )
    assert aggregation["trace"]["alternatives"][0]["aggregatedBeta"] == (
        pytest.approx(3.025)
    )


def test_two_tuple_analysis_keeps_loeo_without_loco_visualization():
    request_value = deepcopy(
        TWO_TUPLE_REQUEST_EXAMPLES[
            "basic_linguistic_2tuple_matrix"
        ]["value"]
    )
    request_value["evaluations"] = []

    for expert_id, expert_name, alternative_a, alternative_b in (
        ("expert-1", "Expert 1", "s4", "s1"),
        ("expert-2", "Expert 2", "s4", "s1"),
        ("expert-3", "Expert 3", "s0", "s4"),
    ):
        request_value["evaluations"].append(
            {
                "expert": {
                    "id": expert_id,
                    "name": expert_name,
                    "email": f"{expert_id}@example.com",
                },
                "payload": {
                    "alt-a": {
                        "quality": {
                            "labelKey": alternative_a,
                            "alpha": 0.0,
                        },
                        "service": {
                            "labelKey": alternative_a,
                            "alpha": 0.0,
                        },
                    },
                    "alt-b": {
                        "quality": {
                            "labelKey": alternative_b,
                            "alpha": 0.0,
                        },
                        "service": {
                            "labelKey": alternative_b,
                            "alpha": 0.0,
                        },
                    },
                },
            }
        )

    analysis = _analyze_request(request_value)
    keys = _visualization_keys(analysis)

    _assert_removed_views_are_absent(analysis)
    assert "two-tuple-loeo-rank-impact" in keys
    assert "two-tuple-personal-vs-collective-ranking" in keys
    robustness = next(
        section
        for section in analysis["sections"]
        if section["id"] == "two-tuple-robustness"
    )
    assert [
        item["key"]
        for item in robustness["visualizations"]
    ] == ["two-tuple-loeo-rank-impact"]


def test_two_tuple_analysis_keeps_expert_weight_sensitivity():
    request_value = deepcopy(
        TWO_TUPLE_REQUEST_EXAMPLES[
            "basic_linguistic_2tuple_matrix"
        ]["value"]
    )
    request_value["modelParameters"]["expertAggregation"] = {
        "method": "weighted_average",
        "options": {},
    }
    for evaluation, weight in zip(
        request_value["evaluations"],
        (0.6, 0.4),
        strict=True,
    ):
        evaluation["weight"] = weight

    analysis = _analyze_request(request_value)
    keys = _visualization_keys(analysis)

    _assert_removed_views_are_absent(analysis)
    assert any(
        key.startswith("two-tuple-expert-weight-sensitivity-")
        for key in keys
    )
    expert_sensitivity = next(
        section
        for section in analysis["sections"]
        if section["id"] == "two-tuple-expert-sensitivity"
    )
    assert expert_sensitivity["visualizations"]
