from typing import Any

import pytest

from models.shared_alternative_matrix import (
    extract_id_keyed_alternative_criteria_input,
    normalize_collective_evaluations_by_ids,
)
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
                        "criterion-1": 7.5,
                    },
                    "alt-b": {
                        "criterion-1": 6.5,
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
        evaluation_value_fn=lambda value, criterion, field: seen_calls.append(
            {"value": value, "criterion": criterion, "field": field}
        )
        or float(value),
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


def test_shared_alternative_matrix_rejects_null_evaluation_values() -> None:
    payload = _base_payload()
    payload["evaluations"][0]["payload"]["alt-a"]["criterion-1"] = None

    with pytest.raises(ValueError, match="is required"):
        extract_id_keyed_alternative_criteria_input(
            payload=_request(payload),
            expert_key_fn=lambda expert, _: str(expert["id"]),
            evaluation_value_fn=lambda value, criterion, field: float(value),
        )


def test_shared_alternative_matrix_rejects_missing_or_unknown_rows_and_cells() -> None:
    payload = _base_payload()
    del payload["evaluations"][0]["payload"]["alt-b"]

    with pytest.raises(ValueError, match=r"payload\['alt-b'\] is required"):
        extract_id_keyed_alternative_criteria_input(
            payload=_request(payload),
            expert_key_fn=lambda expert, _: str(expert["id"]),
            evaluation_value_fn=lambda value, criterion, field: float(value),
        )

    payload = _base_payload()
    payload["evaluations"][0]["payload"]["alt-c"] = {"criterion-1": 1}

    with pytest.raises(ValueError, match="unknown alternative rows"):
        extract_id_keyed_alternative_criteria_input(
            payload=_request(payload),
            expert_key_fn=lambda expert, _: str(expert["id"]),
            evaluation_value_fn=lambda value, criterion, field: float(value),
        )

    payload = _base_payload()
    del payload["evaluations"][0]["payload"]["alt-a"]["criterion-1"]

    with pytest.raises(ValueError, match=r"\['criterion-1'\] is required"):
        extract_id_keyed_alternative_criteria_input(
            payload=_request(payload),
            expert_key_fn=lambda expert, _: str(expert["id"]),
            evaluation_value_fn=lambda value, criterion, field: float(value),
        )

    payload = _base_payload()
    payload["evaluations"][0]["payload"]["alt-a"]["criterion-2"] = 1

    with pytest.raises(ValueError, match="unknown criterion cells"):
        extract_id_keyed_alternative_criteria_input(
            payload=_request(payload),
            expert_key_fn=lambda expert, _: str(expert["id"]),
            evaluation_value_fn=lambda value, criterion, field: float(value),
        )


def test_shared_alternative_matrix_rejects_missing_criterion_expression_domain() -> None:
    payload = _base_payload()
    del payload["context"]["criteria"][0]["expressionDomain"]

    with pytest.raises(ValueError, match="requires an expressionDomain object"):
        extract_id_keyed_alternative_criteria_input(
            payload=_request(payload),
            expert_key_fn=lambda expert, _: str(expert["id"]),
            evaluation_value_fn=lambda value, criterion, field: float(value),
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
        evaluation_value_fn=lambda value, criterion, field: float(value),
        require_expert_weights=True,
    )

    assert result["expert_weights"] == [0.3, 0.7]

    payload["evaluations"][1]["weight"] = 0.5
    with pytest.raises(ValueError, match="sum to 1"):
        extract_id_keyed_alternative_criteria_input(
            payload=_request(payload),
            expert_key_fn=lambda expert, _: str(expert["id"]),
            evaluation_value_fn=lambda value, criterion, field: float(value),
            require_expert_weights=True,
        )


def test_normalize_collective_evaluations_by_ids_builds_a_complete_direct_matrix() -> None:
    assert normalize_collective_evaluations_by_ids(
        collective_matrix=[[7.5, 6.5], [5.5, 4.5]],
        alternative_ids=["alt-a", "alt-b"],
        criterion_ids=["criterion-1", "criterion-2"],
    ) == {
        "alt-a": {"criterion-1": 7.5, "criterion-2": 6.5},
        "alt-b": {"criterion-1": 5.5, "criterion-2": 4.5},
    }


@pytest.mark.parametrize(
    ("collective_matrix", "message"),
    [
        ({}, "must be a list"),
        ([[7.5]], "row count must match alternatives"),
        ([[7.5], [6.5, 5.5]], "column count must match criteria"),
        ([[7.5, 6.5], {}], r"collective_matrix\[1\] must be a list"),
    ],
)
def test_normalize_collective_evaluations_by_ids_rejects_incomplete_shapes(
    collective_matrix: Any, message: str
) -> None:
    with pytest.raises(ValueError, match=message):
        normalize_collective_evaluations_by_ids(
            collective_matrix=collective_matrix,
            alternative_ids=["alt-a", "alt-b"],
            criterion_ids=["criterion-1", "criterion-2"],
        )
