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
            "resultStructure": {"key": "ranking", "version": 1},
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
    assert "### Overall outcome" in response["data"]["interpretation"]
    assert "Only **Alpha** appears" in response["data"]["interpretation"]
    assert "### Consensus" in response["data"]["interpretation"]
    assert "### Participation records" not in response["data"]["interpretation"]
    assert "### Final ranking" not in response["data"]["interpretation"]
    assert "### Ranking evolution" not in response["data"]["interpretation"]
    assert "### Execution" not in response["data"]["interpretation"]


def test_generic_issue_analysis_keeps_a_stored_projection_but_marks_an_empty_one_unavailable():
    context = analysis_context()
    context["rounds"][0]["selectedExecution"]["result"]["standardResult"]["plotsGraphic"] = {}

    unavailable = asyncio.run(analyze_generic_issue(context))["data"]["facts"]
    assert unavailable["expertCollectiveRelationship"] == {
        "projection": None,
        "unavailableReason": "missing_analytical_projection",
    }

    context["rounds"][0]["selectedExecution"]["result"]["standardResult"]["plotsGraphic"] = {
        "expert_points": [[0, 1]],
        "collective_point": [0, 0],
    }
    available = asyncio.run(analyze_generic_issue(context))["data"]["facts"]
    assert available["expertCollectiveRelationship"] == {
        "projection": {"expert_points": [[0, 1]], "collective_point": [0, 0]},
        "unavailableReason": None,
    }


def sorting_analysis_context(assignments=None):
    context = analysis_context()
    context["issue"]["resultStructure"] = {"key": "sorting", "version": 1}
    context["issue"]["consensus"] = {"enabled": False, "threshold": None}
    context["semanticDirectory"]["alternativesById"] = {
        "a": {"name": "Alpha"},
        "b": {"name": "Balanced"},
        "c": {"name": "Budget"},
    }
    context["participants"]["current"] = [
        {"evaluationCompleted": True},
        {"evaluationCompleted": False},
    ]
    categories = [
        {"categoryId": "low", "label": "Shared label", "order": 0},
        {"categoryId": "middle", "label": "Shared label", "order": 1},
        {"categoryId": "high", "label": "High", "order": 2},
        {"categoryId": "empty", "label": "Unused", "order": 3},
    ]
    standard = {
        "categoryOrderSemantics": "lower-order-is-less-preferred",
        "categories": categories,
        "assignments": assignments or [
            {"alternativeId": "a", "categoryId": "high"},
            {"alternativeId": "b", "categoryId": "high"},
            {"alternativeId": "c", "categoryId": "low"},
        ],
        "diagnostics": {"privateModelDiagnostic": True},
    }
    execution = context["rounds"][0]["selectedExecution"]
    execution["resultStructure"] = {"key": "sorting", "version": 1}
    execution["result"]["standardResult"] = standard
    context["rounds"] = context["rounds"][:1]
    context["rounds"][0]["start"]["participants"] = [{"id": "expert-1"}]
    return context


def test_generic_issue_endpoint_analyzes_sorting_assignments_without_ranking_or_model_diagnostics():
    result = asyncio.run(analyze_generic_issue(sorting_analysis_context()))["data"]
    facts = result["facts"]

    assert facts["resultStructure"] == {"key": "sorting", "version": 1}
    assert facts["finalCategories"][0] == {"categoryId": "low", "label": "Shared label", "order": 0}
    assert facts["finalAssignments"] == [
        {"alternativeId": "c", "name": "Budget", "categoryId": "low", "categoryLabel": "Shared label", "categoryOrder": 0},
        {"alternativeId": "a", "name": "Alpha", "categoryId": "high", "categoryLabel": "High", "categoryOrder": 2},
        {"alternativeId": "b", "name": "Balanced", "categoryId": "high", "categoryLabel": "High", "categoryOrder": 2},
    ]
    assert "finalRanking" not in facts
    assert "rankingEvolution" not in facts
    assert "rankingAgreement" not in facts
    assert "### Overall outcome" in result["interpretation"]
    assert "**Alpha** and **Balanced**" in result["interpretation"]
    assert "### Alternative relationships" in result["interpretation"]
    assert "Sharing a category records the same classification, not identical evaluations." in result["interpretation"]
    assert "### Participation records" in result["interpretation"]
    assert "### Consensus" not in result["interpretation"]
    assert "### Decision process" not in result["interpretation"]
    assert [entry["type"] for entry in result["visualizations"]] == ["alternativeRelationships"]
    assert result["visualizations"][0]["mode"] == "categorical"
    assert "diagnostics" not in str(result)


def test_sorting_all_alternatives_in_one_category_does_not_invent_differences():
    context = sorting_analysis_context([
        {"alternativeId": "a", "categoryId": "middle"},
        {"alternativeId": "b", "categoryId": "middle"},
        {"alternativeId": "c", "categoryId": "middle"},
    ])
    result = asyncio.run(analyze_generic_issue(context))["data"]

    assert "All alternatives share the **Shared label** category" in result["interpretation"]
    assert "does not establish that their underlying evaluations were identical" in result["interpretation"]
    assert result["visualizations"][0]["type"] == "alternativeRelationships"
    assert not any("ranking" in visualization["type"].lower() for visualization in result["visualizations"])


def test_sorting_phase_transitions_require_identical_category_configuration_and_alternatives():
    context = sorting_analysis_context()
    second = deepcopy(context["rounds"][0])
    second["phase"] = 1
    second_standard = second["selectedExecution"]["result"]["standardResult"]
    second_standard["assignments"][2]["categoryId"] = "middle"
    context["rounds"].append(second)
    result = asyncio.run(analyze_generic_issue(context))["data"]
    assert "**Budget** moved from one **Shared label** category to another with the same label (more preferred)" in result["interpretation"]
    assert result["facts"]["alternativeRelationships"]["transitions"][0]["changes"][0]["alternativeId"] == "c"
    assert "### Decision process" in result["interpretation"]

    second_standard["categories"][1]["label"] = "Different meaning"
    incomparable = asyncio.run(analyze_generic_issue(context))["data"]
    assert incomparable["facts"]["alternativeRelationships"]["transitions"] == []
    assert incomparable["facts"]["alternativeRelationships"]["unavailableTransitions"][0]["reason"] == "category_configuration_changed"
    assert "### Decision process" not in incomparable["interpretation"]


def test_issue_analysis_keeps_ranking_evolution_visualization_without_narrative_inventory():
    context = analysis_context()
    second_round = deepcopy(context["rounds"][0])
    second_round["phase"] = 1
    second_round["selectedExecution"]["result"]["standardResult"]["rankedAlternatives"][0]["rank"] = 1
    context["rounds"].append(second_round)
    result = asyncio.run(analyze_generic_issue(context))["data"]

    assert [entry["type"] for entry in result["visualizations"]] == ["rankingEvolution"]
    assert "### Decision process" in result["interpretation"]
    assert "remained unchanged" in result["interpretation"]
    assert "| Alternative | Initial | Final | Change |" not in result["interpretation"]
    assert "### Final ranking" not in result["interpretation"]
    assert "1. **Alpha**" not in result["interpretation"]
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


def test_model_issue_endpoint_propagates_an_internal_analysis_module_import_failure(monkeypatch):
    def fail_loading_existing_analysis_module(_):
        raise ModuleNotFoundError("No module named 'model_private_dependency'")

    monkeypatch.setattr(results_analysis, "load_model_analysis_handlers", fail_loading_existing_analysis_module)

    with pytest.raises(ModuleNotFoundError, match="model_private_dependency"):
        asyncio.run(analyze_model_issue({"apiModelKey": "broken", "analysisContext": analysis_context()}))
