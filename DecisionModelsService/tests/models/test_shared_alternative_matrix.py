from typing import Any

import pytest

from models.shared_alternative_matrix import extract_id_keyed_alternative_criteria_input
from schemas.model_requests import GenericModelExecutionRequest


NUMERIC_DOMAIN = {
    "typeKey": "numericContinuous",
    "definition": {
        "min": 0,
        "max": 10,
    },
}


def _request(payload: dict[str, Any]) -> GenericModelExecutionRequest:
    return GenericModelExecutionRequest.model_validate(payload)


def _base_payload() -> dict[str, Any]:
    return {
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


def test_shared_alternative_matrix_retains_criterion_expression_domain() -> None:
    seen_calls: list[dict[str, Any]] = []

    result = extract_id_keyed_alternative_criteria_input(
        payload=_request(_base_payload()),
        expert_key_fn=lambda expert, _: str(expert["id"]),
        cell_value_fn=lambda cell, criterion, field: seen_calls.append(
            {"cell": cell, "criterion": criterion, "field": field}
        )
        or float(cell["value"]),
    )

    assert result["criterion_items"] == [
        {
            "id": "criterion-1",
            "name": "Criterion 1",
            "type": "benefit",
            "expressionDomain": NUMERIC_DOMAIN,
        }
    ]
    assert result["matrices"] == {"expert-1": [[7.5], [6.5]]}
    assert seen_calls[0]["criterion"]["expressionDomain"] == NUMERIC_DOMAIN
    assert seen_calls[0]["field"].endswith("['criterion-1']")


@pytest.mark.parametrize(
    "cell,error_message",
    [
        (7.5, "is required"),
        ({"value": 7.5, "expressionDomain": NUMERIC_DOMAIN}, "exactly the key 'value'"),
        ({"value": 7.5, "domain": NUMERIC_DOMAIN}, "exactly the key 'value'"),
        ({"value": 7.5, "extra": True}, "exactly the key 'value'"),
    ],
)
def test_shared_alternative_matrix_rejects_non_canonical_cells(
    cell: Any,
    error_message: str,
) -> None:
    payload = _base_payload()
    payload["evaluations"][0]["payload"]["alt-a"]["criterion-1"] = cell

    with pytest.raises(ValueError, match=error_message):
        extract_id_keyed_alternative_criteria_input(
            payload=_request(payload),
            expert_key_fn=lambda expert, _: str(expert["id"]),
            cell_value_fn=lambda cell, criterion, field: float(cell["value"]),
        )


def test_shared_alternative_matrix_rejects_missing_or_unknown_rows_and_cells() -> None:
    payload = _base_payload()
    del payload["evaluations"][0]["payload"]["alt-b"]

    with pytest.raises(ValueError, match=r"payload\['alt-b'\] is required"):
        extract_id_keyed_alternative_criteria_input(
            payload=_request(payload),
            expert_key_fn=lambda expert, _: str(expert["id"]),
            cell_value_fn=lambda cell, criterion, field: float(cell["value"]),
        )

    payload = _base_payload()
    payload["evaluations"][0]["payload"]["alt-c"] = {"criterion-1": {"value": 1}}

    with pytest.raises(ValueError, match="unknown alternative rows"):
        extract_id_keyed_alternative_criteria_input(
            payload=_request(payload),
            expert_key_fn=lambda expert, _: str(expert["id"]),
            cell_value_fn=lambda cell, criterion, field: float(cell["value"]),
        )

    payload = _base_payload()
    del payload["evaluations"][0]["payload"]["alt-a"]["criterion-1"]

    with pytest.raises(ValueError, match=r"\['criterion-1'\] is required"):
        extract_id_keyed_alternative_criteria_input(
            payload=_request(payload),
            expert_key_fn=lambda expert, _: str(expert["id"]),
            cell_value_fn=lambda cell, criterion, field: float(cell["value"]),
        )

    payload = _base_payload()
    payload["evaluations"][0]["payload"]["alt-a"]["criterion-2"] = {"value": 1}

    with pytest.raises(ValueError, match="unknown criterion cells"):
        extract_id_keyed_alternative_criteria_input(
            payload=_request(payload),
            expert_key_fn=lambda expert, _: str(expert["id"]),
            cell_value_fn=lambda cell, criterion, field: float(cell["value"]),
        )


def test_shared_alternative_matrix_rejects_missing_criterion_expression_domain() -> None:
    payload = _base_payload()
    del payload["context"]["criteria"][0]["expressionDomain"]

    with pytest.raises(ValueError, match="requires an expressionDomain object"):
        extract_id_keyed_alternative_criteria_input(
            payload=_request(payload),
            expert_key_fn=lambda expert, _: str(expert["id"]),
            cell_value_fn=lambda cell, criterion, field: float(cell["value"]),
        )


def test_shared_alternative_matrix_validates_and_normalizes_expert_weights() -> None:
    payload = _base_payload()
    payload["evaluations"].append(
        {
            "expert": {"id": "expert-2"},
            "weight": 0.7,
            "payload": payload["evaluations"][0]["payload"],
        }
    )
    payload["evaluations"][0]["weight"] = 0.3

    result = extract_id_keyed_alternative_criteria_input(
        payload=_request(payload),
        expert_key_fn=lambda expert, _: str(expert["id"]),
        cell_value_fn=lambda cell, criterion, field: float(cell["value"]),
        require_expert_weights=True,
    )

    assert result["expert_weights"] == [0.3, 0.7]

    payload["evaluations"][1]["weight"] = 0.5
    with pytest.raises(ValueError, match="sum to 1"):
        extract_id_keyed_alternative_criteria_input(
            payload=_request(payload),
            expert_key_fn=lambda expert, _: str(expert["id"]),
            cell_value_fn=lambda cell, criterion, field: float(cell["value"]),
            require_expert_weights=True,
        )
