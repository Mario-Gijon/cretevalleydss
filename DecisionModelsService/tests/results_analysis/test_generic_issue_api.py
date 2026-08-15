import asyncio
from copy import deepcopy

import httpx

from api.routers.results_analysis import analyze_generic_issue
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
