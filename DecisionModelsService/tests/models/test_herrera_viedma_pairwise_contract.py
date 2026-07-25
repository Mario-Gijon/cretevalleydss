from copy import deepcopy

import numpy as np
import pytest

from models.herrera_viedma_crp.examples import (
    HERRERA_VIEDMA_CRP_REQUEST_EXAMPLES,
)
from models.herrera_viedma_crp.executor import (
    _input,
    _normalize_pairwise_collective_evaluations,
)
from models.herrera_viedma_crp.run import _build_suggested_pairwise_payload
from schemas.model_requests import GenericModelExecutionRequest


def _request_payload() -> dict:
    return deepcopy(
        HERRERA_VIEDMA_CRP_REQUEST_EXAMPLES["basic_pairwise_consensus"]["value"]
    )


def test_herrera_viedma_reads_direct_pairwise_values() -> None:
    request = GenericModelExecutionRequest.model_validate(_request_payload())

    execution_input = _input(request)

    assert execution_input["matrices"]["expert-ana"]["crit-overall"] == [
        [0.5, 0.35, 0.70],
        [0.65, 0.5, 0.80],
        [0.30, 0.20, 0.5],
    ]


def test_herrera_viedma_rejects_the_former_value_wrapper() -> None:
    payload = _request_payload()
    payload["evaluations"][0]["payload"]["crit-overall"]["alt-supplier-a"][
        "alt-supplier-b"
    ] = {"value": 0.35}
    request = GenericModelExecutionRequest.model_validate(payload)

    with pytest.raises((TypeError, ValueError)):
        _input(request)


def test_herrera_viedma_suggestions_use_direct_values() -> None:
    payload = _build_suggested_pairwise_payload(
        matrix=np.array(
            [
                [0.5, 0.7],
                [0.3, 0.5],
            ]
        ),
        criterion_id="criterion-1",
        alternative_ids=["alt-a", "alt-b"],
        alternative_names=["Alternative A", "Alternative B"],
    )

    assert payload == {
        "criterion-1": {
            "alt-a": {"alt-b": 0.7},
            "alt-b": {"alt-a": 0.3},
        }
    }


def test_herrera_viedma_collective_output_uses_direct_values() -> None:
    collective = _normalize_pairwise_collective_evaluations(
        source={
            "criterion-1": [
                [0.5, 0.7],
                [0.3, 0.5],
            ]
        },
        alternative_ids=["alt-a", "alt-b"],
        aggregated_criterion_id="criterion-1",
    )

    assert collective == {
        "criterion-1": {
            "alt-a": {"alt-b": 0.7},
            "alt-b": {"alt-a": 0.3},
        }
    }
