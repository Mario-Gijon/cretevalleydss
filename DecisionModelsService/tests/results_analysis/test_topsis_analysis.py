from __future__ import annotations

from copy import deepcopy

import pytest

from models.topsis.analysis import analyze_issue
from models.topsis.examples import TOPSIS_REQUEST_EXAMPLES
from models.topsis.executor import execute_topsis
from schemas.model_requests import GenericModelExecutionRequest
from services.results_analysis.model_analysis import load_model_analysis_handlers


def _basic_request() -> dict:
    return deepcopy(TOPSIS_REQUEST_EXAMPLES["basic_numeric_matrix"]["value"])


def _contrasting_request() -> dict:
    request = _basic_request()
    request["context"]["alternatives"] = [
        {"id": "alt-a", "name": "Agios Georgios (Saint George Village)"},
        {"id": "alt-b", "name": "Coastal restoration and community facilities"},
        {"id": "alt-c", "name": "Traditional olive landscape"},
    ]
    request["context"]["criteria"] = [
        {"id": "quality", "name": "Long-term ecological quality and biodiversity recovery", "type": "benefit", "expressionDomain": deepcopy(request["context"]["criteria"][0]["expressionDomain"])},
        {"id": "cost", "name": "Estimated construction and maintenance cost", "type": "cost", "expressionDomain": deepcopy(request["context"]["criteria"][0]["expressionDomain"])},
        {"id": "access", "name": "Access for local residents", "type": "benefit", "expressionDomain": deepcopy(request["context"]["criteria"][0]["expressionDomain"])},
        {"id": "emissions", "name": "Lifecycle emissions", "type": "cost", "expressionDomain": deepcopy(request["context"]["criteria"][0]["expressionDomain"])},
    ]
    request["modelParameters"]["weights"] = {
        "quality": 0.5,
        "cost": 0.25,
        "access": 0.15,
        "emissions": 0.1,
    }
    request["evaluations"] = [
        {
            "expert": {"id": "expert-ana", "name": "Ana", "email": "ana@example.test"},
            "payload": {
                "alt-a": {"quality": 8, "cost": 3, "access": 5, "emissions": 4},
                "alt-b": {"quality": 7, "cost": 7, "access": 9, "emissions": 2},
                "alt-c": {"quality": 9, "cost": 8, "access": 4, "emissions": 7},
            },
        },
        {
            "expert": {"id": "expert-luis", "name": "Luis", "email": "luis@example.test"},
            "payload": {
                "alt-a": {"quality": 8, "cost": 4, "access": 6, "emissions": 4},
                "alt-b": {"quality": 8, "cost": 6, "access": 8, "emissions": 3},
                "alt-c": {"quality": 9, "cost": 7, "access": 5, "emissions": 6},
            },
        },
    ]
    return request


def _execute_and_analyze(request: dict) -> tuple[dict, dict, dict]:
    response = execute_topsis(GenericModelExecutionRequest.model_validate(request))
    assert response["success"] is True
    data = response["data"]
    standard_result = {key: value for key, value in data.items() if key != "rawOutput"}
    context = {
        "issue": request["context"]["issue"],
        "decisionSpace": {},
        "rounds": [{
            "phase": request["context"].get("consensusPhase", 0),
            "execution": {
                "input": deepcopy(request),
                "result": {
                    "standardResult": deepcopy(standard_result),
                    "rawOutput": deepcopy(data["rawOutput"]),
                },
            },
        }],
    }
    return data, context, analyze_issue(context)


def _by_key(analysis: dict) -> dict[str, dict]:
    return {item["key"]: item for item in analysis["visualizations"]}


def test_basic_execution_analysis_matches_scores_ranks_and_collective_input():
    data, _context, analysis = _execute_and_analyze(_basic_request())
    facts = analysis["facts"]
    ranked = facts["result"]["items"]

    assert [(item["alternativeId"], item["technicalRank"], item["score"]) for item in ranked] == [
        (item["alternativeId"], item["rank"], item["score"])
        for item in data["rankedAlternatives"]
    ]
    assert facts["idealDistances"]["available"] is True
    for distance in facts["idealDistances"]["items"]:
        assert distance["closeness"] == pytest.approx(
            next(item["score"] for item in ranked if item["alternativeId"] == distance["alternativeId"]),
            abs=1e-9,
        )
    distance_pairs = {
        item["name"]: (item["positiveDistance"], item["negativeDistance"])
        for item in facts["idealDistances"]["items"]
    }
    expected_distance_pairs = {
        "Supplier B": (0.04852474794154729, 0.10361970111777223),
        "Supplier A": (0.07098529268605443, 0.05180985055888611),
        "Supplier C": (0.10361970111777223, 0.04852474794154729),
    }
    for name, expected in expected_distance_pairs.items():
        assert distance_pairs[name] == pytest.approx(expected)

    charts = _by_key(analysis)
    assert set(charts) == {
        "topsis-numeric-ranking-scores",
        "topsis-collective-performance-profile",
        "topsis-numeric-ideal-distances",
    }
    assert charts["topsis-numeric-ranking-scores"]["data"]["categories"] == [item["name"] for item in ranked]
    assert charts["topsis-numeric-ranking-scores"]["data"]["series"][0]["values"] == pytest.approx([item["score"] for item in ranked])
    profile = charts["topsis-collective-performance-profile"]
    assert profile["data"]["rows"] == [{"key": item["alternativeId"], "label": item["name"]} for item in ranked]
    assert profile["data"]["details"][0][0]["inputEvaluation"] == data["collectiveEvaluations"][ranked[0]["alternativeId"]]["crit-quality"]
    scatter = charts["topsis-numeric-ideal-distances"]["data"]["series"][0]["points"]
    assert [point["details"]["relative closeness"] for point in scatter] == pytest.approx([item["score"] for item in ranked])
    assert analysis["sections"] == [
        {"id": section["id"], "title": section["title"], "description": section["description"], "order": section["order"], "visualizations": section["visualizations"]}
        for section in analysis["sections"]
    ]


def test_mixed_direction_weighted_execution_and_long_names_change_interpretation():
    _data, context, analysis = _execute_and_analyze(_contrasting_request())
    facts = analysis["facts"]
    assert [item["direction"] for item in facts["criteria"]["items"]] == ["max", "min", "max", "min"]
    assert [item["configuredWeight"] for item in facts["criteria"]["items"]] == [0.5, 0.25, 0.15, 0.1]
    assert "Agios Georgios (Saint George Village)" in analysis["interpretation"] or "Agios Georgios (Saint George Village)" in str(facts)
    assert "lower values are preferable" in analysis["interpretation"]
    assert "different units" in analysis["interpretation"]
    profile = _by_key(analysis)["topsis-collective-performance-profile"]
    assert len(profile["data"]["columns"]) == 4
    assert len(profile["data"]["rows"]) == 3
    assert [item["name"] for item in facts["result"]["items"]] != ["Supplier B", "Supplier A", "Supplier C"]
    assert analysis["interpretation"] == analyze_issue(context)["interpretation"]


def test_exact_score_ties_are_reported_without_inventing_a_preference():
    request = _basic_request()
    request["evaluations"] = [
        {
            "expert": {"id": f"expert-{index}", "name": f"Expert {index}", "email": f"{index}@example.test"},
            "payload": {
                "alt-supplier-a": {"crit-quality": 8, "crit-cost": 4, "crit-delivery": 6},
                "alt-supplier-b": {"crit-quality": 8, "crit-cost": 4, "crit-delivery": 6},
                "alt-supplier-c": {"crit-quality": 6 + index, "crit-cost": 8, "crit-delivery": 3},
            },
        }
        for index in range(2)
    ]
    _data, _context, analysis = _execute_and_analyze(request)
    ties = analysis["facts"]["result"]["exactScoreTies"]
    assert any({item["alternativeId"] for item in group["alternatives"]} == {"alt-supplier-a", "alt-supplier-b"} for group in ties)
    assert "share the highest executed TOPSIS score" in analysis["interpretation"]
    assert "do not establish a preference within this exact tie" in analysis["interpretation"]


def test_missing_distance_diagnostics_preserve_ranking_and_performance_views():
    _data, context, _analysis = _execute_and_analyze(_basic_request())
    del context["rounds"][0]["execution"]["result"]["rawOutput"]["matrix_used"]
    analysis = analyze_issue(context)

    assert analysis["facts"]["idealDistances"]["available"] is False
    assert set(_by_key(analysis)) == {
        "topsis-numeric-ranking-scores",
        "topsis-collective-performance-profile",
    }


def test_cleaned_constant_criterion_is_mapped_back_before_distance_validation():
    request = _basic_request()
    for evaluation in request["evaluations"]:
        for alternative_values in evaluation["payload"].values():
            alternative_values["crit-delivery"] = 5
    data, _context, analysis = _execute_and_analyze(request)

    assert len(data["rawOutput"]["matrix_used"][0]) == 2
    assert analysis["facts"]["idealDistances"]["available"] is True
    delivery = next(item for item in analysis["facts"]["criteria"]["items"] if item["criterionId"] == "crit-delivery")
    assert delivery["hasObservedVariation"] is False
    assert delivery["relativeFavorability"] == [0.5, 0.5, 0.5]


def test_non_finite_scores_omit_score_and_distance_charts_without_losing_input_facts():
    _data, context, _analysis = _execute_and_analyze(_basic_request())
    standard = context["rounds"][0]["execution"]["result"]["standardResult"]
    raw = context["rounds"][0]["execution"]["result"]["rawOutput"]
    first_id = standard["rankedAlternatives"][0]["alternativeId"]
    input_ids = [item["id"] for item in context["rounds"][0]["execution"]["input"]["context"]["alternatives"]]
    standard["rankedAlternatives"][0]["score"] = None
    raw["collective_scores"][input_ids.index(first_id)] = float("nan")

    analysis = analyze_issue(context)
    assert analysis["facts"]["result"]["available"] is False
    assert analysis["facts"]["criteria"]["available"] is True
    assert "topsis-numeric-ranking-scores" not in _by_key(analysis)
    assert "topsis-collective-performance-profile" in _by_key(analysis)
    assert "topsis-numeric-ideal-distances" not in _by_key(analysis)
    assert "does not contain finite relative-closeness scores" in analysis["interpretation"]


def test_single_alternative_execution_does_not_claim_a_finite_score():
    request = _basic_request()
    request["context"]["alternatives"] = request["context"]["alternatives"][:1]
    for evaluation in request["evaluations"]:
        evaluation["payload"] = {"alt-supplier-a": evaluation["payload"]["alt-supplier-a"]}
    data, _context, analysis = _execute_and_analyze(request)

    assert len(data["rankedAlternatives"]) == 1
    assert analysis["facts"]["result"]["available"] is False
    assert "topsis-numeric-ranking-scores" not in _by_key(analysis)
    assert "topsis-numeric-ideal-distances" not in _by_key(analysis)


def test_model_analysis_loader_discovers_standard_topsis_handler():
    handlers = load_model_analysis_handlers("topsis")
    assert handlers is not None
    assert callable(handlers["analyze_issue"])
