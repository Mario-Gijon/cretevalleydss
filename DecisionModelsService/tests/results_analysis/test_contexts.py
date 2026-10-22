from copy import deepcopy

import pytest

from models.topsis_sort_2016.executor import build_plots_graphic_from_execution_input
from models.topsis_sort_2016.examples import TOPSIS_SORT_2016_REQUEST_EXAMPLES
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
            "resultStructure": {"key": "ranking", "version": 1},
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
            "resultStructure": {"key": "ranking", "version": 1},
            "ranking": [{"alternativeId": "alternative-1", "rank": 1, "score": 0.9}, {"alternativeId": "alternative-2", "rank": 2}],
            "consensusMeasure": 0.85,
            "expertCollectiveProjection": {"opaque": True},
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


def sorting_context():
    source = analysis_context()
    source["issue"]["resultStructure"] = {"key": "sorting", "version": 1}
    source["semanticDirectory"]["alternativesById"] = {
        "alternative-1": {"name": "Alpha"},
        "alternative-2": {"name": "Beta"},
    }
    for round_entry in source["rounds"][:2]:
        standard = round_entry["selectedExecution"]["result"]["standardResult"]
        standard.clear()
        standard.update({
            "categoryOrderSemantics": "lower-order-is-less-preferred",
            "categories": [
                {"categoryId": "low-id", "label": "Same label", "order": 0},
                {"categoryId": "middle-id", "label": "Same label", "order": 1},
                {"categoryId": "empty-id", "label": "Unused", "order": 2},
            ],
            "assignments": [
                {"alternativeId": "alternative-1", "categoryId": "middle-id"},
                {"alternativeId": "alternative-2", "categoryId": "low-id"},
            ],
            "diagnostics": {"mustNotReachGenericAnalysis": True},
        })
        round_entry["selectedExecution"]["resultStructure"] = {"key": "sorting", "version": 1}
    return source


def test_sorting_generic_context_projects_only_validated_categorical_evidence():
    source = sorting_context()
    round_context = build_generic_round_context(source, source["rounds"][1])
    issue_context = build_generic_issue_context(source)

    assert issue_context["resultStructure"] == {"key": "sorting", "version": 1}
    assert round_context["execution"] == {
        "attemptId": "attempt-1",
        "startedAt": "2026-01-01T00:00:01.000Z",
        "completedAt": "2026-01-01T00:00:02.000Z",
        "resultStructure": {"key": "sorting", "version": 1},
        "categories": [
            {"categoryId": "low-id", "label": "Same label", "order": 0},
            {"categoryId": "middle-id", "label": "Same label", "order": 1},
            {"categoryId": "empty-id", "label": "Unused", "order": 2},
        ],
        "categoryOrderSemantics": "lower-order-is-less-preferred",
        "assignments": [
            {"alternativeId": "alternative-2", "name": "Beta", "categoryId": "low-id", "categoryLabel": "Same label", "categoryOrder": 0},
                {"alternativeId": "alternative-1", "name": "Alpha", "categoryId": "middle-id", "categoryLabel": "Same label", "categoryOrder": 1},
        ],
            "consensusMeasure": None,
            "expertCollectiveProjection": None,
    }
    assert "diagnostics" not in nested_keys(issue_context)
    assert "rank" not in nested_keys(issue_context)
    assert "score" not in nested_keys(issue_context)


def test_historical_topsis_sort_projection_rebuild_uses_frozen_input_without_reexecution():
    source = sorting_context()
    execution = source["rounds"][1]["selectedExecution"]
    execution["modelContext"] = {"apiModelKey": "topsis_sort_2016"}
    frozen_input = deepcopy(
        TOPSIS_SORT_2016_REQUEST_EXAMPLES["numeric_benefit_cost_sorting"]["value"]
    )
    execution["input"] = frozen_input
    expected_projection = build_plots_graphic_from_execution_input(frozen_input)

    projected_round = build_generic_round_context(source, source["rounds"][1])
    issue_context = build_generic_issue_context(source)

    assert projected_round["execution"]["expertCollectiveProjection"] == expected_projection
    assert issue_context["rounds"][0]["execution"]["expertCollectiveProjection"] == expected_projection
    assert issue_context["rounds"][-1]["execution"]["assignments"] == projected_round["execution"]["assignments"]
    assert {"evaluations", "modelParameters"}.isdisjoint(nested_keys(issue_context))


def test_prechange_stored_topsis_projection_is_refreshed_from_frozen_input_only():
    source = sorting_context()
    execution = source["rounds"][1]["selectedExecution"]
    execution["modelContext"] = {"apiModelKey": "topsis_sort_2016"}
    frozen_input = deepcopy(
        TOPSIS_SORT_2016_REQUEST_EXAMPLES["numeric_benefit_cost_sorting"]["value"]
    )
    second_expert = deepcopy(frozen_input["evaluations"][0])
    second_expert["expert"] = {"id": "expert-2", "name": "Second expert"}
    frozen_input["evaluations"].append(second_expert)
    execution["input"] = frozen_input
    execution["result"]["standardResult"]["plotsGraphic"] = {
        "expert_points": [[0.0, 0.0]],
        "collective_point": [0.0, 0.0],
        "expert_ids": ["expert-1"],
    }

    projection = build_generic_round_context(source, source["rounds"][1])["execution"][
        "expertCollectiveProjection"
    ]

    assert projection["expert_ids"] == ["expert-1", "expert-2"]
    assert projection["identical_evaluation_groups"] == [["expert-1", "expert-2"]]
    assert projection["collective_identical_expert_ids"] == ["expert-1", "expert-2"]
    assert len(projection["expert_points"]) == 2


def test_historical_projection_reports_invalid_frozen_evidence_without_coordinates():
    source = sorting_context()
    execution = source["rounds"][1]["selectedExecution"]
    execution["modelContext"] = {"apiModelKey": "topsis_sort_2016"}
    execution["input"] = deepcopy(
        TOPSIS_SORT_2016_REQUEST_EXAMPLES["numeric_benefit_cost_sorting"]["value"]
    )
    execution["input"]["evaluations"][0]["payload"]["alt-a"].pop("quality")

    projection = build_generic_round_context(source, source["rounds"][1])["execution"][
        "expertCollectiveProjection"
    ]

    assert projection == {"reason": "invalid_frozen_numeric_evidence"}


@pytest.mark.parametrize(
    ("mutation", "message"),
    [
        (lambda result: result["assignments"].append({"alternativeId": "alternative-1", "categoryId": "low-id"}), "exactly one assignment"),
        (lambda result: result["assignments"].pop(), "cover every configured alternative"),
        (lambda result: result["assignments"].__setitem__(0, {"alternativeId": "alternative-1", "categoryId": "missing"}), "unknown category"),
        (lambda result: result["assignments"].__setitem__(0, {"alternativeId": "unknown", "categoryId": "low-id"}), "unknown alternative"),
        (lambda result: result["categories"][1].__setitem__("order", 0), "unique IDs and orders"),
    ],
)
def test_sorting_generic_context_rejects_invalid_category_relationships(mutation, message):
    source = sorting_context()
    standard = source["rounds"][1]["selectedExecution"]["result"]["standardResult"]
    mutation(standard)
    with pytest.raises(ValueError, match=message):
        build_generic_round_context(source, source["rounds"][1])


def test_generic_issue_context_rejects_result_structure_changes_between_phases():
    source = sorting_context()
    source["rounds"][1]["selectedExecution"]["resultStructure"] = {"key": "ranking", "version": 1}

    with pytest.raises(ValueError, match="cannot mix result structures across phases"):
        build_generic_issue_context(source)
