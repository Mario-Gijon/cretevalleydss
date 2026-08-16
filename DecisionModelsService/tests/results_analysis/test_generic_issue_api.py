import asyncio
from copy import deepcopy

import httpx
import pytest

from api.routers import results_analysis
from api.routers.results_analysis import analyze_generic_issue, analyze_model_issue
from core.application import create_application


def analysis_context():
    return {
        "issue": {
            "id": "issue-1", "name": "Issue", "description": "Description",
            "lifecycle": {"active": False}, "consensus": {"enabled": True, "threshold": 0.8},
            "model": {"id": "model-1"}, "criteriaWeighting": {}, "evaluationStructureKey": "matrix",
        },
        "participants": {"historicalIdentities": [], "current": [{"evaluationCompleted": True}, {"evaluationCompleted": True}]},
        "semanticDirectory": {"alternativesById": {"a": {"name": "Alpha"}}, "owner": {}, "creator": {}, "expertsById": {}, "criteriaById": {}, "expressionDomainsById": {}},
        "decisionSpace": {"expressionDomains": [{"definition": {"private": True}}]},
        "rounds": [{
            "phase": 0, "start": {"participants": []}, "executionAttempts": [{"id": "attempt-1", "status": "succeeded", "applicationStatus": "applied"}],
            "selectedExecution": {"attemptId": "attempt-1", "startedAt": "start", "completedAt": "end", "input": {"modelParameters": {"private": True}, "evaluations": [{"private": True}], "context": {}}, "result": {"standardResult": {"rankedAlternatives": [{"alternativeId": "a", "rank": 1, "score": 10}], "consensusMeasure": 0.9, "collectiveEvaluations": ["private"]}, "modelExecution": {"private": True}}},
        }],
    }

async def post_generic_analysis():
    transport = httpx.ASGITransport(app=create_application())
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.post("/results-analysis/generic-issue", json=analysis_context())


def test_real_application_routes_generic_analysis_before_model_catch_all():
    response = asyncio.run(post_generic_analysis())

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["message"] == "Generic issue analysis completed successfully"
    assert payload["error"] is None
    assert payload["error"] != {"code": "MODEL_NOT_FOUND"}


def test_generic_issue_endpoint_projects_context_and_returns_standard_success():
    response = asyncio.run(analyze_generic_issue(analysis_context()))

    assert response == {
        "success": True,
        "message": "Generic issue analysis completed successfully",
        "data": response["data"],
        "error": None,
    }
    assert response["data"]["facts"]["finalRanking"] == [{"alternativeId": "a", "name": "Alpha", "rank": 1}]
    assert response["data"]["visualizations"] == []
    assert "### Ranking evolution" not in response["data"]["interpretation"]
    assert "### Consensus" in response["data"]["interpretation"]
    assert "### Participation" in response["data"]["interpretation"]
    assert "### Final ranking" not in response["data"]["interpretation"]
    assert "### Execution" not in response["data"]["interpretation"]


def test_issue_analysis_keeps_ranking_evolution_but_not_consensus_visualization():
    context = analysis_context()
    second_round = deepcopy(context["rounds"][0])
    second_round["phase"] = 1
    second_round["selectedExecution"]["result"]["standardResult"]["rankedAlternatives"][0]["rank"] = 1
    context["rounds"].append(second_round)
    result = asyncio.run(analyze_generic_issue(context))["data"]

    assert [entry["type"] for entry in result["visualizations"]] == ["rankingEvolution"]
    assert "### Ranking evolution" in result["interpretation"]
    assert "| Alternative | Initial | Final | Change |" in result["interpretation"]
    assert "| Alpha | 1st | 1st | +0 |" in result["interpretation"]
    assert "### Final ranking" not in result["interpretation"]
    assert "### Execution" not in result["interpretation"]


def test_model_issue_endpoint_uses_dynamic_handler_and_exact_model_context(monkeypatch):
    captured = {}
    monkeypatch.setattr(
        results_analysis,
        "load_model_analysis_handlers",
        lambda key: {"analyze_issue": lambda context: captured.update({"key": key, "context": context}) or {"facts": {}, "interpretation": "Model", "visualizations": []}},
    )

    response = asyncio.run(analyze_model_issue({"apiModelKey": "dynamic_model", "analysisContext": analysis_context()}))

    assert response["success"] is True
    assert response["data"]["interpretation"] == "Model"
    assert captured["key"] == "dynamic_model"
    assert captured["context"]["rounds"][0]["execution"]["result"]["modelExecution"] == {"private": True}


def test_model_issue_endpoint_treats_missing_or_round_only_analysis_as_optional(monkeypatch):
    monkeypatch.setattr(results_analysis, "load_model_analysis_handlers", lambda _: None)
    assert asyncio.run(analyze_model_issue({"apiModelKey": "missing", "analysisContext": analysis_context()}))["data"] is None
    monkeypatch.setattr(results_analysis, "load_model_analysis_handlers", lambda _: {"analyze_round": lambda _: None})
    assert asyncio.run(analyze_model_issue({"apiModelKey": "round_only", "analysisContext": analysis_context()}))["data"] is None


def test_model_issue_endpoint_rejects_invalid_results_and_propagates_handler_failures(monkeypatch):
    monkeypatch.setattr(results_analysis, "load_model_analysis_handlers", lambda _: {"analyze_issue": lambda _: {"facts": []}})
    invalid = asyncio.run(analyze_model_issue({"apiModelKey": "invalid", "analysisContext": analysis_context()}))
    assert invalid.status_code == 422
    monkeypatch.setattr(results_analysis, "load_model_analysis_handlers", lambda _: {"analyze_issue": lambda _: (_ for _ in ()).throw(RuntimeError("handler failed"))})
    with pytest.raises(RuntimeError, match="handler failed"):
        asyncio.run(analyze_model_issue({"apiModelKey": "failure", "analysisContext": analysis_context()}))
