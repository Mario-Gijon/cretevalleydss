from copy import deepcopy
import json

from fastapi.responses import JSONResponse
import pytest

from models.ahp_criteria_weights import executor
from models.ahp_criteria_weights.definition import MODEL_DEFINITION
from models.ahp_criteria_weights.run import run_ahp_criteria_weights
from registry.model_registry import get_model_definition_by_endpoint_path
from schemas.model_requests import GenericModelExecutionRequest


def _evaluation(expert_id: str, comparisons: list[dict]) -> dict:
    return {
        "expert": {"id": expert_id, "name": expert_id.title()},
        "payload": {"comparisons": comparisons},
    }


def _request(*, criteria: list[dict], evaluations: list[dict]) -> dict:
    return {
        "modelParameters": {},
        "evaluations": evaluations,
        "context": {
            "criteria": criteria,
            "structure": {
                "key": "criteriaPairwiseAHP",
                "stage": "criteriaWeighting",
            },
        },
    }


def _example_three_criteria(expert_id: str = "expert-1") -> dict:
    return _evaluation(
        expert_id,
        [
            {"criterionId": "a", "comparedCriterionId": "b", "value": 2},
            {"criterionId": "a", "comparedCriterionId": "c", "value": 6},
            {"criterionId": "b", "comparedCriterionId": "c", "value": 3},
        ],
    )


def _result_body(result: dict | JSONResponse) -> dict:
    if isinstance(result, JSONResponse):
        return json.loads(result.body.decode("utf-8"))
    return result


def test_definition_registers_ahp_as_creator_and_expert_criteria_weighting() -> None:
    assert MODEL_DEFINITION.api_model_key == "ahp_criteria_weights"
    assert MODEL_DEFINITION.model_kind == "criteriaWeighting"
    assert MODEL_DEFINITION.evaluation_structure_key == "criteriaPairwiseAHP"
    assert MODEL_DEFINITION.supports_creator_criteria_weighting is True
    assert MODEL_DEFINITION.supports_expert_criteria_weighting is True
    assert MODEL_DEFINITION.issue_execution_authorized is False
    assert get_model_definition_by_endpoint_path("/ahp_criteria_weights") == MODEL_DEFINITION


def test_principal_eigenvector_for_perfectly_consistent_matrix() -> None:
    result = run_ahp_criteria_weights(
        context={"criteria": [{"id": "a", "name": "A"}, {"id": "b", "name": "B"}, {"id": "c", "name": "C"}]},
        evaluations=[_example_three_criteria()],
    )
    diagnostic = result["expertDiagnosticsByExpert"]["expert-1"]
    assert diagnostic["weightsByCriterion"] == pytest.approx(
        {"a": 0.6, "b": 0.3, "c": 0.1}
    )
    assert diagnostic["lambdaMax"] == pytest.approx(3.0)
    assert diagnostic["consistencyIndex"] == pytest.approx(0.0, abs=1e-12)
    assert diagnostic["consistencyRatio"] == pytest.approx(0.0, abs=1e-12)
    assert diagnostic["consistencyStatus"] == "consistent"
    assert sum(diagnostic["weightsByCriterion"].values()) == pytest.approx(1.0)


def test_two_criteria_uses_reciprocal_pair_and_consistency_is_not_applicable() -> None:
    result = run_ahp_criteria_weights(
        context={"criteria": [{"id": "a", "name": "A"}, {"id": "b", "name": "B"}]},
        evaluations=[_evaluation("expert-1", [{"criterionId": "a", "comparedCriterionId": "b", "value": 3}])],
    )
    diagnostic = result["expertDiagnosticsByExpert"]["expert-1"]
    assert diagnostic["weightsByCriterion"] == pytest.approx({"a": 0.75, "b": 0.25})
    assert diagnostic["lambdaMax"] == pytest.approx(2.0)
    assert diagnostic["consistencyIndex"] is None
    assert diagnostic["randomIndex"] is None
    assert diagnostic["consistencyRatio"] is None
    assert diagnostic["consistencyStatus"] == "not_applicable"


def test_one_criterion_needs_no_comparisons_and_has_unit_weight() -> None:
    result = run_ahp_criteria_weights(
        context={"criteria": [{"id": "only", "name": "Only criterion"}]},
        evaluations=[_evaluation("expert-1", [])],
    )
    diagnostic = result["expertDiagnosticsByExpert"]["expert-1"]
    assert diagnostic["weightsByCriterion"] == {"only": 1.0}
    assert diagnostic["completedComparisons"] == diagnostic["requiredComparisons"] == 0
    assert diagnostic["consistencyStatus"] == "not_applicable"


def test_equal_importance_gives_equal_weights() -> None:
    criteria = [{"id": name, "name": name.upper()} for name in "abcd"]
    comparisons = [
        {"criterionId": criteria[i]["id"], "comparedCriterionId": criteria[j]["id"], "value": 1}
        for i in range(4)
        for j in range(i + 1, 4)
    ]
    result = run_ahp_criteria_weights(
        context={"criteria": criteria},
        evaluations=[_evaluation("expert-1", comparisons)],
    )
    assert list(result["expertWeightsByExpert"]["expert-1"].values()) == pytest.approx(
        [0.25] * 4
    )


def test_ishizaka_figure_four_reconstruction_matches_published_table_four() -> None:
    names = ["Experience", "Flexibility", "Security", "Resilience", "Environment"]
    criteria = [{"id": f"c{index}", "name": name} for index, name in enumerate(names)]
    upper_values = [7, 4, 7, 8, 1 / 4, 1, 3, 4, 5, 3]
    comparisons = []
    cursor = 0
    for row in range(len(criteria)):
        for column in range(row + 1, len(criteria)):
            comparisons.append(
                {
                    "criterionId": criteria[row]["id"],
                    "comparedCriterionId": criteria[column]["id"],
                    "value": upper_values[cursor],
                }
            )
            cursor += 1
    result = run_ahp_criteria_weights(
        context={"criteria": criteria},
        evaluations=[_evaluation("supplier-expert", comparisons)],
    )
    diagnostic = result["expertDiagnosticsByExpert"]["supplier-expert"]
    expected = [0.565, 0.081, 0.234, 0.081, 0.040]
    actual = list(diagnostic["weightsByCriterion"].values())
    assert actual == pytest.approx(expected, abs=0.0005)
    assert diagnostic["consistencyRatio"] == pytest.approx(0.0511905, abs=1e-6)
    assert round(diagnostic["consistencyRatio"], 2) == 0.05


def test_inconsistent_matrix_returns_review_diagnostic() -> None:
    result = run_ahp_criteria_weights(
        context={"criteria": [{"id": "a", "name": "A"}, {"id": "b", "name": "B"}, {"id": "c", "name": "C"}]},
        evaluations=[
            _evaluation(
                "expert-1",
                [
                    {"criterionId": "a", "comparedCriterionId": "b", "value": 9},
                    {"criterionId": "a", "comparedCriterionId": "c", "value": 1},
                    {"criterionId": "b", "comparedCriterionId": "c", "value": 9},
                ],
            )
        ],
    )
    diagnostic = result["expertDiagnosticsByExpert"]["expert-1"]
    assert diagnostic["consistencyIndex"] > 0
    assert diagnostic["consistencyRatio"] > 0.10
    assert diagnostic["consistencyStatus"] == "review"


@pytest.mark.parametrize(
    "comparisons",
    [
        [],
        [
            {"criterionId": "a", "comparedCriterionId": "b", "value": 2},
            {"criterionId": "b", "comparedCriterionId": "a", "value": 0.5},
            {"criterionId": "a", "comparedCriterionId": "c", "value": 3},
        ],
        [
            {"criterionId": "a", "comparedCriterionId": "a", "value": 1},
            {"criterionId": "a", "comparedCriterionId": "c", "value": 3},
            {"criterionId": "b", "comparedCriterionId": "c", "value": 2},
        ],
        [
            {"criterionId": "a", "comparedCriterionId": "b", "value": 1.5},
            {"criterionId": "a", "comparedCriterionId": "c", "value": 3},
            {"criterionId": "b", "comparedCriterionId": "c", "value": 2},
        ],
    ],
)
def test_incomplete_duplicate_self_and_out_of_scale_data_are_rejected(comparisons) -> None:
    criteria = [{"id": "a", "name": "A"}, {"id": "b", "name": "B"}, {"id": "c", "name": "C"}]
    with pytest.raises(ValueError):
        run_ahp_criteria_weights(
            context={"criteria": criteria},
            evaluations=[_evaluation("expert-1", comparisons)],
        )


def test_model_executor_uses_mcc_on_individual_vectors_and_preserves_diagnostics(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    request = _request(
        criteria=[{"id": "a", "name": "A"}, {"id": "b", "name": "B"}, {"id": "c", "name": "C"}],
        evaluations=[_example_three_criteria("expert-1"), _example_three_criteria("expert-2")],
    )
    captured: dict = {}

    def fake_mcc(*, criteria: list, expert_weights_by_expert: dict) -> dict:
        captured["criteria"] = criteria
        captured["expert_weights_by_expert"] = deepcopy(expert_weights_by_expert)
        return {"weightsByCriterion": {"a": 0.6, "b": 0.3, "c": 0.1}}

    monkeypatch.setattr(executor, "solve_mcc_weights", fake_mcc)
    result = _result_body(
        executor.execute_ahp_criteria_weights(
            GenericModelExecutionRequest.model_validate(request)
        )
    )
    assert result["success"] is True
    assert captured["expert_weights_by_expert"]["expert-1"] == pytest.approx(
        {"a": 0.6, "b": 0.3, "c": 0.1}
    )
    assert result["data"]["collectiveEvaluations"]["expertDiagnosticsByExpert"].keys() == {
        "expert-1",
        "expert-2",
    }
    assert result["data"]["rawOutput"]["aggregation"]["method"] == "mcc"
    assert result["data"]["weightsByCriterion"] == pytest.approx(
        {"a": 0.6, "b": 0.3, "c": 0.1}
    )


def test_executor_rejects_another_structure_key() -> None:
    request = _request(
        criteria=[{"id": "a", "name": "A"}],
        evaluations=[_evaluation("expert-1", [])],
    )
    request["context"]["structure"]["key"] = "manualCriteriaWeights"
    result = _result_body(
        executor.execute_ahp_criteria_weights(
            GenericModelExecutionRequest.model_validate(request)
        )
    )
    assert result["success"] is False
    assert "criteriaPairwiseAHP" in result["message"]
