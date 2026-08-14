from copy import deepcopy
import json

from fastapi.responses import JSONResponse
import pytest

from models.preference_order_criteria_weights import executor
from models.preference_order_criteria_weights.definition import MODEL_DEFINITION
from models.preference_order_criteria_weights.examples import (
    PREFERENCE_ORDER_CRITERIA_WEIGHTS_REQUEST_EXAMPLES,
)
from models.preference_order_criteria_weights.run import (
    run_preference_order_criteria_weights,
)
from schemas.model_requests import GenericModelExecutionRequest


def _request_payload() -> dict:
    return deepcopy(
        PREFERENCE_ORDER_CRITERIA_WEIGHTS_REQUEST_EXAMPLES[
            "complete_preference_order"
        ]["value"]
    )


def _result_body(result: dict | JSONResponse) -> dict:
    if isinstance(result, JSONResponse):
        return json.loads(result.body.decode("utf-8"))
    return result


def _execute(payload: dict) -> dict:
    request = GenericModelExecutionRequest.model_validate(payload)
    return _result_body(executor.execute_preference_order_criteria_weights(request))


def _evaluation(email: str | None, expert_id: str, order: list[str]) -> dict:
    expert = {"id": expert_id}
    if email is not None:
        expert["email"] = email
    return {"expert": expert, "payload": {"criterionOrder": order}}


def test_run_uses_the_exact_seven_criterion_positional_weights() -> None:
    criterion_ids = [f"C{index}" for index in range(1, 8)]
    result = run_preference_order_criteria_weights(
        context={"criteria": [{"id": criterion_id} for criterion_id in criterion_ids]},
        evaluations=[_evaluation("expert@example.com", "expert", criterion_ids)],
        model_parameters={},
    )

    weights = result["data"]["expertWeightsByExpert"]["expert@example.com"]
    assert weights == pytest.approx({
        "C1": 7 / 28,
        "C2": 6 / 28,
        "C3": 5 / 28,
        "C4": 4 / 28,
        "C5": 3 / 28,
        "C6": 2 / 28,
        "C7": 1 / 28,
    })
    assert sum(weights.values()) == pytest.approx(1.0)
    assert [weights[criterion_id] for criterion_id in criterion_ids] == sorted(
        weights.values(), reverse=True
    )


def test_run_uses_expert_order_not_context_order_and_processes_each_expert() -> None:
    result = run_preference_order_criteria_weights(
        context={"criteria": [{"id": "C3"}, {"id": "C1"}, {"id": "C2"}]},
        evaluations=[
            _evaluation("first@example.com", "first", ["C2", "C3", "C1"]),
            _evaluation(None, "second", ["C1", "C2", "C3"]),
        ],
        model_parameters={},
    )

    vectors = result["data"]["expertWeightsByExpert"]
    assert result["data"]["nExperts"] == 2
    assert list(vectors["first@example.com"]) == ["C3", "C1", "C2"]
    assert vectors["first@example.com"] == pytest.approx({
        "C3": 2 / 6,
        "C1": 1 / 6,
        "C2": 3 / 6,
    })
    assert vectors["second"] == pytest.approx({
        "C3": 1 / 6,
        "C1": 3 / 6,
        "C2": 2 / 6,
    })


@pytest.mark.parametrize(
    ("order", "message"),
    [
        (["CRIT_1", "CRIT_2"], "every current criterion exactly once"),
        (["CRIT_1", "CRIT_1", "CRIT_3"], "duplicate criterion id"),
        (["CRIT_1", "CRIT_2", "unknown"], "unknown criterion id"),
    ],
)
def test_run_rejects_non_strict_or_incomplete_orders(order: list[str], message: str) -> None:
    payload = _request_payload()
    payload["evaluations"][0]["payload"]["criterionOrder"] = order

    result = run_preference_order_criteria_weights(
        context=payload["context"],
        evaluations=payload["evaluations"],
        model_parameters={},
    )

    assert result["success"] is False
    assert message in result["message"]


def test_run_rejects_duplicate_resolved_expert_keys() -> None:
    payload = _request_payload()
    payload["evaluations"].append(deepcopy(payload["evaluations"][0]))

    result = run_preference_order_criteria_weights(
        context=payload["context"],
        evaluations=payload["evaluations"],
        model_parameters={},
    )

    assert result["success"] is False
    assert "Duplicated preference-order evaluation" in result["message"]


def test_executor_returns_the_single_expert_vector_without_mcc() -> None:
    result = _execute(_request_payload())

    expected = {
        "CRIT_1": 2 / 6,
        "CRIT_2": 3 / 6,
        "CRIT_3": 1 / 6,
    }
    assert result["success"] is True
    assert result["data"]["weightsByCriterion"] == pytest.approx(expected)
    assert result["data"]["collectiveEvaluations"]["weightsByCriterion"] == pytest.approx(expected)
    assert result["data"]["rawOutput"]["useMcc"] is False
    assert result["data"]["rawOutput"]["singleExpertKey"] == "expert.a@example.com"
    assert result["data"]["rawOutput"]["nExperts"] == 1


def test_executor_aggregates_multiple_experts_through_mcc(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    payload = _request_payload()
    payload["evaluations"].append(
        _evaluation("expert.b@example.com", "EXPERT_2", ["CRIT_3", "CRIT_1", "CRIT_2"])
    )
    captured: dict = {}
    collective_weights = {"CRIT_1": 0.4, "CRIT_2": 0.35, "CRIT_3": 0.25}

    def fake_solve_mcc_weights(*, criteria: list, expert_weights_by_expert: dict) -> dict:
        captured["criteria"] = criteria
        captured["expert_weights_by_expert"] = expert_weights_by_expert
        return {"weightsByCriterion": collective_weights, "status": "Optimal"}

    monkeypatch.setattr(executor, "solve_mcc_weights", fake_solve_mcc_weights)

    result = _execute(payload)

    assert result["success"] is True
    assert set(captured["expert_weights_by_expert"]) == {
        "expert.a@example.com",
        "expert.b@example.com",
    }
    assert result["data"]["weightsByCriterion"] == collective_weights
    assert result["data"]["collectiveEvaluations"]["weightsByCriterion"] == collective_weights
    assert result["data"]["rawOutput"]["useMcc"] is True
    assert result["data"]["rawOutput"]["mcc"] == {
        "weightsByCriterion": collective_weights,
        "status": "Optimal",
    }
    assert result["data"]["rawOutput"]["nExperts"] == 2


@pytest.mark.parametrize(
    "mutate",
    [
        lambda payload: payload.__setitem__("evaluations", []),
        lambda payload: payload["context"].__setitem__("criteria", []),
        lambda payload: payload["evaluations"][0]["payload"].__setitem__(
            "criterionOrder", ["CRIT_1", "CRIT_2"]
        ),
        lambda payload: payload["evaluations"][0]["payload"].__setitem__(
            "criterionOrder", ["CRIT_1", "CRIT_2", "unknown"]
        ),
        lambda payload: payload["evaluations"][0]["payload"].__setitem__(
            "criterionOrder", ["CRIT_1", "CRIT_1", "CRIT_3"]
        ),
        lambda payload: payload["evaluations"].append(deepcopy(payload["evaluations"][0])),
    ],
)
def test_executor_rejects_invalid_requests(mutate) -> None:
    payload = _request_payload()
    mutate(payload)

    result = _execute(payload)

    assert result["success"] is False


def test_model_definition_declares_the_preference_order_criteria_weighting_contract() -> None:
    assert MODEL_DEFINITION.api_model_key == "preference_order_criteria_weights"
    assert MODEL_DEFINITION.model_kind == "criteriaWeighting"
    assert MODEL_DEFINITION.evaluation_structure_key == "criteriaPreferenceOrder"
    assert MODEL_DEFINITION.supports_creator_criteria_weighting is True
    assert MODEL_DEFINITION.supports_expert_criteria_weighting is True
    assert MODEL_DEFINITION.parameters == []
    assert MODEL_DEFINITION.implementation_status == "ready"
