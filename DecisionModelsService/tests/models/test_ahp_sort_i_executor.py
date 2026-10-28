from copy import deepcopy
import json

import pytest
from fastapi.responses import JSONResponse

from models.ahp_sort_i.definition import MODEL_DEFINITION
from models.ahp_sort_i.examples import (
    AHPSORT_I_REQUEST_EXAMPLES,
    AHPSORT_I_RESPONSE_EXAMPLES,
)
from models.ahp_sort_i.executor import _execution_input, execute_ahp_sort_i
from models.ahp_sort_i.run import (
    run_ahp_sort_i_central_profiles,
    run_ahp_sort_i_multiple_profiles,
)
from registry.model_registry import get_model_definitions
from schemas.model_requests import GenericModelExecutionRequest
from services.model_manifest_service import _build_manifest_entry, build_model_manifest


def _request(example_name: str = "limiting_profiles") -> GenericModelExecutionRequest:
    example = AHPSORT_I_REQUEST_EXAMPLES[example_name]["value"]
    return GenericModelExecutionRequest.model_validate(deepcopy(example))


def _json_response(result):
    if isinstance(result, JSONResponse):
        return json.loads(result.body.decode("utf-8"))
    return result


def _core_result(execution_input):
    if execution_input["profileMode"] == "limiting":
        return run_ahp_sort_i_multiple_profiles(
            criteria=execution_input["criteria"],
            categories=execution_input["categories"],
            alternatives=execution_input["alternatives"],
            limiting_profiles=execution_input["profiles"],
            criterion_weights_by_id=execution_input["criterionWeightsById"],
            comparisons=execution_input["comparisons"],
            profile_comparisons=execution_input["profileComparisons"],
        )
    return run_ahp_sort_i_central_profiles(
        criteria=execution_input["criteria"],
        categories=execution_input["categories"],
        alternatives=execution_input["alternatives"],
        central_profiles=execution_input["profiles"],
        criterion_weights_by_id=execution_input["criterionWeightsById"],
        comparisons=execution_input["comparisons"],
        profile_comparisons=execution_input["profileComparisons"],
        tie_policy=execution_input["tiePolicy"],
    )


@pytest.mark.parametrize(
    "example_name", ["limiting_profiles", "central_profiles_with_tie"]
)
def test_adapter_output_matches_core_categories_assignments_and_full_precision_diagnostics(
    example_name,
):
    request = _request(example_name)
    execution_input = _execution_input(request)
    expected_core = _core_result(execution_input)
    response = _json_response(execute_ahp_sort_i(request))

    assert response["success"] is True
    result = response["data"]
    assert set(result) == {
        "categories",
        "categoryOrderSemantics",
        "assignments",
        "diagnostics",
    }
    assert result["categories"] == execution_input["resultCategories"]
    assert result["categoryOrderSemantics"] == "lower-order-is-less-preferred"
    assert result["assignments"] == [
        {
            "alternativeId": alternative["id"],
            "categoryId": expected_core["resultsByAlternative"][alternative["id"]][
                "categoryId"
            ],
        }
        for alternative in execution_input["alternatives"]
    ]
    assert result["diagnostics"]["profileMode"] == execution_input["profileMode"]
    assert result["diagnostics"]["resultsByAlternativeId"].keys() == (
        expected_core["resultsByAlternative"].keys()
    )
    for alternative_id, core_assignment in expected_core["resultsByAlternative"].items():
        diagnostics = result["diagnostics"]["resultsByAlternativeId"][alternative_id]
        assert diagnostics["globalPriority"] == core_assignment["globalPriority"]
        assert diagnostics["profileGlobalPrioritiesById"] == (
            core_assignment.get("profileGlobalPrioritiesById")
            or core_assignment.get("centralProfilePrioritiesById")
        )
        assert diagnostics["localPrioritiesByCriterion"] == core_assignment[
            "localPrioritiesByCriterion"
        ]
        assert diagnostics["weightedContributionsByCriterion"] == core_assignment[
            "weightedContributionsByCriterion"
        ]
        assert diagnostics["classification"]["rule"] == core_assignment[
            "assignmentRule"
        ]
        assert all(
            "consistency" in criterion_diagnostics
            for criterion_diagnostics in diagnostics["localPrioritiesByCriterion"].values()
        )


def test_adapter_resolves_weights_categories_and_profiles_by_ids_not_input_positions():
    execution_input = _execution_input(_request())

    assert [criterion["id"] for criterion in execution_input["criteria"]] == [
        "safety",
        "quality",
    ]
    assert execution_input["criterionWeightsById"] == {
        "quality": 0.65,
        "safety": 0.35,
    }
    assert [category["id"] for category in execution_input["categories"]] == [
        "low",
        "medium",
        "high",
    ]
    assert [profile["profileId"] for profile in execution_input["profiles"]] == [
        "boundary-medium-high",
        "boundary-low-medium",
    ]
    assert "boundaryProfiles" not in _request().modelParameters


@pytest.mark.parametrize(
    ("tie_policy", "expected_category", "expected_center"),
    [
        ("optimistic", "high", "center-high"),
        ("pessimistic", "low", "center-low"),
    ],
)
def test_central_tie_policy_is_applied_and_high_cr_remains_non_blocking(
    tie_policy, expected_category, expected_center
):
    request = _request("central_profiles_with_tie")
    request.modelParameters["ahpSortProfiles"]["tiePolicy"] = tie_policy
    response = _json_response(execute_ahp_sort_i(request))
    result = response["data"]
    diagnostics = result["diagnostics"]
    alternative = diagnostics["resultsByAlternativeId"]["supplier-midpoint"]
    criterion = alternative["localPrioritiesByCriterion"]["quality"]

    assert result["assignments"] == [
        {"alternativeId": "supplier-midpoint", "categoryId": expected_category}
    ]
    assert diagnostics["tiePolicy"] == tie_policy
    assert alternative["classification"]["tieDetected"] is True
    assert alternative["classification"]["tiedCenterProfileIds"] == [
        "center-low",
        "center-high",
    ]
    assert alternative["classification"]["selectedCenterProfileId"] == expected_center
    assert criterion["consistency"]["consistencyRatio"] > 0.10
    assert response["success"] is True


def test_multiple_expert_evaluations_are_rejected_without_selecting_or_aggregating():
    request_data = deepcopy(
        AHPSORT_I_REQUEST_EXAMPLES["limiting_profiles"]["value"]
    )
    second_evaluation = deepcopy(request_data["evaluations"][0])
    second_evaluation["expert"]["id"] = "expert-2"
    second_evaluation["payload"]["alternativeProfileComparisons"][0][
        "alternativeToProfile"
    ] = 7
    request_data["evaluations"].append(second_evaluation)
    response = _json_response(
        execute_ahp_sort_i(GenericModelExecutionRequest.model_validate(request_data))
    )

    assert response["success"] is False
    assert response["error"]["code"] == "MULTI_EXPERT_NOT_SUPPORTED"
    assert response["error"]["details"] == {"receivedEvaluationCount": 2}


def test_missing_evaluation_and_malformed_profiles_return_validation_errors():
    no_evaluation = deepcopy(AHPSORT_I_REQUEST_EXAMPLES["limiting_profiles"]["value"])
    no_evaluation["evaluations"] = []
    no_evaluation_response = _json_response(
        execute_ahp_sort_i(GenericModelExecutionRequest.model_validate(no_evaluation))
    )
    assert no_evaluation_response["success"] is False
    assert no_evaluation_response["error"]["code"] == "VALIDATION_ERROR"

    invalid_profiles = deepcopy(
        AHPSORT_I_REQUEST_EXAMPLES["limiting_profiles"]["value"]
    )
    invalid_profiles["modelParameters"]["ahpSortProfiles"]["profiles"].pop()
    invalid_response = _json_response(
        execute_ahp_sort_i(GenericModelExecutionRequest.model_validate(invalid_profiles))
    )
    assert invalid_response["success"] is False
    assert invalid_response["error"]["code"] == "VALIDATION_ERROR"
    assert "limiting_profiles are incomplete" in invalid_response["error"]["details"][
        "reason"
    ]


def test_invalid_limit_profile_order_returns_structured_model_error():
    request_data = deepcopy(
        AHPSORT_I_REQUEST_EXAMPLES["limiting_profiles"]["value"]
    )
    for comparison in request_data["evaluations"][0]["payload"]["profileComparisons"]:
        comparison["firstToSecond"] = 3

    response = _json_response(
        execute_ahp_sort_i(GenericModelExecutionRequest.model_validate(request_data))
    )

    assert response["success"] is False
    assert response["error"]["code"] == "ahpsort_i_profile_order_invalid"
    assert response["error"]["details"]["alternativeId"] == "supplier-low"
    assert response["error"]["details"]["profileIds"] == [
        "boundary-low-medium",
        "boundary-medium-high",
    ]


def test_invalid_central_profile_order_returns_central_specific_structured_error():
    request_data = deepcopy(
        AHPSORT_I_REQUEST_EXAMPLES["central_profiles_with_tie"]["value"]
    )
    request_data["evaluations"][0]["payload"]["profileComparisons"][0][
        "firstToSecond"
    ] = 9

    response = _json_response(
        execute_ahp_sort_i(GenericModelExecutionRequest.model_validate(request_data))
    )

    assert response["success"] is False
    assert response["error"]["code"] == "ahpsort_i_central_profile_order_invalid"
    assert response["error"]["details"]["alternativeId"] == "supplier-midpoint"
    assert response["error"]["details"]["profileIds"] == [
        "center-low",
        "center-high",
    ]


@pytest.mark.parametrize(
    ("example_name", "response_name"),
    [
        ("limiting_profiles", "limiting_success"),
        ("central_profiles_with_tie", "success"),
    ],
)
def test_request_and_response_examples_are_valid_and_match_execution(
    example_name, response_name
):
    request_example = AHPSORT_I_REQUEST_EXAMPLES[example_name]["value"]
    response_example = AHPSORT_I_RESPONSE_EXAMPLES[response_name]["value"]
    result = _json_response(
        execute_ahp_sort_i(GenericModelExecutionRequest.model_validate(request_example))
    )

    assert result["success"] is True
    assert result["message"] == response_example["message"]
    assert result["data"]["categories"] == response_example["data"]["categories"]
    assert result["data"]["assignments"] == response_example["data"]["assignments"]
    assert result["data"]["diagnostics"]["profileMode"] == response_example["data"][
        "diagnostics"
    ]["profileMode"]
    if response_name == "success":
        assert result["data"]["diagnostics"]["tiePolicy"] == "optimistic"


def test_model_remains_scaffold_outside_the_isolated_e2e_stack(monkeypatch):
    for key in ("NODE_ENV", "E2E_ISOLATED_STACK", "E2E_MONGO_HOST", "E2E_MONGODB_DB_NAME"):
        monkeypatch.delenv(key, raising=False)
    definitions = {model.api_model_key: model for model in get_model_definitions()}
    definition = definitions["ahp_sort_i"]
    manifest = _build_manifest_entry(definition)

    assert definition.api_model_key == MODEL_DEFINITION.api_model_key
    assert definition.model_kind == "issue"
    assert definition.evaluation_structure_key == "ahpSortAlternativeProfiles"
    assert (definition.result_structure_key, definition.result_structure_version) == (
        "sorting",
        1,
    )
    assert definition.implementation_status == "scaffold"
    assert definition.issue_execution_authorized is False
    assert definition.uses_criteria_weights is True
    assert definition.supports_consensus is False
    assert definition.supports_consensus_simulation is False
    assert manifest["publicUsable"] is False
    assert manifest["issueExecutionAuthorized"] is False
    catalog_entry = next(
        model
        for model in build_model_manifest()["models"]
        if model["apiModelKey"] == "ahp_sort_i"
    )
    assert catalog_entry["implementationStatus"] == "scaffold"
    assert catalog_entry["publicUsable"] is False
    assert catalog_entry["issueExecutionAuthorized"] is False

    from api.routers.models import router

    assert not any(
        route.path == "/ahp_sort_i" and "POST" in getattr(route, "methods", set())
        for route in router.routes
    )
