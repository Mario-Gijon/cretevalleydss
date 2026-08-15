from copy import deepcopy

import pytest

from services.results_analysis.contexts import (
    build_generic_issue_context,
    build_generic_round_context,
    build_model_issue_context,
    build_model_round_context,
)


def analysis_context():
    selected_execution = {
        "attemptId": "attempt-1",
        "correlationId": "correlation-1",
        "startedAt": "2026-01-01T00:00:01.000Z",
        "completedAt": "2026-01-01T00:00:02.000Z",
        "modelContext": {"apiModelKey": "demo_model"},
        "input": {
            "modelParameters": {"weights": {"criterion-1": 1}},
            "evaluations": [{"payload": {"structureSpecific": [[1, 9]]}}],
            "context": {"exact": {"request": True}},
        },
        "result": {
            "standardResult": {
                "rankedAlternatives": [
                    {"alternativeId": "alternative-1", "rank": 1, "score": 0.9},
                    {"alternativeId": "alternative-2", "rank": 2, "classification": "B"},
                ],
                "collectiveEvaluations": [{"opaque": True}],
                "plotsGraphic": {"opaque": True},
                "consensusMeasure": 0.85,
            },
            "modelExecution": {"apiModelKey": "demo_model", "metadata": {"exact": True}},
        },
        "application": {"completedAt": "2026-01-01T00:00:02.000Z", "stageResultId": "stage-1"},
    }
    return {
        "issue": {
            "id": "issue-1",
            "name": "Frozen issue",
            "description": "Frozen description",
            "lifecycle": {"active": False, "currentStage": "finished"},
            "consensus": {"enabled": True, "threshold": 0.8},
            "model": {"id": "model-1", "name": "Model"},
            "criteriaWeighting": {"mode": "creatorManual"},
            "evaluationStructureKey": "alternativeCriteriaMatrix",
        },
        "decisionSpace": {"expressionDomains": [{"id": "domain-1", "definition": {"kind": "fuzzy"}}]},
        "participants": {"historicalIdentities": [{"id": "expert-1"}], "current": [{"expertId": "expert-1"}]},
        "semanticDirectory": {"owner": {"id": "owner-1"}, "creator": {"id": "creator-1"}, "expertsById": {"expert-1": {"name": "Expert"}}, "alternativesById": {"alternative-1": {"name": "Alpha"}}, "criteriaById": {}, "expressionDomainsById": {}},
        "rounds": [
            {"phase": 2, "start": None, "executionAttempts": [{"id": "attempt-2", "status": "failed"}], "selectedExecution": selected_execution},
            {"phase": 1, "start": {"participants": [{"expert": {"id": "expert-1"}}], "evaluations": [{"forbidden": True}]}, "executionAttempts": [{"id": "attempt-1", "status": "succeeded"}], "selectedExecution": deepcopy(selected_execution)},
            {"phase": 3, "start": None, "executionAttempts": [{"id": "attempt-3", "status": "failed"}], "selectedExecution": None},
        ],
    }


def nested_keys(value):
    if isinstance(value, dict):
        return set(value) | set().union(*(nested_keys(item) for item in value.values()))
    if isinstance(value, list):
        return set().union(*(nested_keys(item) for item in value)) if value else set()
    return set()


def test_generic_contexts_exclude_model_semantics_and_are_detached():
    source = analysis_context()
    round_context = build_generic_round_context(source, source["rounds"][1])
    issue_context = build_generic_issue_context(source)

    assert round_context == {
        "phase": 1,
        "participants": [{"expert": {"id": "expert-1"}}],
        "attempts": [{"id": "attempt-1", "status": "succeeded"}],
        "execution": {
            "attemptId": "attempt-1",
            "startedAt": "2026-01-01T00:00:01.000Z",
            "completedAt": "2026-01-01T00:00:02.000Z",
            "ranking": [{"alternativeId": "alternative-1", "rank": 1}, {"alternativeId": "alternative-2", "rank": 2}],
            "consensusMeasure": 0.85,
        },
    }
    assert issue_context["issue"] == {"id": "issue-1", "name": "Frozen issue", "description": "Frozen description", "lifecycle": {"active": False, "currentStage": "finished"}, "consensus": {"enabled": True, "threshold": 0.8}}
    assert issue_context["semanticDirectory"] == source["semanticDirectory"]
    assert [entry["phase"] for entry in issue_context["rounds"]] == [1, 2]
    assert {"modelParameters", "evaluations", "collectiveEvaluations", "plotsGraphic", "modelExecution", "decisionSpace", "criteriaWeighting", "evaluationStructureKey", "rawOutput"}.isdisjoint(nested_keys(issue_context))

    issue_context["rounds"][0]["execution"]["ranking"][0]["rank"] = 99
    assert source["rounds"][1]["selectedExecution"]["result"]["standardResult"]["rankedAlternatives"][0]["rank"] == 1


def test_model_contexts_preserve_exact_executed_evidence_and_are_detached():
    source = analysis_context()
    round_context = build_model_round_context(source, source["rounds"][1])
    issue_context = build_model_issue_context(source)

    assert round_context["execution"] == source["rounds"][1]["selectedExecution"]
    assert round_context["issue"]["model"] == {"id": "model-1", "name": "Model"}
    assert round_context["issue"]["criteriaWeighting"] == {"mode": "creatorManual"}
    assert round_context["decisionSpace"] == source["decisionSpace"]
    assert round_context["semanticDirectory"] == source["semanticDirectory"]
    assert [entry["phase"] for entry in issue_context["rounds"]] == [1, 2]
    assert issue_context["rounds"][0]["execution"] == source["rounds"][1]["selectedExecution"]

    round_context["execution"]["input"]["evaluations"][0]["payload"]["structureSpecific"][0][0] = 0
    assert source["rounds"][1]["selectedExecution"]["input"]["evaluations"][0]["payload"]["structureSpecific"][0][0] == 1


@pytest.mark.parametrize("builder", [build_generic_round_context, build_model_round_context])
def test_round_contexts_require_selected_execution(builder):
    source = analysis_context()
    with pytest.raises(ValueError, match="selectedExecution"):
        builder(source, source["rounds"][2])
