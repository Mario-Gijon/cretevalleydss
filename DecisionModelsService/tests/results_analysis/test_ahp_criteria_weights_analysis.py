from __future__ import annotations

from copy import deepcopy

import pytest

from models.ahp_criteria_weights.analysis import analyze_issue
from models.ahp_criteria_weights.executor import execute_ahp_criteria_weights
from schemas.model_requests import GenericModelExecutionRequest
from services.results_analysis.model_analysis import load_model_analysis_handlers


CRITERIA = [
    {"id": "c1", "name": "Life expectancy"},
    {"id": "c2", "name": "Poverty risk"},
    {"id": "c3", "name": "NEET"},
]


def _evaluation(expert_id: str, name: str, comparisons: list[tuple[str, str, float]]) -> dict:
    return {
        "expert": {"id": expert_id, "email": f"{expert_id}@example.test", "name": name},
        "payload": {
            "comparisons": [
                {"criterionId": first, "comparedCriterionId": second, "value": value}
                for first, second, value in comparisons
            ]
        },
    }


def _consistent_evaluation(expert_id: str = "expert-1", name: str = "Expert 1") -> dict:
    return _evaluation(expert_id, name, [("c1", "c2", 2), ("c1", "c3", 6), ("c2", "c3", 3)])


def _other_consistent_evaluation(expert_id: str = "expert-2", name: str = "Expert 2") -> dict:
    return _evaluation(expert_id, name, [("c1", "c2", 1 / 3), ("c1", "c3", 1), ("c2", "c3", 3)])


def _inconsistent_evaluation() -> dict:
    return _evaluation("expert-1", "Expert 1", [("c1", "c2", 9), ("c1", "c3", 1), ("c2", "c3", 9)])


def _run(evaluations: list[dict]) -> dict:
    request = {
        "modelParameters": {},
        "evaluations": evaluations,
        "context": {"criteria": deepcopy(CRITERIA), "structure": {"key": "criteriaPairwiseAHP", "stage": "criteriaWeighting"}},
    }
    response = execute_ahp_criteria_weights(GenericModelExecutionRequest.model_validate(request))
    if hasattr(response, "body"):
        import json

        response = json.loads(response.body.decode("utf-8"))
    assert response["success"] is True
    data = response["data"]
    execution = {
        "attemptId": "ahp-stage-attempt",
        "modelContext": {"apiModelKey": "ahp_criteria_weights"},
        "input": request,
        "result": {
            "rawOutput": deepcopy(data["rawOutput"]),
            "standardResult": {
                "weightsByCriterion": deepcopy(data["weightsByCriterion"]),
                "collectiveEvaluations": deepcopy(data["collectiveEvaluations"]),
            },
        },
    }
    return analyze_issue(
        {
            "issue": {"id": "issue-ahp", "name": "AHP fixture"},
            "semanticDirectory": {"expertsById": {}},
            "rounds": [{"phase": 0, "execution": execution}],
        }
    )


def test_single_expert_analysis_uses_frozen_weights_and_reports_persisted_consistency():
    result = _run([_consistent_evaluation()])
    facts = result["facts"]

    assert facts["status"] == "available"
    assert facts["source"]["aggregationMethod"] == "singleExpert"
    assert facts["criteria"]["collectiveLeaders"] == ["c1"]
    assert facts["criteria"]["leastImportant"] == ["c3"]
    assert facts["mcc"]["available"] is False
    assert [item["key"] for item in result["visualizations"]] == ["ahp-criterion-importance"]
    assert result["visualizations"][0]["data"]["categories"] == ["Life expectancy", "Poverty risk", "NEET"]
    assert result["visualizations"][0]["data"]["series"][0]["values"] == pytest.approx([60, 30, 10])
    assert facts["consistency"]["experts"][0]["consistencyStatus"] == "consistent"
    assert "Life expectancy" in result["interpretation"]
    assert "CR was **0.000**" in result["interpretation"]
    assert result["sections"][0]["visualizations"] == result["visualizations"]


def test_multi_expert_analysis_uses_mcc_and_shows_three_applicable_visuals():
    result = _run([_consistent_evaluation(), _other_consistent_evaluation()])
    facts = result["facts"]
    keys = [item["key"] for item in result["visualizations"]]

    assert facts["status"] == "available"
    assert facts["source"]["nExperts"] == 2
    assert facts["mcc"]["available"] is True
    assert keys == ["ahp-criterion-importance", "ahp-individual-collective-weights", "ahp-mcc-adjustment-map"]
    comparison = result["visualizations"][1]
    assert comparison["type"] == "scatter"
    assert comparison["presentation"] == {
        "stableSeriesColors": True,
        "pointStyleLegend": True,
        "tooltip": {"variant": "point-details"},
    }
    assert comparison["xAxis"] == {"label": "Importance (%)", "min": 0, "max": 100, "tickSuffix": "%"}
    assert [item["key"] for item in comparison["data"]["series"]] == ["expert-1@example.test", "expert-2@example.test", "mcc-collective"]
    assert comparison["data"]["series"][-1]["pointStyle"] == "rectRot"
    assert [item["y"] for item in comparison["data"]["series"][0]["points"]] == [1, 2, 3]
    assert [item["label"] for item in comparison["yAxis"]["categories"]] == [
        criterion["name"] for criterion in facts["criteria"]["items"]
    ]
    assert [point["x"] for point in comparison["data"]["series"][-1]["points"]] == pytest.approx(
        [facts["finalWeightsByCriterion"][criterion["criterionId"]] * 100 for criterion in facts["criteria"]["items"]]
    )
    assert comparison["data"]["series"][0]["points"][0]["details"]["Expert"] == "Expert 1"
    assert comparison["data"]["series"][0]["points"][0]["details"]["Source"] == "Individual AHP"
    assert comparison["data"]["series"][-1]["points"][0]["details"]["Source"] == "MCC collective result"
    assert comparison["data"]["series"][0]["points"][0]["x"] == pytest.approx(
        facts["experts"]["items"][0]["weightsByCriterion"]["c1"] * 100
    )
    adjustment = result["visualizations"][2]
    assert adjustment["scale"] == {
        "kind": "diverging",
        "center": 0,
        "valuePrecision": 4,
        "valueSuffix": " pp",
        "label": "Change (percentage points)",
        "legend": {"negative": "Decrease", "center": "0", "positive": "Increase"},
    }
    assert adjustment["presentation"] == {"heatmapStyle": "adjustment"}
    assert "insight" not in adjustment
    assert "Positive values indicate" in adjustment["description"]
    assert adjustment["data"]["values"][0][0] == pytest.approx(round(facts["mcc"]["cells"][0]["delta"] * 100, 4))
    assert adjustment["data"]["details"][0][0] == {
        "Original weight": f"{facts['mcc']['cells'][0]['originalWeight'] * 100}%",
        "Adjusted weight": f"{facts['mcc']['cells'][0]['adjustedWeight'] * 100}%",
        "Collective weight": f"{facts['mcc']['cells'][0]['collectiveWeight'] * 100}%",
        "Change": f"{facts['mcc']['cells'][0]['delta'] * 100} pp",
    }
    assert adjustment["data"]["columns"][0]["label"] == "Life expectancy"
    assert len(result["sections"]) == 3
    assert all("final importance" not in visualization.get("insight", "") for visualization in result["visualizations"])
    assert "percentage points" in result["interpretation"]
    assert "does not measure agreement" in result["interpretation"]


def test_mcc_with_no_material_adjustments_has_no_adjustment_heatmap():
    result = _run([_consistent_evaluation(), _consistent_evaluation("expert-2", "Expert 2")])

    assert result["facts"]["mcc"]["available"] is True
    assert result["facts"]["mcc"]["materialAdjustments"] is False
    assert [item["key"] for item in result["visualizations"]] == [
        "ahp-criterion-importance",
        "ahp-individual-collective-weights",
    ]
    assert "no material numerical adjustments" in result["interpretation"]
    comparison = result["visualizations"][1]
    first, second, collective = comparison["data"]["series"]
    assert first["points"][0]["x"] == pytest.approx(second["points"][0]["x"])
    assert first["points"][0]["x"] == pytest.approx(collective["points"][0]["x"])
    assert first["points"][0]["details"]["Coincident with"] == "Expert 2, Collective"
    assert collective["points"][0]["details"]["Coincident with"] == "Expert 1, Expert 2"


def test_individual_collective_dotplot_uses_stable_expert_order_and_keeps_unrounded_weights():
    result = _run([_other_consistent_evaluation(), _consistent_evaluation()])
    descriptor = result["visualizations"][1]

    assert [series["key"] for series in descriptor["data"]["series"]] == [
        "expert-1@example.test", "expert-2@example.test", "mcc-collective"
    ]
    for criterion_index, criterion in enumerate(result["facts"]["criteria"]["items"], start=1):
        assert all(point["y"] == criterion_index for series in descriptor["data"]["series"] for point in series["points"] if point["label"] == criterion["name"])
        expert_one_point = descriptor["data"]["series"][0]["points"][criterion_index - 1]
        raw_weight = result["facts"]["experts"]["items"][1]["weightsByCriterion"][criterion["criterionId"]]
        assert expert_one_point["x"] == raw_weight * 100
    assert descriptor["yAxis"]["reverse"] is True
    assert descriptor["xAxis"]["min"] == 0
    assert descriptor["xAxis"]["max"] == 100


def test_invalid_diagnostic_does_not_hide_valid_weight_visualizations():
    result = _run([_consistent_evaluation()])
    raw = result["facts"]
    assert raw["status"] == "available"

    # Analyze a second run after corrupting only the persisted diagnostic evidence.
    request = {
        "modelParameters": {},
        "evaluations": [_consistent_evaluation()],
        "context": {"criteria": deepcopy(CRITERIA), "structure": {"key": "criteriaPairwiseAHP", "stage": "criteriaWeighting"}},
    }
    response = execute_ahp_criteria_weights(GenericModelExecutionRequest.model_validate(request))
    data = response["data"]
    data["rawOutput"]["expertDiagnosticsByExpert"] = deepcopy(data["rawOutput"]["expertDiagnosticsByExpert"])
    data["rawOutput"]["expertDiagnosticsByExpert"]["expert-1@example.test"]["weightsByCriterion"]["c1"] = 0.1
    result = analyze_issue({
        "semanticDirectory": {"expertsById": {}},
        "rounds": [{"phase": 0, "execution": {
            "attemptId": "attempt", "modelContext": {"apiModelKey": "ahp_criteria_weights"}, "input": request,
            "result": {"rawOutput": data["rawOutput"], "standardResult": {"weightsByCriterion": data["weightsByCriterion"], "collectiveEvaluations": data["collectiveEvaluations"]}},
        }}],
    })

    assert [item["key"] for item in result["visualizations"]] == ["ahp-criterion-importance"]
    assert result["facts"]["consistency"]["experts"][0]["available"] is False
    assert "valid stored consistency diagnostic is unavailable" in result["interpretation"]


def test_inconsistent_cr_is_reported_from_saved_diagnostics_without_recalculation():
    result = _run([_inconsistent_evaluation()])
    consistency = result["facts"]["consistency"]["experts"][0]

    assert consistency["available"] is True
    assert consistency["consistencyStatus"] == "review"
    assert consistency["consistencyRatio"] > 0.10
    assert "above the **0.10** review threshold" in result["interpretation"]
    assert "may benefit from review" in result["interpretation"]


def test_small_matrix_reports_consistency_not_applicable_without_calling_it_inconsistent():
    request = {
        "modelParameters": {},
        "evaluations": [{"expert": {"id": "expert-1", "name": "Expert 1"}, "payload": {"comparisons": [{"criterionId": "a", "comparedCriterionId": "b", "value": 3}]}}],
        "context": {"criteria": [{"id": "a", "name": "A"}, {"id": "b", "name": "B"}], "structure": {"key": "criteriaPairwiseAHP", "stage": "criteriaWeighting"}},
    }
    response = execute_ahp_criteria_weights(GenericModelExecutionRequest.model_validate(request))
    data = response["data"]
    result = analyze_issue({"rounds": [{"phase": 0, "execution": {"attemptId": "attempt", "modelContext": {"apiModelKey": "ahp_criteria_weights"}, "input": request, "result": {"rawOutput": data["rawOutput"], "standardResult": {"weightsByCriterion": data["weightsByCriterion"], "collectiveEvaluations": data["collectiveEvaluations"]}}}}]})

    assert result["facts"]["consistency"]["experts"][0]["consistencyStatus"] == "not_applicable"
    assert "CR is not applicable" in result["interpretation"]
    assert "inconsistent" not in result["interpretation"].lower()


@pytest.mark.parametrize(
    "mutation",
    [
        lambda execution: execution["result"]["standardResult"]["weightsByCriterion"].pop("c3"),
        lambda execution: execution["result"]["rawOutput"].pop("nExperts"),
        lambda execution: execution["input"]["evaluations"].append(deepcopy(execution["input"]["evaluations"][0])),
    ],
)
def test_unverifiable_frozen_result_does_not_fabricate_visualizations(mutation):
    request = {
        "modelParameters": {}, "evaluations": [_consistent_evaluation()],
        "context": {"criteria": deepcopy(CRITERIA), "structure": {"key": "criteriaPairwiseAHP", "stage": "criteriaWeighting"}},
    }
    response = execute_ahp_criteria_weights(GenericModelExecutionRequest.model_validate(request))
    data = response["data"]
    execution = {"attemptId": "attempt", "modelContext": {"apiModelKey": "ahp_criteria_weights"}, "input": deepcopy(request), "result": {"rawOutput": deepcopy(data["rawOutput"]), "standardResult": {"weightsByCriterion": deepcopy(data["weightsByCriterion"]), "collectiveEvaluations": deepcopy(data["collectiveEvaluations"])}}}
    mutation(execution)
    result = analyze_issue({"rounds": [{"phase": 0, "execution": execution}]})

    assert result["visualizations"] == []
    assert result["facts"]["finalWeightsByCriterion"] is None


def test_model_analysis_discovery_loads_the_new_standard_handler():
    assert callable(load_model_analysis_handlers("ahp_criteria_weights")["analyze_issue"])
