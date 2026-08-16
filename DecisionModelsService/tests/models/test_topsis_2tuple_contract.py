from models.topsis_2tuple.definition import MODEL_DEFINITION
from models.topsis_2tuple.examples import (
    TOPSIS_2TUPLE_REQUEST_EXAMPLES,
    TOPSIS_2TUPLE_RESPONSE_EXAMPLES,
)
from registry.model_registry import (
    get_model_definitions,
)
from services.model_manifest_service import (
    build_model_manifest,
)


def test_topsis_2tuple_definition_is_ready() -> None:
    assert MODEL_DEFINITION.api_model_key == (
        "topsis_2tuple"
    )

    assert MODEL_DEFINITION.api_endpoint_path == (
        "/topsis_2tuple"
    )

    assert MODEL_DEFINITION.implementation_status == (
        "ready"
    )

    assert MODEL_DEFINITION.model_kind == "issue"

    assert (
        MODEL_DEFINITION.evaluation_structure_key
        == "alternativeCriteriaMatrix"
    )

    assert MODEL_DEFINITION.is_multi_criteria is True
    assert MODEL_DEFINITION.uses_criteria_weights is True
    assert MODEL_DEFINITION.uses_expert_weights is True
    assert MODEL_DEFINITION.uses_fuzzy_criteria_weights is False
    assert MODEL_DEFINITION.uses_criterion_types is True

    assert MODEL_DEFINITION.supported_expression_domains == [
        {
            "typeKey": "linguistic2Tuple",
            "constraints": {},
        }
    ]


def test_topsis_2tuple_has_real_api_examples() -> None:
    request_example = (
        TOPSIS_2TUPLE_REQUEST_EXAMPLES[
            "basic_linguistic_2tuple_matrix"
        ]["value"]
    )

    response_example = (
        TOPSIS_2TUPLE_RESPONSE_EXAMPLES[
            "success"
        ]["value"]
    )

    assert request_example["evaluations"]
    assert request_example["context"]["alternatives"]
    assert request_example["context"]["criteria"]

    assert response_example["success"] is True
    assert response_example["data"][
        "rankedAlternatives"
    ]
    assert response_example["data"][
        "collectiveEvaluations"
    ]


def test_topsis_2tuple_is_discovered_by_registry() -> None:
    definitions = get_model_definitions(
        strict=True
    )

    matching = [
        definition
        for definition in definitions
        if definition.api_model_key
        == "topsis_2tuple"
    ]

    assert len(matching) == 1

    assert matching[0].api_endpoint_path == (
        "/topsis_2tuple"
    )


def test_topsis_2tuple_manifest_entry_is_publicly_usable() -> None:
    manifest = build_model_manifest()

    matching = [
        model
        for model in manifest["models"]
        if model["apiModelKey"]
        == "topsis_2tuple"
    ]

    assert len(matching) == 1

    entry = matching[0]

    assert entry["implementationStatus"] == (
        "ready"
    )

    assert entry["publicUsable"] is True

    assert entry["apiEndpoint"] == {
        "method": "POST",
        "path": "/topsis_2tuple",
    }

    assert entry[
        "evaluationStructureKey"
    ] == "alternativeCriteriaMatrix"

    assert entry["usesCriteriaWeights"] is True
    assert entry["usesExpertWeights"] is True
    assert entry["usesCriterionTypes"] is True

    assert entry[
        "supportedExpressionDomains"
    ] == [
        {
            "typeKey": "linguistic2Tuple",
            "constraints": {},
        }
    ]

    assert entry["request"]["example"] is not None
    assert entry["response"]["example"] is not None