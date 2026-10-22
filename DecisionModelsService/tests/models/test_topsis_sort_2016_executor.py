from copy import deepcopy
import json

from fastapi.responses import JSONResponse

from models.topsis_sort_2016.definition import MODEL_DEFINITION
from models.topsis_sort_2016.examples import (
    TOPSIS_SORT_2016_REQUEST_EXAMPLES,
    TOPSIS_SORT_2016_RESPONSE_EXAMPLES,
)
from models.topsis_sort_2016.executor import _input, execute_topsis_sort_2016
from registry.model_registry import get_model_definitions
from schemas.model_requests import GenericModelExecutionRequest
from services.model_manifest_service import _build_manifest_entry


def _request(payload=None):
    if payload is None:
        payload = TOPSIS_SORT_2016_REQUEST_EXAMPLES[
            "numeric_benefit_cost_sorting"
        ]["value"]
    return GenericModelExecutionRequest.model_validate(payload)


def _json(result):
    if isinstance(result, JSONResponse):
        return json.loads(result.body.decode("utf-8"))
    return result


def test_ready_plugin_is_auto_discovered_with_sorting_metadata_and_authorized():
    definitions = {model.api_model_key: model for model in get_model_definitions()}
    discovered = definitions["topsis_sort_2016"]
    manifest = _build_manifest_entry(discovered)

    assert discovered.api_model_key == MODEL_DEFINITION.api_model_key
    assert discovered.display_name == "TOPSIS-SORT"
    assert discovered.model_kind == "issue"
    assert discovered.evaluation_structure_key == "alternativeCriteriaMatrix"
    assert (discovered.result_structure_key, discovered.result_structure_version) == (
        "sorting",
        1,
    )
    assert discovered.implementation_status == "ready"
    assert discovered.issue_execution_authorized is True
    assert manifest["publicUsable"] is True
    assert manifest["issueExecutionAuthorized"] is True
    assert manifest["resultStructureKey"] == "sorting"
    assert manifest["resultStructureVersion"] == 1
    assert {parameter["parameterStructureKey"] for parameter in discovered.parameters} == {
        "orderedCategories",
        "boundaryProfiles",
    }
    assert discovered.supports_consensus is False
    assert discovered.supports_consensus_simulation is False


def test_internal_adapter_resolves_ids_and_parameters_and_averages_experts():
    payload = deepcopy(
        TOPSIS_SORT_2016_REQUEST_EXAMPLES["numeric_benefit_cost_sorting"]["value"]
    )
    # Reverse criterion order to prove that values and weights are resolved by ID.
    payload["context"]["criteria"].reverse()
    payload["evaluations"].append(
        {
            "expert": {"id": "expert-2"},
            "payload": {
                "alt-a": {"quality": 6.0, "cost": 8.0},
                "alt-b": {"quality": 8.0, "cost": 5.0},
                "alt-c": {"quality": 5.0, "cost": 6.0},
            },
        }
    )

    execution_input = _input(_request(payload))

    assert [criterion["criterion_id"] for criterion in execution_input["criteria"]] == [
        "cost",
        "quality",
    ]
    assert [criterion["weight"] for criterion in execution_input["criteria"]] == [
        0.35,
        0.65,
    ]
    assert execution_input["alternatives"][0] == {
        "alternative_id": "alt-a",
        "values_by_criterion_id": {"cost": 7.0, "quality": 7.0},
    }
    assert execution_input["categories"][1] == {
        "category_id": "middle",
        "label": "Middle",
        "order": 1,
    }
    assert execution_input["profiles"][0] == {
        "profile_id": "profile-mid",
        "category_id": "middle",
        "values_by_criterion_id": {"quality": 4.0, "cost": 7.0},
    }


def test_internal_adapter_transforms_result_to_sorting_v1_without_ranking_fields():
    response = _json(execute_topsis_sort_2016(_request()))

    assert response["success"] is True
    assert response["message"] == "TOPSIS-Sort 2016 executed successfully"
    data = response["data"]
    assert set(data) == {
        "categories",
        "categoryOrderSemantics",
        "assignments",
        "diagnostics",
    }
    assert data["categoryOrderSemantics"] == "lower-order-is-less-preferred"
    assert [category["categoryId"] for category in data["categories"]] == [
        "low",
        "middle",
        "high",
    ]
    assert data["assignments"] == [
        {"alternativeId": "alt-a", "categoryId": "high"},
        {"alternativeId": "alt-b", "categoryId": "middle"},
        {"alternativeId": "alt-c", "categoryId": "low"},
    ]

    def assert_no_ranking_fields(value):
        if isinstance(value, dict):
            assert "rankedAlternatives" not in value
            assert "rank" not in value
            assert "score" not in value
            for nested in value.values():
                assert_no_ranking_fields(nested)
        elif isinstance(value, list):
            for nested in value:
                assert_no_ranking_fields(nested)

    assert_no_ranking_fields(data)


def test_example_response_matches_internal_execution_and_uses_only_sorting_fields():
    actual = _json(execute_topsis_sort_2016(_request()))
    expected = TOPSIS_SORT_2016_RESPONSE_EXAMPLES["success"]["value"]

    assert actual["success"] is True
    assert actual["message"] == expected["message"]
    assert {
        key: actual["data"][key] for key in expected["data"]
    } == expected["data"]
    assert "rankedAlternatives" not in expected["data"]
    assert all("rank" not in item and "score" not in item for item in expected["data"]["assignments"])


def test_adapter_rejects_invalid_domains_and_missing_sort_parameters():
    payload = deepcopy(
        TOPSIS_SORT_2016_REQUEST_EXAMPLES["numeric_benefit_cost_sorting"]["value"]
    )
    payload["context"]["criteria"][0]["expressionDomain"]["typeKey"] = "linguisticFuzzy"
    response = _json(execute_topsis_sort_2016(_request(payload)))
    assert response["success"] is False
    assert "must use numericContinuous or numericDiscrete" in response["message"]

    payload = deepcopy(
        TOPSIS_SORT_2016_REQUEST_EXAMPLES["numeric_benefit_cost_sorting"]["value"]
    )
    payload["modelParameters"].pop("boundaryProfiles")
    response = _json(execute_topsis_sort_2016(_request(payload)))
    assert response["success"] is False
    assert "modelParameters.boundaryProfiles" in response["message"]

    payload = deepcopy(
        TOPSIS_SORT_2016_REQUEST_EXAMPLES["numeric_benefit_cost_sorting"]["value"]
    )
    payload["modelParameters"].pop("orderedCategories")
    response = _json(execute_topsis_sort_2016(_request(payload)))
    assert response["success"] is False
    assert "modelParameters.orderedCategories" in response["message"]


def test_adapter_rejects_evaluations_outside_the_declared_numeric_domain():
    payload = deepcopy(
        TOPSIS_SORT_2016_REQUEST_EXAMPLES["numeric_benefit_cost_sorting"]["value"]
    )
    payload["evaluations"][0]["payload"]["alt-a"]["quality"] = 11.0

    response = _json(execute_topsis_sort_2016(_request(payload)))

    assert response["success"] is False
    assert "within numeric domain [0.0, 10.0]" in response["message"]


def test_adapter_rejects_boundary_profiles_outside_criterion_domains():
    payload = deepcopy(
        TOPSIS_SORT_2016_REQUEST_EXAMPLES["numeric_benefit_cost_sorting"]["value"]
    )
    payload["modelParameters"]["boundaryProfiles"]["profiles"][0][
        "valuesByCriterionId"
    ]["quality"] = 11.0

    response = _json(execute_topsis_sort_2016(_request(payload)))

    assert response["success"] is False
    assert "must be within numeric domain [0.0, 10.0]" in response["message"]
