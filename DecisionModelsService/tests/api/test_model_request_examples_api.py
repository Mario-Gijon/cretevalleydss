import importlib
import io
import warnings
from collections.abc import Mapping
from contextlib import redirect_stderr, redirect_stdout
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from registry.model_registry import get_model_definitions


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
                            "API execution validation skipped."
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


def _load_fastapi_app() -> FastAPI:
    candidate_modules = (
        "DecisionModelsService.main",
        "DecisionModelsService.app",
        "DecisionModelsService.api",
        "DecisionModelsService.app.main",
        "DecisionModelsService.api.main",
        "main",
        "app",
        "api",
    )
    candidate_attrs = ("app", "application")

    for module_name in candidate_modules:
        try:
            module = importlib.import_module(module_name)
        except ImportError:
            continue

        for attr_name in candidate_attrs:
            app = getattr(module, attr_name, None)
            if isinstance(app, FastAPI):
                return app

    raise AssertionError(
        "Unable to import the FastAPI application using the standard test import patterns."
    )


def _post_example(client: TestClient, path: str, payload: dict[str, Any]) -> Any:
    captured_output = io.StringIO()
    with warnings.catch_warnings():
        warnings.filterwarnings(
            "ignore",
            message=r".*n_init.*",
            category=FutureWarning,
        )
        warnings.filterwarnings(
            "ignore",
            message=r"delta_grad == 0\.0\. Check if the approximated function is linear.*",
            category=UserWarning,
        )
        with redirect_stdout(captured_output), redirect_stderr(captured_output):
            return client.post(path, json=payload)


@pytest.fixture(scope="module")
def api_client() -> TestClient: # type: ignore
    with TestClient(_load_fastapi_app()) as client:
        yield client


@pytest.mark.parametrize(("model", "request_example"), _build_example_params())
def test_registered_model_request_examples_execute_via_api(
    api_client: TestClient,
    model: Any,
    request_example: dict[str, Any] | None,
) -> None:
    if request_example is None:  # pragma: no cover
        pytest.skip("No request example provided for this model.")

    endpoint_path = model.api_endpoint_path
    response = _post_example(api_client, endpoint_path, request_example["value"])
    expected = _get_success_response_example(model)

    assert 200 <= response.status_code < 300, (
        f"Expected a successful status code for '{_get_model_key(model)}', "
        f"got {response.status_code}."
    )

    body = response.json()
    assert body.get("success") is True
    assert isinstance(body.get("data"), dict), "API response data should be a dict."

    if "message" in expected:
        assert body.get("message") == expected["message"]


def test_registered_ready_models_expose_request_examples_for_api() -> None:
    models_without_examples = [
        _get_model_key(model)
        for model in _load_models()
        if not _get_request_examples(model)
    ]

    assert not models_without_examples, (
        "Registered ready models must expose at least one request example for API coverage. "
        "Missing examples for: " + ", ".join(sorted(models_without_examples))
    )
