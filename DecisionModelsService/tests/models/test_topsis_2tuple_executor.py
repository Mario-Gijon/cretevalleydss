import asyncio
import json
from typing import Any

import pytest
from fastapi.responses import JSONResponse

from models.topsis_2tuple.executor import (
    _input,
    execute_topsis_2tuple,
)
from schemas.model_requests import GenericModelExecutionRequest
from api.routers.results_analysis import analyze_generic_issue


def _domain(label_count: int = 5) -> dict[str, Any]:
    return {
        "typeKey": "linguistic2Tuple",
        "definition": {
            "labelCount": label_count,
            "labels": [
                {
                    "key": f"s{index}",
                    "label": f"S{index}",
                    "index": index,
                }
                for index in range(label_count)
            ],
        },
    }


def _request(
    payload: dict[str, Any],
) -> GenericModelExecutionRequest:
    return GenericModelExecutionRequest.model_validate(payload)


def _base_payload() -> dict[str, Any]:
    return {
        "context": {
            "alternatives": [
                {
                    "id": "alt-a",
                    "name": "Alternative A",
                },
                {
                    "id": "alt-b",
                    "name": "Alternative B",
                },
            ],
            "criteria": [
                {
                    "id": "criterion-benefit",
                    "name": "Benefit criterion",
                    "type": "benefit",
                    "expressionDomain": _domain(5),
                },
                {
                    "id": "criterion-cost",
                    "name": "Cost criterion",
                    "type": "cost",
                    "expressionDomain": _domain(5),
                },
            ],
        },
        "modelParameters": {
            "weights": {
                "criterion-benefit": 2.0,
                "criterion-cost": 1.0,
            },
        },
        "evaluations": [
            {
                "expert": {
                    "id": "expert-1",
                },
                "weight": 0.25,
                "payload": {
                    "alt-a": {
                        "criterion-benefit": {
                            "labelKey": "s2",
                            "alpha": -0.25,
                        },
                        "criterion-cost": {
                            "labelKey": "s3",
                            "alpha": 0.0,
                        },
                    },
                    "alt-b": {
                        "criterion-benefit": {
                            "labelKey": "s4",
                            "alpha": -0.5,
                        },
                        "criterion-cost": {
                            "labelKey": "s1",
                            "alpha": 0.25,
                        },
                    },
                },
            },
            {
                "expert": {
                    "id": "expert-2",
                },
                "weight": 0.75,
                "payload": {
                    "alt-a": {
                        "criterion-benefit": {
                            "labelKey": "s2",
                            "alpha": 0.0,
                        },
                        "criterion-cost": {
                            "labelKey": "s2",
                            "alpha": 0.25,
                        },
                    },
                    "alt-b": {
                        "criterion-benefit": {
                            "labelKey": "s3",
                            "alpha": 0.25,
                        },
                        "criterion-cost": {
                            "labelKey": "s1",
                            "alpha": 0.0,
                        },
                    },
                },
            },
        ],
    }


def _payload_result(
    result: dict[str, Any] | JSONResponse,
) -> dict[str, Any]:
    if isinstance(result, JSONResponse):
        return json.loads(
            result.body.decode("utf-8")
        )

    return result


def test_topsis_2tuple_input_prepares_beta_matrices() -> None:
    result = _input(
        _request(_base_payload())
    )

    assert result["matrices"] == {
        "expert-1": [
            [1.75, 3.0],
            [3.5, 1.25],
        ],
        "expert-2": [
            [2.0, 2.25],
            [3.25, 1.0],
        ],
    }

    assert result["expert_keys"] == [
        "expert-1",
        "expert-2",
    ]

    assert result["expert_weights"] == [
        0.25,
        0.75,
    ]


def test_topsis_2tuple_input_normalizes_criteria_weights() -> None:
    result = _input(
        _request(_base_payload())
    )

    assert result["weights"] == pytest.approx(
        [
            2.0 / 3.0,
            1.0 / 3.0,
        ]
    )


def test_topsis_2tuple_input_normalizes_criterion_directions() -> None:
    result = _input(
        _request(_base_payload())
    )

    assert result["criterion_directions"] == [
        "max",
        "min",
    ]


def test_topsis_2tuple_input_preserves_ordered_scales() -> None:
    result = _input(
        _request(_base_payload())
    )

    assert len(result["criterion_scales"]) == 2

    first_scale = result["criterion_scales"][0]

    assert first_scale == {
        "criterionId": "criterion-benefit",
        "labelCount": 5,
        "maximumIndex": 4,
        "labels": [
            {
                "key": "s0",
                "label": "S0",
                "index": 0,
            },
            {
                "key": "s1",
                "label": "S1",
                "index": 1,
            },
            {
                "key": "s2",
                "label": "S2",
                "index": 2,
            },
            {
                "key": "s3",
                "label": "S3",
                "index": 3,
            },
            {
                "key": "s4",
                "label": "S4",
                "index": 4,
            },
        ],
    }


def test_topsis_2tuple_input_rejects_mixed_granularity() -> None:
    payload = _base_payload()

    payload["context"]["criteria"][1][
        "expressionDomain"
    ] = _domain(7)

    with pytest.raises(
        ValueError,
        match="same number of linguistic labels",
    ):
        _input(
            _request(payload)
        )


def test_topsis_2tuple_input_rejects_non_2tuple_domain() -> None:
    payload = _base_payload()

    payload["context"]["criteria"][0][
        "expressionDomain"
    ] = {
        "typeKey": "numericContinuous",
        "definition": {
            "min": 0,
            "max": 10,
        },
    }

    with pytest.raises(
        ValueError,
        match="is not supported for 2-Tuple TOPSIS",
    ):
        _input(
            _request(payload)
        )


def test_topsis_2tuple_input_rejects_negative_criterion_weight() -> None:
    payload = _base_payload()

    payload["modelParameters"]["weights"][
        "criterion-benefit"
    ] = -1.0

    with pytest.raises(
        ValueError,
        match="greater than or equal to 0",
    ):
        _input(
            _request(payload)
        )


def test_topsis_2tuple_input_rejects_all_zero_criterion_weights() -> None:
    payload = _base_payload()

    payload["modelParameters"]["weights"] = {
        "criterion-benefit": 0.0,
        "criterion-cost": 0.0,
    }

    with pytest.raises(
        ValueError,
        match="at least one positive weight",
    ):
        _input(
            _request(payload)
        )


def test_topsis_2tuple_input_requires_expert_weights() -> None:
    payload = _base_payload()

    del payload["evaluations"][0]["weight"]

    with pytest.raises(
        ValueError,
        match=r"evaluations\[0\]\.weight is required",
    ):
        _input(
            _request(payload)
        )


def test_topsis_2tuple_input_rejects_invalid_expert_weight_sum() -> None:
    payload = _base_payload()

    payload["evaluations"][0]["weight"] = 0.2
    payload["evaluations"][1]["weight"] = 0.7

    with pytest.raises(
        ValueError,
        match="Expert weights must sum to 1",
    ):
        _input(
            _request(payload)
        )


def test_topsis_2tuple_input_uses_full_nonzero_alpha() -> None:
    payload = _base_payload()

    payload["evaluations"][0]["payload"]["alt-a"][
        "criterion-benefit"
    ] = {
        "labelKey": "s3",
        "alpha": 0.4,
    }

    result = _input(
        _request(payload)
    )

    assert result["matrices"]["expert-1"][0][0] == pytest.approx(
        3.4
    )


def test_topsis_2tuple_input_rejects_unknown_label() -> None:
    payload = _base_payload()

    payload["evaluations"][0]["payload"]["alt-a"][
        "criterion-benefit"
    ] = {
        "labelKey": "missing",
        "alpha": 0.0,
    }

    with pytest.raises(
        ValueError,
        match="Unknown linguistic label",
    ):
        _input(
            _request(payload)
        )


def test_topsis_2tuple_public_executor_runs_end_to_end() -> None:
    result = _payload_result(
        execute_topsis_2tuple(
            _request(_base_payload())
        )
    )

    assert result["success"] is True
    assert result["message"] == (
        "2-Tuple TOPSIS executed successfully"
    )

    data = result["data"]

    assert data["rankedAlternatives"] == [
        {
            "alternativeId": "alt-b",
            "name": "Alternative B",
            "score": pytest.approx(1.0),
            "rank": 1,
        },
        {
            "alternativeId": "alt-a",
            "name": "Alternative A",
            "score": pytest.approx(0.0),
            "rank": 2,
        },
    ]

    assert data["consensusMeasure"] is None
    assert set(data["plotsGraphic"]) == {
        "expert_points",
        "collective_point",
        "expert_ids",
        "expert_labels",
    }
    assert data["plotsGraphic"]["expert_ids"] == [
        "expert-1",
        "expert-2",
    ]
    assert data["plotsGraphic"]["expert_labels"] == [
        "expert-1",
        "expert-2",
    ]
    assert len(data["plotsGraphic"]["expert_points"]) == 2
    assert len(data["plotsGraphic"]["collective_point"]) == 2


def test_topsis_2tuple_public_executor_returns_collective_2tuples() -> None:
    result = _payload_result(
        execute_topsis_2tuple(
            _request(_base_payload())
        )
    )

    assert result["success"] is True

    collective = result["data"][
        "collectiveEvaluations"
    ]

    assert collective["alt-a"][
        "criterion-benefit"
    ] == {
        "labelKey": "s2",
        "alpha": pytest.approx(-0.0625),
    }

    assert collective["alt-a"][
        "criterion-cost"
    ] == {
        "labelKey": "s2",
        "alpha": pytest.approx(0.4375),
    }

    assert collective["alt-b"][
        "criterion-benefit"
    ] == {
        "labelKey": "s3",
        "alpha": pytest.approx(0.3125),
    }

    assert collective["alt-b"][
        "criterion-cost"
    ] == {
        "labelKey": "s1",
        "alpha": pytest.approx(0.0625),
    }


def test_topsis_2tuple_single_expert_projection_is_available_without_disagreement() -> None:
    payload = _base_payload()
    payload["evaluations"] = [
        {
            **payload["evaluations"][0],
            "weight": 1.0,
        }
    ]

    data = _payload_result(
        execute_topsis_2tuple(_request(payload))
    )["data"]
    projection = data["plotsGraphic"]

    assert projection["expert_ids"] == ["expert-1"]
    assert projection["expert_labels"] == ["expert-1"]
    assert projection["expert_points"] == [[0.0, 0.0]]
    assert len(projection["collective_point"]) == 2

    context = {
        "issue": {
            "id": "issue-1",
            "name": "Issue",
            "description": "Description",
            "lifecycle": {"active": False},
            "consensus": {"enabled": False},
        },
        "participants": {"current": []},
        "semanticDirectory": {
            "alternativesById": {
                "alt-a": {"name": "Alternative A"},
                "alt-b": {"name": "Alternative B"},
            },
        },
        "rounds": [{
            "phase": 0,
            "selectedExecution": {
                "attemptId": "attempt-1",
                "startedAt": "start",
                "completedAt": "end",
                "result": {"standardResult": data},
            },
        }],
    }
    facts = asyncio.run(analyze_generic_issue(context))["data"]["facts"]

    assert facts["expertCollectiveRelationship"] == {
        "projection": projection,
        "unavailableReason": None,
    }


def test_topsis_2tuple_public_executor_preserves_raw_model_evidence() -> None:
    result = _payload_result(
        execute_topsis_2tuple(
            _request(_base_payload())
        )
    )

    raw_output = result["data"]["rawOutput"]

    assert raw_output[
        "collective_beta_matrix"
    ][0] == pytest.approx(
        [
            1.9375,
            2.4375,
        ]
    )

    assert raw_output[
        "collective_beta_matrix"
    ][1] == pytest.approx(
        [
            3.3125,
            1.0625,
        ]
    )

    assert raw_output[
        "positive_ideal_beta"
    ] == pytest.approx(
        [
            3.3125,
            1.0625,
        ]
    )

    assert raw_output[
        "negative_ideal_beta"
    ] == pytest.approx(
        [
            1.9375,
            2.4375,
        ]
    )

    assert raw_output[
        "positive_distances"
    ] == pytest.approx(
        [
            1.375,
            0.0,
        ]
    )

    assert raw_output[
        "negative_distances"
    ] == pytest.approx(
        [
            0.0,
            1.375,
        ]
    )

    assert raw_output[
        "closeness_coefficients"
    ] == pytest.approx(
        [
            0.0,
            1.0,
        ]
    )

    assert raw_output[
        "criterion_weights"
    ] == pytest.approx(
        [
            2.0 / 3.0,
            1.0 / 3.0,
        ]
    )

    assert raw_output[
        "expert_weights"
    ] == pytest.approx(
        [
            0.25,
            0.75,
        ]
    )

    assert raw_output[
        "criterion_directions"
    ] == [
        "max",
        "min",
    ]

    assert raw_output[
        "alternative_ids"
    ] == [
        "alt-a",
        "alt-b",
    ]

    assert raw_output[
        "criterion_ids"
    ] == [
        "criterion-benefit",
        "criterion-cost",
    ]


def test_topsis_2tuple_public_executor_returns_validation_errors_cleanly() -> None:
    payload = _base_payload()

    payload["evaluations"][0]["weight"] = 0.2
    payload["evaluations"][1]["weight"] = 0.7

    result = _payload_result(
        execute_topsis_2tuple(
            _request(payload)
        )
    )

    assert result["success"] is False
    assert result["error"]["code"] == (
        "MODEL_EXECUTION_ERROR"
    )
    assert "Expert weights must sum to 1" in (
        result["message"]
    )
