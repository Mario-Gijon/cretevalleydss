import pytest

from services import model_manifest_service
from services.model_manifest_service import (
    _build_manifest_entry,
    _build_parameters,
    _build_supported_domains,
    _get_request_example,
    _get_response_example,
    build_model_manifest,
)


def test_supported_domain_normalization():
    supported_domains = _build_supported_domains(
        [" numericcontinuous ", "NUMERICDISCRETE", "Linguistic", ""]
    )

    assert supported_domains == {
        "numeric": {
            "continuous": True,
            "discrete": True,
        },
        "linguistic": ["triangular"],
    }


def test_parameter_scope_defaults_to_global(model_definition_factory):
    model = model_definition_factory(
        parameters=[
            {
                "key": "alpha",
                "label": "Alpha",
            }
        ]
    )

    parameters = _build_parameters(model)

    assert parameters == [{"key": "alpha", "label": "Alpha", "scope": "global"}]


def test_existing_parameter_scope_is_preserved(model_definition_factory):
    model = model_definition_factory(
        parameters=[
            {
                "key": "beta",
                "label": "Beta",
                "scope": "perCriterion",
            }
        ]
    )

    parameters = _build_parameters(model)

    assert parameters == [{"key": "beta", "label": "Beta", "scope": "perCriterion"}]


def test_request_example_extraction_returns_first_valid_request_example_value(
    model_definition_factory,
):
    model = model_definition_factory(
        request_examples={
            "first": {
                "summary": "First",
                "value": {"foo": "bar"},
            },
            "second": {
                "summary": "Second",
                "value": {"baz": "qux"},
            },
        }
    )

    assert _get_request_example(model) == {"foo": "bar"}


@pytest.mark.parametrize(
    "request_examples",
    [
        {},
        {"bad": []},
        {"bad": {"value": "not-a-dict"}},
    ],
)
def test_request_example_extraction_returns_none_for_missing_or_malformed_examples(
    model_definition_factory,
    request_examples,
):
    model = model_definition_factory(request_examples=request_examples)

    assert _get_request_example(model) is None


def test_response_example_extraction_returns_success_value(model_definition_factory):
    model = model_definition_factory(
        response_examples={
            "success": {
                "summary": "ok",
                "value": {"success": True},
            }
        }
    )

    assert _get_response_example(model) == {"success": True}


@pytest.mark.parametrize(
    "response_examples",
    [
        {},
        {"success": []},
        {"success": {"value": "not-a-dict"}},
    ],
)
def test_response_example_extraction_returns_none_if_missing_or_malformed(
    model_definition_factory,
    response_examples,
):
    model = model_definition_factory(response_examples=response_examples)

    assert _get_response_example(model) is None


def test_manifest_entry_includes_stable_public_fields(model_definition_factory):
    model = model_definition_factory(
        api_model_key="alpha",
        api_endpoint_path="/alpha",
        display_name="Alpha",
        model_kind="issue",
        evaluation_structure_key="alternativeCriteriaMatrix",
        implementation_status="ready",
        supports_consensus=True,
        supports_consensus_simulation=True,
        uses_criteria_weights=True,
        uses_expert_weights=True,
        supported_domains=["numericContinuous", "linguistic"],
        parameters=[{"key": "lambda", "label": "Lambda"}],
        request_examples={"sample": {"value": {"payload": 1}}},
        response_examples={"success": {"value": {"success": True}}},
    )

    manifest_entry = _build_manifest_entry(model)

    assert manifest_entry["apiModelKey"] == "alpha"
    assert manifest_entry["displayName"] == "Alpha"
    assert manifest_entry["modelKind"] == "issue"
    assert manifest_entry["evaluationStructureKey"] == "alternativeCriteriaMatrix"
    assert manifest_entry["apiEndpoint"] == {"method": "POST", "path": "/alpha"}
    assert manifest_entry["implementationStatus"] == "ready"
    assert manifest_entry["publicUsable"] is True
    assert manifest_entry["supportsConsensus"] is True
    assert manifest_entry["supportsConsensusSimulation"] is True
    assert manifest_entry["usesCriteriaWeights"] is True
    assert manifest_entry["usesExpertWeights"] is True
    assert manifest_entry["supportedDomains"] == {
        "numeric": {"continuous": True, "discrete": False},
        "linguistic": ["triangular"],
    }
    assert manifest_entry["parameters"] == [
        {"key": "lambda", "label": "Lambda", "scope": "global"}
    ]
    assert manifest_entry["request"]["example"] == {"payload": 1}
    assert manifest_entry["response"]["example"] == {"success": True}


def test_scaffold_implementation_status_is_not_publicly_usable(model_definition_factory):
    model = model_definition_factory(implementation_status="scaffold")

    manifest_entry = _build_manifest_entry(model)

    assert manifest_entry["implementationStatus"] == "scaffold"
    assert manifest_entry["publicUsable"] is False


def test_build_model_manifest_returns_models_wrapper(monkeypatch, model_definition_factory):
    models = (
        model_definition_factory(api_model_key="alpha", api_endpoint_path="/alpha"),
        model_definition_factory(api_model_key="beta", api_endpoint_path="/beta"),
    )
    monkeypatch.setattr(model_manifest_service, "get_model_definitions", lambda strict=False: models)

    manifest = build_model_manifest()

    assert list(manifest.keys()) == ["models"]
    assert [model["apiModelKey"] for model in manifest["models"]] == ["alpha", "beta"]
