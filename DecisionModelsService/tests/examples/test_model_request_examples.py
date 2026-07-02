import asyncio
import inspect
import io
import json
import math
import numbers
import warnings
from collections.abc import Mapping, Sequence
from contextlib import redirect_stderr, redirect_stdout
from typing import Any

import pytest
from starlette.responses import JSONResponse

from registry.model_registry import get_model_definitions


REL_TOLERANCE = 1e-6
ABS_TOLERANCE = 1e-8


def _load_models() -> list[Any]:
    models = get_model_definitions(strict=True)
    if isinstance(models, Mapping):
        return list(models.values())
    return list(models)


def _get_model_key(model: Any) -> str:
    return getattr(model, "api_model_key", getattr(model, "key", model.__class__.__name__))


def _get_request_examples(model: Any) -> list[dict[str, Any]]:
    request_examples = getattr(model, "request_examples", None) or []
    if isinstance(request_examples, Mapping):
        return list(request_examples.values())
    return list(request_examples)


def _get_success_response_example(model: Any) -> dict[str, Any]:
    response_examples = getattr(model, "response_examples", None) or {}
    return response_examples["success"]["value"]


def _make_param_id(model: Any, example: dict[str, Any] | None, index: int) -> str:
    model_key = _get_model_key(model)
    if example is None:
        return f"{model_key}-no-examples"

    raw_label = (
        example.get("summary")
        or example.get("title")
        or example.get("name")
        or f"example-{index}"
    )
    safe_label = "".join(char if char.isalnum() else "-" for char in str(raw_label)).strip("-")
    return f"{model_key}-{safe_label or f'example-{index}'}"


def _build_example_params() -> list[Any]:
    params = []
    for model in _load_models():
        model_key = _get_model_key(model)
        request_examples = _get_request_examples(model)
        if not request_examples:
            params.append(
                pytest.param(
                    model,
                    None,
                    id=_make_param_id(model, None, 0),
                    marks=pytest.mark.skip(
                        reason=(
                            f"Model '{model_key}' has no request examples; "
                            "realistic execution validation skipped."
                        )
                    ),
                )
            )
            continue

        for index, example in enumerate(request_examples):
            params.append(
                pytest.param(
                    model,
                    example,
                    id=_make_param_id(model, example, index),
                )
            )
    return params


def _is_sequence_like(value: Any) -> bool:
    return isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray))


def _is_numeric(value: Any) -> bool:
    return isinstance(value, numbers.Real) and not isinstance(value, bool)


def _assert_recursive_close(expected: Any, actual: Any, path: str) -> None:
    if isinstance(expected, Mapping):
        assert isinstance(actual, Mapping), f"{path} should be a mapping."
        for key, expected_value in expected.items():
            assert key in actual, f"Missing key at {path}.{key}"
            _assert_recursive_close(expected_value, actual[key], f"{path}.{key}")
        return

    if _is_sequence_like(expected):
        assert _is_sequence_like(actual), f"{path} should be a sequence."
        assert len(actual) == len(expected), f"{path} length mismatch."
        for index, expected_value in enumerate(expected):
            _assert_recursive_close(expected_value, actual[index], f"{path}[{index}]")
        return

    if _is_numeric(expected) and _is_numeric(actual):
        assert actual == pytest.approx(expected, rel=REL_TOLERANCE, abs=ABS_TOLERANCE), (
            f"{path} differs from expected."
        )
        return

    assert actual == expected, f"{path} differs from expected."


def _assert_ranked_alternatives(
    expected: list[dict[str, Any]],
    actual: list[dict[str, Any]],
) -> None:
    assert isinstance(actual, list), "data.rankedAlternatives should be a list."
    assert len(actual) == len(expected), "data.rankedAlternatives length mismatch."

    for index, expected_item in enumerate(expected):
        actual_item = actual[index]
        assert isinstance(actual_item, Mapping), (
            f"data.rankedAlternatives[{index}] should be a mapping."
        )

        for exact_field in ("id", "name", "rank"):
            if exact_field in expected_item:
                assert actual_item.get(exact_field) == expected_item[exact_field], (
                    f"data.rankedAlternatives[{index}].{exact_field} differs from expected."
                )

        for field, expected_value in expected_item.items():
            if field in {"id", "name", "rank"}:
                continue
            assert field in actual_item, (
                f"Missing field data.rankedAlternatives[{index}].{field}"
            )
            _assert_recursive_close(
                expected_value,
                actual_item[field],
                f"data.rankedAlternatives[{index}].{field}",
            )


def _assert_finite_numeric_structure(actual: Any, path: str) -> None:
    if isinstance(actual, Mapping):
        for key, value in actual.items():
            _assert_finite_numeric_structure(value, f"{path}.{key}")
        return

    if _is_sequence_like(actual):
        for index, value in enumerate(actual):
            _assert_finite_numeric_structure(value, f"{path}[{index}]")
        return

    assert _is_numeric(actual), f"{path} should contain numeric values."
    assert math.isfinite(actual), f"{path} should be a finite number."


def _assert_promethee_vi_ranked_alternatives(
    expected: list[dict[str, Any]],
    actual: list[dict[str, Any]],
) -> None:
    assert isinstance(actual, list), "data.rankedAlternatives should be a list."
    assert len(actual) == len(expected), "data.rankedAlternatives length mismatch."

    for index, expected_item in enumerate(expected):
        actual_item = actual[index]
        assert isinstance(actual_item, Mapping), (
            f"data.rankedAlternatives[{index}] should be a mapping."
        )

        for exact_field in ("alternativeId", "id", "name", "rank"):
            if exact_field in expected_item:
                assert actual_item.get(exact_field) == expected_item[exact_field], (
                    f"data.rankedAlternatives[{index}].{exact_field} differs from expected."
                )

        assert "score" in actual_item, f"Missing field data.rankedAlternatives[{index}].score"
        _assert_finite_numeric_structure(
            actual_item["score"],
            f"data.rankedAlternatives[{index}].score",
        )

        for field, expected_value in expected_item.items():
            if field in {"alternativeId", "id", "name", "rank", "score"}:
                continue
            assert field in actual_item, (
                f"Missing field data.rankedAlternatives[{index}].{field}"
            )
            _assert_recursive_close(
                expected_value,
                actual_item[field],
                f"data.rankedAlternatives[{index}].{field}",
            )


def _assert_plot_like_shape(actual: Any, expected: Any, path: str) -> None:
    assert isinstance(actual, Mapping), f"{path} should be a mapping."
    if isinstance(expected, Mapping):
        missing_keys = set(expected.keys()) - set(actual.keys())
        assert not missing_keys, f"{path} is missing expected top-level keys: {missing_keys}"


def _assert_same_shape(expected: Any, actual: Any, path: str) -> None:
    if isinstance(expected, Mapping):
        assert isinstance(actual, Mapping), f"{path} should be a mapping."
        assert set(actual.keys()) == set(expected.keys()), f"{path} keys differ from expected."
        for key, expected_value in expected.items():
            _assert_same_shape(expected_value, actual[key], f"{path}.{key}")
        return

    if _is_sequence_like(expected):
        assert _is_sequence_like(actual), f"{path} should be a sequence."
        assert len(actual) == len(expected), f"{path} length mismatch."
        for index, expected_value in enumerate(expected):
            _assert_same_shape(expected_value, actual[index], f"{path}[{index}]")
        return


async def _call_handler(handler: Any, payload: Any) -> Any:
    result = handler(payload)
    if inspect.isawaitable(result):
        return await result
    return result


def _parse_handler_result(result: Any) -> dict[str, Any]:
    if isinstance(result, JSONResponse):
        return json.loads(result.body.decode("utf-8"))
    if hasattr(result, "model_dump"):
        return result.model_dump()
    return result


def _execute_example(model: Any, payload: Any) -> dict[str, Any]:
    captured_output = io.StringIO()
    with warnings.catch_warnings():
        warnings.filterwarnings(
            "ignore",
            message=r".*n_init.*",
            category=FutureWarning,
            module=r"sklearn\.manifold\._mds",
        )
        warnings.filterwarnings(
            "ignore",
            message=r"delta_grad == 0\.0\. Check if the approximated function is linear.*",
            category=UserWarning,
        )
        with redirect_stdout(captured_output), redirect_stderr(captured_output):
            result = asyncio.run(_call_handler(model.handler, payload))
    parsed_result = _parse_handler_result(result)
    assert isinstance(parsed_result, dict), "Handler result should be a dict-like JSON payload."
    return parsed_result


@pytest.mark.parametrize(("model", "request_example"), _build_example_params())
def test_registered_model_request_examples_execute_successfully(
    model: Any,
    request_example: dict[str, Any] | None,
) -> None:
    if request_example is None:  # pragma: no cover
        pytest.skip("No request example provided for this model.")

    payload = model.request_model.model_validate(request_example["value"])
    result = _execute_example(model, payload)
    expected = _get_success_response_example(model)
    model_key = _get_model_key(model)
    is_promethee_vi = model_key == "promethee_vi"

    assert result.get("success") is True
    assert isinstance(result.get("data"), dict), "Execution result data should be a dict."

    if "message" in expected:
        assert result.get("message") == expected["message"]

    assert result["success"] == expected["success"]

    expected_data = expected.get("data", {})
    actual_data = result["data"]

    if "rankedAlternatives" in expected_data:
        if is_promethee_vi:
            _assert_promethee_vi_ranked_alternatives(
                expected_data["rankedAlternatives"],
                actual_data.get("rankedAlternatives"),
            )
        else:
            _assert_ranked_alternatives(
                expected_data["rankedAlternatives"],
                actual_data.get("rankedAlternatives"),
            )

    if "collectiveEvaluations" in expected_data:
        _assert_recursive_close(
            expected_data["collectiveEvaluations"],
            actual_data.get("collectiveEvaluations"),
            "data.collectiveEvaluations",
        )

    if "consensusMeasure" in expected_data:
        _assert_recursive_close(
            expected_data["consensusMeasure"],
            actual_data.get("consensusMeasure"),
            "data.consensusMeasure",
        )

    if "weightsByCriterion" in expected_data:
        _assert_recursive_close(
            expected_data["weightsByCriterion"],
            actual_data.get("weightsByCriterion"),
            "data.weightsByCriterion",
        )

    if "rawOutput" in expected_data:
        expected_raw_output = expected_data["rawOutput"]
        actual_raw_output = actual_data.get("rawOutput")
        assert isinstance(actual_raw_output, Mapping), "data.rawOutput should be a mapping."

        for key, expected_value in expected_raw_output.items():
            if key == "plots_graphic":
                _assert_plot_like_shape(
                    actual_raw_output.get(key),
                    expected_value,
                    "data.rawOutput.plots_graphic",
                )
                continue

            if is_promethee_vi and key in {"minus_ranking", "favorable_ranking", "plus_ranking"}:
                assert key in actual_raw_output, f"Missing key at data.rawOutput.{key}"
                _assert_same_shape(
                    expected_value,
                    actual_raw_output[key],
                    f"data.rawOutput.{key}",
                )
                _assert_finite_numeric_structure(
                    actual_raw_output[key],
                    f"data.rawOutput.{key}",
                )
                continue

            assert key in actual_raw_output, f"Missing key at data.rawOutput.{key}"
            _assert_recursive_close(
                expected_value,
                actual_raw_output[key],
                f"data.rawOutput.{key}",
            )

    if "plotsGraphic" in actual_data or "plotsGraphic" in expected_data:
        _assert_plot_like_shape(
            actual_data.get("plotsGraphic"),
            expected_data.get("plotsGraphic"),
            "data.plotsGraphic",
        )


def test_registered_ready_models_expose_request_examples() -> None:
    models_without_examples = [
        _get_model_key(model)
        for model in _load_models()
        if not _get_request_examples(model)
    ]

    assert not models_without_examples, (
        "Registered ready models must expose at least one request example. Missing examples for: "
        + ", ".join(sorted(models_without_examples))
    )
