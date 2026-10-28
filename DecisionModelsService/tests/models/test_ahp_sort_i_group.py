from copy import deepcopy
import json

import pytest
from fastapi.responses import JSONResponse

from models.ahp_sort_i.examples import (
    AHPSORT_I_REQUEST_EXAMPLES,
    AHPSORT_I_RESPONSE_EXAMPLES,
)
from models.ahp_sort_i.executor import execute_ahp_sort_i
from models.ahp_sort_i.group import aggregate_category_votes
from schemas.model_requests import GenericModelExecutionRequest


CATEGORY_IDS = ["low", "medium", "high"]
CATEGORY_FOR_JUDGMENT = {"low": 1 / 9, "medium": 1, "high": 2}


def _json_response(result):
    if isinstance(result, JSONResponse):
        return json.loads(result.body.decode("utf-8"))
    return result


def _assert_no_group_ranking_or_consensus_fields(value):
    if isinstance(value, dict):
        assert not {"rank", "rankedAlternatives", "probability", "consensus"} & set(
            value
        )
        for nested in value.values():
            _assert_no_group_ranking_or_consensus_fields(nested)
    elif isinstance(value, list):
        for nested in value:
            _assert_no_group_ranking_or_consensus_fields(nested)


def _limiting_group_request(individual_categories):
    request = deepcopy(AHPSORT_I_REQUEST_EXAMPLES["limiting_profiles"]["value"])
    alternative_id = request["context"]["alternatives"][0]["id"]
    request["context"]["alternatives"] = [request["context"]["alternatives"][0]]
    base_evaluation = request["evaluations"][0]
    base_evaluation["payload"]["alternativeProfileComparisons"] = [
        comparison
        for comparison in base_evaluation["payload"]["alternativeProfileComparisons"]
        if comparison["alternativeId"] == alternative_id
    ]

    evaluations = []
    for index, category_id in enumerate(individual_categories, start=1):
        evaluation = deepcopy(base_evaluation)
        evaluation["expert"] = {
            "id": f"expert-{index}",
            "name": f"Expert {index}",
        }
        for comparison in evaluation["payload"]["alternativeProfileComparisons"]:
            comparison["alternativeToProfile"] = CATEGORY_FOR_JUDGMENT[category_id]
        evaluations.append(evaluation)

    request["evaluations"] = evaluations
    request["modelParameters"]["ahpSortGroup"] = {"tiePolicy": "optimistic"}
    return request


def _execute_group(individual_categories, tie_policy="optimistic"):
    request = _limiting_group_request(individual_categories)
    request["modelParameters"]["ahpSortGroup"]["tiePolicy"] = tie_policy
    return _json_response(
        execute_ahp_sort_i(GenericModelExecutionRequest.model_validate(request))
    )


@pytest.mark.parametrize(
    ("individual_categories", "tie_policy", "selected", "status", "tied"),
    [
        (["low", "low"], "optimistic", "low", "unanimous", []),
        (["medium", "medium", "medium"], "pessimistic", "medium", "unanimous", []),
        (["high", "high", "low"], "optimistic", "high", "unique_plurality", []),
        (
            ["high", "high", "low", "medium"],
            "pessimistic",
            "high",
            "unique_plurality",
            [],
        ),
        (
            ["low", "medium", "high"],
            "optimistic",
            "high",
            "tied_plurality",
            ["low", "medium", "high"],
        ),
        (["low", "high"], "optimistic", "high", "tied_plurality", ["low", "high"]),
        (["low", "high"], "pessimistic", "low", "tied_plurality", ["low", "high"]),
    ],
)
def test_limiting_group_vote_patterns_and_tie_policies(
    individual_categories, tie_policy, selected, status, tied
):
    response = _execute_group(individual_categories, tie_policy)

    assert response["success"] is True
    result = response["data"]
    assert set(result) == {
        "categories",
        "categoryOrderSemantics",
        "assignments",
        "diagnostics",
    }
    assert result["assignments"] == [
        {"alternativeId": "supplier-low", "categoryId": selected}
    ]
    assert result["diagnostics"]["aggregationMethod"] == "unweighted_plurality_vote"
    assert result["diagnostics"]["groupTiePolicy"] == tie_policy
    alternative_diagnostics = result["diagnostics"]["resultsByAlternativeId"][
        "supplier-low"
    ]
    expected_counts = {
        category_id: individual_categories.count(category_id)
        for category_id in CATEGORY_IDS
    }
    assert alternative_diagnostics["votesByCategoryId"] == expected_counts
    assert alternative_diagnostics["selectedCategoryId"] == selected
    assert alternative_diagnostics["aggregationStatus"] == status
    assert alternative_diagnostics["isUnanimous"] is (status == "unanimous")
    assert alternative_diagnostics["isUniquePlurality"] is (status != "tied_plurality")
    assert alternative_diagnostics["tieDetected"] is (status == "tied_plurality")
    assert alternative_diagnostics["tiedCategoryIds"] == tied
    assert alternative_diagnostics["classificationsByExpertId"] == {
        f"expert-{index}": category_id
        for index, category_id in enumerate(individual_categories, start=1)
    }
    _assert_no_group_ranking_or_consensus_fields(result)


def test_plurality_winner_is_allowed_without_an_absolute_majority():
    categories = [
        {"categoryId": category_id, "order": index}
        for index, category_id in enumerate(["low", "mid", "upper", "high"])
    ]
    assignments, diagnostics = aggregate_category_votes(
        categories=categories,
        alternatives=[{"id": "a1", "name": "Alternative"}],
        category_by_expert_and_alternative={
            "e1": {"a1": "mid"},
            "e2": {"a1": "mid"},
            "e3": {"a1": "low"},
            "e4": {"a1": "upper"},
            "e5": {"a1": "high"},
        },
        tie_policy="pessimistic",
    )

    assert assignments == [{"alternativeId": "a1", "categoryId": "mid"}]
    assert diagnostics["a1"]["votesByCategoryId"] == {
        "low": 1,
        "mid": 2,
        "upper": 1,
        "high": 1,
    }
    assert diagnostics["a1"]["isUniquePlurality"] is True
    assert diagnostics["a1"]["tieDetected"] is False


def test_one_expert_output_keeps_the_existing_sorting_v1_projection():
    request = deepcopy(AHPSORT_I_REQUEST_EXAMPLES["limiting_profiles"]["value"])
    response = _json_response(
        execute_ahp_sort_i(GenericModelExecutionRequest.model_validate(request))
    )

    expected = AHPSORT_I_RESPONSE_EXAMPLES["limiting_success"]["value"]
    assert response["success"] is True
    assert response["message"] == expected["message"]
    result = response["data"]
    assert set(result) == {
        "categories",
        "categoryOrderSemantics",
        "assignments",
        "diagnostics",
    }
    assert result["categories"] == expected["data"]["categories"]
    assert result["assignments"] == expected["data"]["assignments"]
    assert result["categoryOrderSemantics"] == "lower-order-is-less-preferred"
    assert set(result["diagnostics"]) == {
        "modelKey",
        "profileMode",
        "resultsByAlternativeId",
    }
    for alternative_diagnostics in result["diagnostics"][
        "resultsByAlternativeId"
    ].values():
        assert set(alternative_diagnostics) == {
            "categoryId",
            "globalPriority",
            "profileGlobalPrioritiesById",
            "weightsByCriterion",
            "weightedContributionsByCriterion",
            "localPrioritiesByCriterion",
            "classification",
        }


def test_single_expert_ignores_optional_group_policy_for_backward_compatibility():
    request = deepcopy(AHPSORT_I_REQUEST_EXAMPLES["limiting_profiles"]["value"])
    request["modelParameters"]["ahpSortGroup"] = {"tiePolicy": "pessimistic"}
    response = _json_response(
        execute_ahp_sort_i(GenericModelExecutionRequest.model_validate(request))
    )

    assert response["success"] is True
    assert set(response["data"]["diagnostics"]) == {
        "modelKey",
        "profileMode",
        "resultsByAlternativeId",
    }


def test_central_profile_tie_policy_is_independent_from_group_policy():
    request = deepcopy(
        AHPSORT_I_REQUEST_EXAMPLES["central_profiles_with_tie"]["value"]
    )
    second = deepcopy(request["evaluations"][0])
    second["expert"]["id"] = "expert-2"
    request["evaluations"].append(second)
    request["modelParameters"]["ahpSortGroup"] = {"tiePolicy": "pessimistic"}

    response = _json_response(
        execute_ahp_sort_i(GenericModelExecutionRequest.model_validate(request))
    )

    assert response["success"] is True
    diagnostics = response["data"]["diagnostics"]
    assert diagnostics["groupTiePolicy"] == "pessimistic"
    assert diagnostics["profileTiePolicy"] == "optimistic"
    for expert_diagnostics in diagnostics["individualResultsByExpertId"].values():
        assert expert_diagnostics["tiePolicy"] == "optimistic"
        local = expert_diagnostics["resultsByAlternativeId"]["supplier-midpoint"]
        assert local["classification"]["tiePolicy"] == "optimistic"


def test_group_keeps_individual_multi_criterion_weights_and_consistency_diagnostics():
    response = _execute_group(["low", "high"])

    assert response["success"] is True
    individual_results = response["data"]["diagnostics"]["individualResultsByExpertId"]
    for expert_diagnostics in individual_results.values():
        alternative = expert_diagnostics["resultsByAlternativeId"]["supplier-low"]
        assert alternative["weightsByCriterion"] == {
            "quality": 0.65,
            "safety": 0.35,
        }
        assert set(alternative["localPrioritiesByCriterion"]) == {"quality", "safety"}
        assert all(
            "consistencyRatio" in criterion["consistency"]
            for criterion in alternative["localPrioritiesByCriterion"].values()
        )


def test_group_result_is_invariant_to_expert_and_comparison_record_order():
    request = _limiting_group_request(["low", "high", "high"])
    baseline = _json_response(
        execute_ahp_sort_i(GenericModelExecutionRequest.model_validate(request))
    )
    request["evaluations"].reverse()
    for evaluation in request["evaluations"]:
        evaluation["payload"]["alternativeProfileComparisons"].reverse()
        evaluation["payload"]["profileComparisons"].reverse()
    reversed_response = _json_response(
        execute_ahp_sort_i(GenericModelExecutionRequest.model_validate(request))
    )

    assert baseline == reversed_response


@pytest.mark.parametrize(
    "mutation",
    [
        "missing_expert",
        "duplicate_expert",
        "missing_payload_field",
        "incomplete_comparisons",
        "duplicate_comparison",
        "unknown_comparison_id",
        "invalid_saaty_judgment",
        "invalid_profile_order",
        "missing_group_policy",
        "invalid_group_policy",
    ],
)
def test_invalid_multi_expert_inputs_fail_without_partial_aggregation(mutation):
    request = _limiting_group_request(["low", "high"])
    if mutation == "missing_expert":
        request["evaluations"][1]["expert"].pop("id")
    elif mutation == "duplicate_expert":
        request["evaluations"][1]["expert"]["id"] = request["evaluations"][0][
            "expert"
        ]["id"]
    elif mutation == "missing_payload_field":
        request["evaluations"][1]["payload"].pop("profileComparisons")
    elif mutation == "incomplete_comparisons":
        request["evaluations"][1]["payload"]["alternativeProfileComparisons"].pop()
    elif mutation == "duplicate_comparison":
        comparisons = request["evaluations"][1]["payload"][
            "alternativeProfileComparisons"
        ]
        comparisons.append(deepcopy(comparisons[0]))
    elif mutation == "unknown_comparison_id":
        request["evaluations"][1]["payload"]["alternativeProfileComparisons"][0][
            "criterionId"
        ] = "unknown-criterion"
    elif mutation == "invalid_saaty_judgment":
        request["evaluations"][1]["payload"]["alternativeProfileComparisons"][0][
            "alternativeToProfile"
        ] = 10
    elif mutation == "invalid_profile_order":
        for comparison in request["evaluations"][1]["payload"]["profileComparisons"]:
            comparison["firstToSecond"] = 3
    elif mutation == "missing_group_policy":
        request["modelParameters"].pop("ahpSortGroup")
    elif mutation == "invalid_group_policy":
        request["modelParameters"]["ahpSortGroup"]["tiePolicy"] = "average"

    response = _json_response(
        execute_ahp_sort_i(GenericModelExecutionRequest.model_validate(request))
    )

    assert response["success"] is False
    expected_error_code = (
        "ahpsort_i_profile_order_invalid"
        if mutation == "invalid_profile_order"
        else "VALIDATION_ERROR"
    )
    assert response["error"]["code"] == expected_error_code
    assert response["data"] is None


def test_inconsistent_individual_judgment_matrices_are_reported_not_aggregated_away():
    request = _limiting_group_request(["low", "high"])
    for evaluation in request["evaluations"]:
        for comparison in evaluation["payload"]["alternativeProfileComparisons"]:
            comparison["alternativeToProfile"] = 1

    response = _json_response(
        execute_ahp_sort_i(GenericModelExecutionRequest.model_validate(request))
    )

    assert response["success"] is True
    for expert_diagnostics in response["data"]["diagnostics"][
        "individualResultsByExpertId"
    ].values():
        local_priorities = expert_diagnostics["resultsByAlternativeId"][
            "supplier-low"
        ]["localPrioritiesByCriterion"]
        assert all(
            criterion["consistency"]["consistencyRatio"] > 0
            for criterion in local_priorities.values()
        )


def test_group_vote_tie_policy_uses_nonadjacent_categories_in_configured_order():
    categories = [
        {"categoryId": category_id, "order": order}
        for order, category_id in enumerate(["low", "middle", "high"])
    ]
    input_assignments = {
        "expert-a": {"alternative": "low"},
        "expert-b": {"alternative": "high"},
    }

    optimistic, optimistic_diagnostics = aggregate_category_votes(
        categories=categories,
        alternatives=[{"id": "alternative", "name": "A"}],
        category_by_expert_and_alternative=input_assignments,
        tie_policy="optimistic",
    )
    pessimistic, pessimistic_diagnostics = aggregate_category_votes(
        categories=categories,
        alternatives=[{"id": "alternative", "name": "A"}],
        category_by_expert_and_alternative=input_assignments,
        tie_policy="pessimistic",
    )

    assert optimistic[0]["categoryId"] == "high"
    assert pessimistic[0]["categoryId"] == "low"
    assert optimistic_diagnostics["alternative"]["tiedCategoryIds"] == ["low", "high"]
    assert pessimistic_diagnostics["alternative"]["tiedCategoryIds"] == ["low", "high"]


def test_group_vote_rejects_unknown_categories_and_duplicate_category_ids():
    with pytest.raises(ValueError, match="unknown category"):
        aggregate_category_votes(
            categories=[{"categoryId": "low", "order": 0}],
            alternatives=[{"id": "a1", "name": "A"}],
            category_by_expert_and_alternative={
                "e1": {"a1": "low"},
                "e2": {"a1": "unknown"},
            },
            tie_policy="optimistic",
        )

    with pytest.raises(ValueError, match="category IDs must be unique"):
        aggregate_category_votes(
            categories=[
                {"categoryId": "low", "order": 0},
                {"categoryId": "low", "order": 1},
            ],
            alternatives=[{"id": "a1", "name": "A"}],
            category_by_expert_and_alternative={
                "e1": {"a1": "low"},
                "e2": {"a1": "low"},
            },
            tie_policy="optimistic",
        )
