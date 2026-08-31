import json

from models.two_tuple.examples import TWO_TUPLE_REQUEST_EXAMPLES
from models.two_tuple.executor import _format_alpha, execute_two_tuple
from schemas.model_requests import GenericModelExecutionRequest


def test_two_tuple_executor_emits_human_readable_result_labels() -> None:
    assert _format_alpha(0.0) == "0"
    assert _format_alpha(-0.000001) == "0"

    request = GenericModelExecutionRequest.model_validate(
        TWO_TUPLE_REQUEST_EXAMPLES["basic_linguistic_2tuple_matrix"]["value"]
    )

    response = execute_two_tuple(request)

    assert response["success"] is True
    ranked = response["data"]["rankedAlternatives"]
    assert [entry["resultLabel"] for entry in ranked] == [
        "High (α = 0.025)",
        "Medium (α = -0.425)",
    ]
    assert all("beta" not in entry["resultLabel"].lower() for entry in ranked)
    json.dumps(response, ensure_ascii=False)
