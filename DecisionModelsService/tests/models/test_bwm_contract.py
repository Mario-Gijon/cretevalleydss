from copy import deepcopy
import json

from fastapi.responses import JSONResponse
import pytest

from models.bwm import executor
from models.bwm.examples import BWM_REQUEST_EXAMPLES
from schemas.model_requests import GenericModelExecutionRequest


def _request_payload() -> dict:
    payload = deepcopy(BWM_REQUEST_EXAMPLES["basic_criteria_weighting"]["value"])
    payload["evaluations"] = payload["evaluations"][:1]
    return payload


def _result_body(result: dict | JSONResponse) -> dict:
    if isinstance(result, JSONResponse):
        return json.loads(result.body.decode("utf-8"))
    return result


def _execute(payload: dict) -> dict:
    request = GenericModelExecutionRequest.model_validate(payload)
    return _result_body(executor.execute_bwm(request))


def test_bwm_reads_selected_ids_and_preserves_criterion_order(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict = {}

    def fake_run_bwm(experts_data: dict, eps_penalty: float) -> dict:
        captured["experts_data"] = experts_data
        captured["eps_penalty"] = eps_penalty
        expert_key = next(iter(experts_data))
        return {
            "success": True,
            "expertWeights": {expert_key: [0.6, 0.25, 0.15]},
            "expertInputs": experts_data,
        }

    monkeypatch.setattr(executor, "run_bwm", fake_run_bwm)

    result = _execute(_request_payload())

    assert result["success"] is True
    assert captured["experts_data"]["ana.torres@example.com"] == {
        "mic": [1.0, 5.0, 3.0],
        "lic": [5.0, 1.0, 3.0],
    }
    assert result["data"]["collectiveEvaluations"] == {
        "weightsByCriterion": {
            "crit-quality": 0.6,
            "crit-cost": 0.25,
            "crit-delivery": 0.15,
        }
    }


@pytest.mark.parametrize(
    ("mutate", "message"),
    [
        (
            lambda value: value["evaluations"][0]["payload"].pop(
                "bestCriterionId"
            ),
            "payload must contain exactly",
        ),
        (
            lambda value: value["evaluations"][0]["payload"].update(
                {"bestCriterion": "crit-quality"}
            ),
            "payload must contain exactly",
        ),
        (
            lambda value: value["evaluations"][0]["payload"].update(
                {"worstCriterion": "crit-cost"}
            ),
            "payload must contain exactly",
        ),
        (
            lambda value: value["evaluations"][0]["payload"].update(
                {"bestCriterionId": "unknown"}
            ),
            "bestCriterionId must identify",
        ),
        (
            lambda value: value["evaluations"][0]["payload"].update(
                {"bestCriterionId": 1}
            ),
            "bestCriterionId must be a string",
        ),
        (
            lambda value: value["evaluations"][0]["payload"].update(
                {"worstCriterionId": "unknown"}
            ),
            "worstCriterionId must identify",
        ),
        (
            lambda value: value["evaluations"][0]["payload"].update(
                {"worstCriterionId": "crit-quality"}
            ),
            "must be different",
        ),
        (
            lambda value: value["evaluations"][0]["payload"][
                "bestToOthers"
            ].pop("crit-delivery"),
            "bestToOthers must contain exactly",
        ),
        (
            lambda value: value["evaluations"][0]["payload"][
                "othersToWorst"
            ].update({"unknown": 4}),
            "othersToWorst must contain exactly",
        ),
        (
            lambda value: value["evaluations"][0]["payload"][
                "bestToOthers"
            ].update({"crit-delivery": 1.5}),
            "must be an integer between 1 and 9",
        ),
        (
            lambda value: value["evaluations"][0]["payload"][
                "bestToOthers"
            ].update({"crit-quality": 2}),
            "must be 1",
        ),
        (
            lambda value: value["evaluations"][0]["payload"][
                "othersToWorst"
            ].update({"crit-cost": 2}),
            "must be 1",
        ),
    ],
)
def test_bwm_rejects_noncanonical_contract(mutate, message: str) -> None:
    payload = _request_payload()
    mutate(payload)

    result = _execute(payload)

    assert result["success"] is False
    assert message in result["message"]
