import json

import pytest

from models.two_tuple.aggregation.core import TwoTuple
from models.two_tuple.examples import TWO_TUPLE_REQUEST_EXAMPLES
from models.two_tuple.executor import execute_two_tuple
from models.two_tuple.result_labels import interpret_two_tuple_result
from schemas.model_requests import GenericModelExecutionRequest


LABELS = [
    {"key": f"s{index}", "label": label, "index": index}
    for index, label in enumerate(["Very Low", "Low", "Medium", "High", "Very High"])
]


@pytest.mark.parametrize(
    ("label_index", "alpha", "expected"),
    [
        (3, 0.0, "High"),
        (3, 0.099999, "High"),
        (3, 0.10, "High, slightly leaning toward Very High"),
        (3, -0.10, "High, slightly leaning toward Medium"),
        (3, 0.25, "High, leaning toward Very High"),
        (3, -0.25, "High, leaning toward Medium"),
        (3, 0.40, "Between High and Very High, closer to High"),
        (3, -0.40, "Between Medium and High, closer to High"),
        (3, -0.50, "Between Medium and High"),
    ],
)
def test_interpret_two_tuple_result_thresholds(
    label_index: int,
    alpha: float,
    expected: str,
) -> None:
    assert interpret_two_tuple_result(
        TwoTuple(label_index=label_index, alpha=alpha),
        labels=LABELS,
    ) == expected


def test_interpretation_is_domain_agnostic_and_safe_at_endpoints() -> None:
    custom_labels = [
        {"key": "a", "label": "Bronze", "index": 0},
        {"key": "b", "label": "Silver", "index": 1},
        {"key": "c", "label": "Gold", "index": 2},
    ]

    assert interpret_two_tuple_result(
        TwoTuple(label_index=1, alpha=0.31), labels=custom_labels
    ) == "Silver, leaning toward Gold"
    assert interpret_two_tuple_result(
        TwoTuple(label_index=1, alpha=-0.44), labels=custom_labels
    ) == "Between Bronze and Silver, closer to Silver"
    assert interpret_two_tuple_result(
        TwoTuple(label_index=0, alpha=-0.2), labels=custom_labels
    ) == "Bronze"
    assert interpret_two_tuple_result(
        TwoTuple(label_index=2, alpha=0.2), labels=custom_labels
    ) == "Gold"


def test_two_tuple_executor_emits_natural_language_result_labels() -> None:

    request = GenericModelExecutionRequest.model_validate(
        TWO_TUPLE_REQUEST_EXAMPLES["basic_linguistic_2tuple_matrix"]["value"]
    )

    response = execute_two_tuple(request)

    assert response["success"] is True
    ranked = response["data"]["rankedAlternatives"]
    assert [entry["resultLabel"] for entry in ranked] == [
        "High",
        "Between Low and Medium, closer to Medium",
    ]
    assert all("beta" not in entry["resultLabel"].lower() for entry in ranked)
    json.dumps(response, ensure_ascii=False)
