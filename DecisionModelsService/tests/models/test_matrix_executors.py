import json
from typing import Any

from fastapi.responses import JSONResponse

from models.aras.executor import execute_aras
from models.fuzzy_topsis.executor import execute_fuzzy_topsis
from models.waspas.executor import execute_waspas
from schemas.model_requests import GenericModelExecutionRequest


NUMERIC_DOMAIN = {
    "typeKey": "numericContinuous",
    "definition": {
        "min": 0,
        "max": 10,
    },
}

FUZZY_DOMAIN = {
    "typeKey": "linguisticFuzzy",
    "definition": {
        "membershipFunction": "triangular",
        "labels": [
            {"key": "low", "label": "Low", "index": 0, "values": [0.1, 0.3, 0.5]},
            {"key": "high", "label": "High", "index": 1, "values": [0.5, 0.7, 0.9]},
        ],
    },
}


def _payload_result(result: dict[str, Any] | JSONResponse) -> dict[str, Any]:
    if isinstance(result, JSONResponse):
        return json.loads(result.body.decode("utf-8"))
    return result


def _aras_request() -> GenericModelExecutionRequest:
    return GenericModelExecutionRequest.model_validate(
        {
            "context": {
                "alternatives": [
                    {"id": "alt-a", "name": "Alternative A"},
                    {"id": "alt-b", "name": "Alternative B"},
                ],
                "criteria": [
                    {
                        "id": "criterion-1",
                        "name": "Criterion 1",
                        "type": "benefit",
                        "expressionDomain": NUMERIC_DOMAIN,
                    }
                ],
            },
            "modelParameters": {
                "weights": {
                    "criterion-1": 1.0,
                }
            },
            "evaluations": [
                {
                    "expert": {"id": "expert-1"},
                    "payload": {
                        "alt-a": {
                            "criterion-1": {"value": 7.5},
                        },
                        "alt-b": {
                            "criterion-1": {"value": 6.5},
                        },
                    },
                }
            ],
        }
    )


def _fuzzy_request(value: Any) -> GenericModelExecutionRequest:
    return GenericModelExecutionRequest.model_validate(
        {
            "context": {
                "alternatives": [
                    {"id": "alt-a", "name": "Alternative A"},
                    {"id": "alt-b", "name": "Alternative B"},
                ],
                "criteria": [
                    {
                        "id": "criterion-1",
                        "name": "Criterion 1",
                        "type": "benefit",
                        "expressionDomain": FUZZY_DOMAIN,
                    }
                ],
            },
            "modelParameters": {
                "weights": {
                    "criterion-1": [0.4, 0.5, 0.6],
                }
            },
            "evaluations": [
                {
                    "expert": {"id": "expert-1"},
                    "payload": {
                        "alt-a": {
                            "criterion-1": {"value": value},
                        },
                        "alt-b": {
                            "criterion-1": {"value": {"labelKey": "low"}},
                        },
                    },
                }
            ],
        }
    )


def test_aras_executor_uses_context_criterion_expression_domain(monkeypatch) -> None:
    captured: dict[str, Any] = {}

    def fake_run_aras(matrices, weights, criterion_type):
        captured["matrices"] = matrices
        captured["weights"] = weights
        captured["criterion_type"] = criterion_type
        return {
            "collective_matrix": [[7.5], [6.5]],
            "collective_scores": [0.7, 0.6],
            "collective_ranking": [0, 1],
            "plots_graphic": {},
        }

    monkeypatch.setattr("models.aras.executor.run_aras", fake_run_aras)

    result = _payload_result(execute_aras(_aras_request()))

    assert result["success"] is True
    assert captured["matrices"] == {"expert-1": [[7.5], [6.5]]}
    assert captured["weights"] == [1.0]
    assert captured["criterion_type"] == ["max"]


def test_fuzzy_topsis_executor_resolves_canonical_label_key_values(monkeypatch) -> None:
    captured: dict[str, Any] = {}

    def fake_run_fuzzy_topsis(matrices, weights, criterion_directions):
        captured["matrices"] = matrices
        captured["weights"] = weights
        captured["criterion_directions"] = criterion_directions
        return {
            "collective_matrix": [
                [[0.5, 0.7, 0.9]],
                [[0.1, 0.3, 0.5]],
            ],
            "collective_scores": [0.8, 0.2],
            "collective_ranking": [0, 1],
            "plots_graphic": {},
        }

    monkeypatch.setattr("models.fuzzy_topsis.executor.run_fuzzy_topsis", fake_run_fuzzy_topsis)

    result = _payload_result(execute_fuzzy_topsis(_fuzzy_request({"labelKey": "high"})))

    assert result["success"] is True
    assert captured["matrices"] == {
        "expert-1": [[[0.5, 0.7, 0.9]], [[0.1, 0.3, 0.5]]]
    }
    assert captured["weights"] == [[0.4, 0.5, 0.6]]
    assert captured["criterion_directions"] == ["max"]


def test_fuzzy_topsis_executor_rejects_raw_linguistic_string() -> None:
    result = _payload_result(execute_fuzzy_topsis(_fuzzy_request("High")))

    assert result["success"] is False
    assert "exactly the key 'labelKey'" in result["message"]


def test_fuzzy_topsis_executor_rejects_unknown_label_key() -> None:
    result = _payload_result(
        execute_fuzzy_topsis(_fuzzy_request({"labelKey": "missing"}))
    )

    assert result["success"] is False
    assert "Unknown linguistic label 'missing'" in result["message"]


def test_waspas_executor_passes_ordered_expert_weights(monkeypatch) -> None:
    captured: dict[str, Any] = {}
    payload = _aras_request().model_dump()
    payload["modelParameters"]["lambda"] = 0.5
    payload["evaluations"].append(
        {
            "expert": {"id": "expert-2"},
            "weight": 0.8,
            "payload": {
                "alt-a": {"criterion-1": {"value": 2.0}},
                "alt-b": {"criterion-1": {"value": 9.0}},
            },
        }
    )
    payload["evaluations"][0]["weight"] = 0.2

    def fake_run_waspas(matrices, weights, criterion_type, lambda_value, expert_weights):
        captured["matrices"] = matrices
        captured["expert_weights"] = expert_weights
        return {
            "collective_matrix": [[3.0], [8.5]],
            "collective_scores": [0.3, 0.8],
            "collective_ranking": [1, 0],
            "plots_graphic": {},
        }

    monkeypatch.setattr("models.waspas.executor.run_waspas", fake_run_waspas)
    result = _payload_result(
        execute_waspas(GenericModelExecutionRequest.model_validate(payload))
    )

    assert result["success"] is True
    assert captured["expert_weights"] == [0.2, 0.8]
