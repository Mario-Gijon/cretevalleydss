import asyncio

from api.routers.results_analysis import analyze_generic_issue


def test_generic_issue_endpoint_projects_context_and_returns_standard_success():
    analysis_context = {
        "issue": {
            "id": "issue-1", "name": "Issue", "description": "Description",
            "lifecycle": {"active": False}, "consensus": {"enabled": True, "threshold": 0.8},
            "model": {"id": "model-1"}, "criteriaWeighting": {}, "evaluationStructureKey": "matrix",
        },
        "participants": {"historicalIdentities": [], "current": []},
        "semanticDirectory": {"alternativesById": {"a": {"name": "Alpha"}}, "owner": {}, "creator": {}, "expertsById": {}, "criteriaById": {}, "expressionDomainsById": {}},
        "decisionSpace": {"expressionDomains": [{"definition": {"private": True}}]},
        "rounds": [{
            "phase": 0, "start": {"participants": []}, "executionAttempts": [{"id": "attempt-1", "status": "succeeded", "applicationStatus": "applied"}],
            "selectedExecution": {"attemptId": "attempt-1", "startedAt": "start", "completedAt": "end", "input": {"modelParameters": {"private": True}, "evaluations": [{"private": True}], "context": {}}, "result": {"standardResult": {"rankedAlternatives": [{"alternativeId": "a", "rank": 1, "score": 10}], "consensusMeasure": 0.9, "collectiveEvaluations": ["private"]}, "modelExecution": {"private": True}}},
        }],
    }

    response = asyncio.run(analyze_generic_issue(analysis_context))

    assert response == {
        "success": True,
        "message": "Generic issue analysis completed successfully",
        "data": response["data"],
        "error": None,
    }
    assert response["data"]["facts"]["finalRanking"] == [{"alternativeId": "a", "name": "Alpha", "rank": 1}]
    assert response["data"]["visualizations"] == [{"type": "consensusEvolution", "title": "Consensus evolution", "data": {"points": [{"phase": 0, "value": 0.9}], "threshold": 0.8}}]
