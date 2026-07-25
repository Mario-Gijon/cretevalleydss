from copy import deepcopy
import json

from fastapi.responses import JSONResponse
import pytest

from models.manual_criteria_weights import executor
from models.manual_criteria_weights.examples import (
    MANUAL_CRITERIA_WEIGHTS_REQUEST_EXAMPLES,
)
from schemas.model_requests import GenericModelExecutionRequest


def _request_payload() -> dict:
    return deepcopy(MANUAL_CRITERIA_WEIGHTS_REQUEST_EXAMPLES["basic_manual_weights"]["value"])


def _result_body(result: dict | JSONResponse) -> dict:
    if isinstance(result, JSONResponse):
        return json.loads(result.body.decode("utf-8"))
    return result


def _execute(payload: dict) -> dict:
    request = GenericModelExecutionRequest.model_validate(payload)
    return _result_body(executor.execute_manual_criteria_weights(request))


def test_manual_weights_accepts_canonical_payload_and_preserves_order(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict = {}

    def fake_solve_mcc_weights(*, criteria: list, expert_weights_by_expert: dict) -> dict:
        captured["criteria"] = criteria
        captured["expert_weights_by_expert"] = expert_weights_by_expert
        return {
            "weightsByCriterion": {
                "crit-quality": 0.45,
                "crit-cost": 0.325,
                "crit-delivery": 0.225,
            }
        }

    monkeypatch.setattr(executor, "solve_mcc_weights", fake_solve_mcc_weights)

    result = _execute(_request_payload())

    assert result["success"] is True
    assert [criterion["id"] for criterion in captured["criteria"]] == [
        "crit-quality",
        "crit-cost",
        "crit-delivery",
    ]
    assert result["data"]["collectiveEvaluations"] == {
        "weightsByCriterion": {
            "crit-quality": 0.45,
            "crit-cost": 0.325,
            "crit-delivery": 0.225,
        }
    }


@pytest.mark.parametrize(
    ("mutate", "message"),
    [
        (
            lambda value: value["evaluations"][0]["payload"].update({"extra": 1}),
            "exactly weightsByCriterion",
        ),
        (
            lambda value: value["evaluations"][0]["payload"]["weightsByCriterion"].pop(
                "crit-delivery"
            ),
            "exactly all context criteria",
        ),
        (
            lambda value: value["evaluations"][0]["payload"]["weightsByCriterion"].update(
                {"unknown": 0.1}
            ),
            "exactly all context criteria",
        ),
        (
            lambda value: value["evaluations"][0]["payload"]["weightsByCriterion"].update(
                {"crit-quality": "0.5"}
            ),
            "invalid weightsByCriterion",
        ),
        (
            lambda value: value["evaluations"][0]["payload"]["weightsByCriterion"].update(
                {"crit-quality": True}
            ),
            "invalid weightsByCriterion",
        ),
        (
            lambda value: value["evaluations"][0]["payload"]["weightsByCriterion"].update(
                {"crit-quality": float("inf")}
            ),
            "non-finite weightsByCriterion",
        ),
        (
            lambda value: value["evaluations"][0]["payload"]["weightsByCriterion"].update(
                {"crit-quality": -0.1}
            ),
            "between 0 and 1",
        ),
        (
            lambda value: value["evaluations"][0]["payload"]["weightsByCriterion"].update(
                {"crit-quality": 1.1}
            ),
            "between 0 and 1",
        ),
        (
            lambda value: value["evaluations"][0]["payload"]["weightsByCriterion"].update(
                {
                    "crit-quality": 0.5011,
                    "crit-cost": 0.3,
                    "crit-delivery": 0.2,
                }
            ),
            "must sum to 1",
        ),
    ],
)
def test_manual_weights_rejects_noncanonical_completed_evaluations(
    mutate, message: str
) -> None:
    payload = _request_payload()
    mutate(payload)

    result = _execute(payload)

    assert result["success"] is False
    assert message in result["message"]


def test_manual_weights_accepts_total_within_tolerance() -> None:
    payload = _request_payload()
    payload["evaluations"] = payload["evaluations"][:1]
    payload["evaluations"][0]["payload"]["weightsByCriterion"] = {
        "crit-quality": 0.5005,
        "crit-cost": 0.3,
        "crit-delivery": 0.2,
    }

    result = _execute(payload)

    assert result["success"] is True


def test_manual_weights_preserves_single_expert_output() -> None:
    payload = _request_payload()
    payload["evaluations"] = payload["evaluations"][:1]

    result = _execute(payload)

    assert result["success"] is True
    assert result["data"]["weightsByCriterion"] == {
        "crit-quality": 0.5,
        "crit-cost": 0.3,
        "crit-delivery": 0.2,
    }
    assert result["data"]["rawOutput"]["useMcc"] is False


@pytest.mark.parametrize(
    "mutate",
    [
        lambda value: value["context"]["criteria"].append(
            {"id": "crit-quality", "name": "Duplicate"}
        ),
        lambda value: value["context"]["criteria"].__setitem__(1, "invalid"),
        lambda value: value["context"]["criteria"].__setitem__(1, {"id": "", "name": "Cost"}),
        lambda value: value["context"]["criteria"].__setitem__(1, {"id": "crit-cost", "name": ""}),
    ],
)
def test_manual_weights_rejects_malformed_context_criteria(mutate) -> None:
    payload = _request_payload()
    mutate(payload)

    result = _execute(payload)

    assert result["success"] is False


def test_manual_weights_rejects_duplicate_expert_evaluations() -> None:
    payload = _request_payload()
    payload["evaluations"].append(deepcopy(payload["evaluations"][0]))

    result = _execute(payload)

    assert result["success"] is False
    assert "Duplicated manual criteria weights evaluation" in result["message"]
