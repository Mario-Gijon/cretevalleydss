"""Decision Plugin adapter for the AHPSort I mathematical core."""

from collections.abc import Mapping
from typing import Any

from fastapi.responses import JSONResponse

from schemas.model_requests import GenericModelExecutionRequest
from services.model_executors.responses import error_response, success_response

from .group import aggregate_category_votes
from .run import (
    AHPSortIProfileOrderError,
    run_ahp_sort_i_central_profiles,
    run_ahp_sort_i_multiple_profiles,
)


EVALUATION_STRUCTURE_KEY = "ahpSortAlternativeProfiles"
CATEGORY_ORDER_SEMANTICS = "lower-order-is-less-preferred"
PROFILE_MODES = {"limiting", "central"}


def _required_text(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} must be a non-empty string")
    return value.strip()


def _entities(value: Any, field: str) -> list[dict[str, str]]:
    if not isinstance(value, list) or not value:
        raise ValueError(f"context.{field} must be a non-empty array")

    entities = []
    for index, entity in enumerate(value):
        if not isinstance(entity, Mapping):
            raise ValueError(f"context.{field}[{index}] must be an object")
        entities.append(
            {
                "id": _required_text(entity.get("id"), f"context.{field}[{index}].id"),
                "name": _required_text(
                    entity.get("name"), f"context.{field}[{index}].name"
                ),
            }
        )
    if len({entity["id"] for entity in entities}) != len(entities):
        raise ValueError(f"context.{field} IDs must be unique")
    return entities


def _ordered_categories(value: Any) -> tuple[list[dict[str, str]], list[dict[str, Any]]]:
    if not isinstance(value, list) or not value:
        raise ValueError("modelParameters.orderedCategories must be a non-empty array")

    categories = []
    seen_ids: set[str] = set()
    seen_orders: set[int] = set()
    for index, category in enumerate(value):
        field = f"modelParameters.orderedCategories[{index}]"
        if not isinstance(category, Mapping):
            raise ValueError(f"{field} must be an object")
        if set(category) != {"categoryId", "label", "order"}:
            raise ValueError(f"{field} must contain categoryId, label and order only")
        category_id = _required_text(category.get("categoryId"), f"{field}.categoryId")
        label = _required_text(category.get("label"), f"{field}.label")
        order = category.get("order")
        if isinstance(order, bool) or not isinstance(order, int) or order < 0:
            raise ValueError(f"{field}.order must be a non-negative integer")
        if category_id in seen_ids or order in seen_orders:
            raise ValueError("orderedCategories must have unique category IDs and orders")
        seen_ids.add(category_id)
        seen_orders.add(order)
        categories.append(
            {
                "core": {"id": category_id, "name": label},
                "result": {"categoryId": category_id, "label": label, "order": order},
            }
        )

    categories.sort(key=lambda item: item["result"]["order"])
    if [item["result"]["order"] for item in categories] != list(range(len(categories))):
        raise ValueError("orderedCategories orders must be consecutive from zero")
    return (
        [item["core"] for item in categories],
        [item["result"] for item in categories],
    )


def _profile_configuration(value: Any) -> dict[str, Any]:
    field = "modelParameters.ahpSortProfiles"
    if not isinstance(value, Mapping):
        raise ValueError(f"{field} must be an object")
    mode = value.get("mode")
    if not isinstance(mode, str) or mode not in PROFILE_MODES:
        raise ValueError(f"{field}.mode must be 'limiting' or 'central'")
    expected_fields = {"mode", "profiles"}
    if mode == "central":
        expected_fields.add("tiePolicy")
    if set(value) != expected_fields:
        raise ValueError(f"{field} fields do not match the selected profile mode")
    if not isinstance(value.get("profiles"), list):
        raise ValueError(f"{field}.profiles must be an array")

    profile_fields = (
        {"profileId", "lowerCategoryId", "upperCategoryId"}
        if mode == "limiting"
        else {"profileId", "categoryId"}
    )
    profiles = []
    for index, profile in enumerate(value["profiles"]):
        profile_field = f"{field}.profiles[{index}]"
        if not isinstance(profile, Mapping) or set(profile) != profile_fields:
            raise ValueError(
                f"{profile_field} must contain {', '.join(sorted(profile_fields))} only"
            )
        profiles.append(dict(profile))

    configuration = {"mode": mode, "profiles": profiles}
    if mode == "central":
        tie_policy = value.get("tiePolicy")
        if not isinstance(tie_policy, str) or tie_policy not in {
            "optimistic",
            "pessimistic",
        }:
            raise ValueError(
                f"{field}.tiePolicy must be 'optimistic' or 'pessimistic'"
            )
        configuration["tiePolicy"] = tie_policy
    return configuration


def _expert_evaluations(
    payload: GenericModelExecutionRequest,
) -> list[dict[str, Any]]:
    evaluations = payload.evaluations or []
    if not evaluations:
        raise ValueError("AHPSort I requires at least one complete expert evaluation")

    normalized_evaluations = []
    seen_expert_ids: set[str] = set()
    for index, evaluation in enumerate(evaluations):
        field = f"evaluations[{index}]"
        if not isinstance(evaluation, Mapping):
            raise ValueError(f"{field} must be an object")
        if set(evaluation) != {"expert", "payload"}:
            raise ValueError(f"{field} must contain expert and payload only")
        expert = evaluation.get("expert")
        if not isinstance(expert, Mapping):
            raise ValueError(f"{field}.expert must be an object with a stable ID")
        expert_id = _required_text(expert.get("id"), f"{field}.expert.id")
        if expert_id in seen_expert_ids:
            raise ValueError(f"expert ID '{expert_id}' has more than one evaluation")
        seen_expert_ids.add(expert_id)

        evaluation_payload = evaluation.get("payload")
        if not isinstance(evaluation_payload, Mapping):
            raise ValueError(f"{field}.payload must be an object")
        if set(evaluation_payload) != {
            "alternativeProfileComparisons",
            "profileComparisons",
        }:
            raise ValueError(
                f"{field}.payload must contain alternativeProfileComparisons "
                "and profileComparisons only"
            )
        comparisons = evaluation_payload.get("alternativeProfileComparisons")
        profile_comparisons = evaluation_payload.get("profileComparisons")
        if not isinstance(comparisons, list):
            raise ValueError(
                f"{field}.payload.alternativeProfileComparisons must be an array"
            )
        if not isinstance(profile_comparisons, list):
            raise ValueError(f"{field}.payload.profileComparisons must be an array")
        normalized_evaluations.append(
            {
                "expertId": expert_id,
                "comparisons": comparisons,
                "profileComparisons": profile_comparisons,
            }
        )

    # Stable ordering keeps group diagnostics invariant to request evaluation order.
    return sorted(normalized_evaluations, key=lambda item: item["expertId"])


def _group_tie_policy(value: Any) -> str:
    field = "modelParameters.ahpSortGroup"
    if not isinstance(value, Mapping) or set(value) != {"tiePolicy"}:
        raise ValueError(f"{field} must contain tiePolicy only")
    tie_policy = value.get("tiePolicy")
    if tie_policy not in {"optimistic", "pessimistic"}:
        raise ValueError(f"{field}.tiePolicy must be 'optimistic' or 'pessimistic'")
    return tie_policy


def _execution_input(payload: GenericModelExecutionRequest) -> dict[str, Any]:
    context = payload.context or {}
    structure = context.get("structure")
    if not isinstance(structure, Mapping) or structure.get("key") != EVALUATION_STRUCTURE_KEY:
        raise ValueError(
            f"context.structure.key must be '{EVALUATION_STRUCTURE_KEY}'"
        )
    if structure.get("stage") != "alternativeEvaluation":
        raise ValueError("context.structure.stage must be 'alternativeEvaluation'")

    criteria = _entities(context.get("criteria"), "criteria")
    alternatives = _entities(context.get("alternatives"), "alternatives")
    categories, result_categories = _ordered_categories(
        (payload.modelParameters or {}).get("orderedCategories")
    )
    profile_configuration = _profile_configuration(
        (payload.modelParameters or {}).get("ahpSortProfiles")
    )
    weights = (payload.modelParameters or {}).get("weights")
    if not isinstance(weights, Mapping):
        raise ValueError("modelParameters.weights must be an object keyed by criterion ID")
    expert_evaluations = _expert_evaluations(payload)
    group_tie_policy = None
    if len(expert_evaluations) > 1:
        group_tie_policy = _group_tie_policy(
            (payload.modelParameters or {}).get("ahpSortGroup")
        )

    first_evaluation = expert_evaluations[0]

    return {
        "criteria": criteria,
        "alternatives": alternatives,
        "categories": categories,
        "resultCategories": result_categories,
        "profiles": profile_configuration["profiles"],
        "profileMode": profile_configuration["mode"],
        "tiePolicy": profile_configuration.get("tiePolicy"),
        "criterionWeightsById": weights,
        "expertEvaluations": expert_evaluations,
        # Keep these aliases for the existing single-expert adapter contract
        # and its internal regression helpers.
        "comparisons": first_evaluation["comparisons"],
        "profileComparisons": first_evaluation["profileComparisons"],
        "groupTiePolicy": group_tie_policy,
    }


def _sorting_result(
    execution_input: Mapping[str, Any], core_result: Mapping[str, Any]
) -> dict[str, Any]:
    assignments = core_result["resultsByAlternative"]
    diagnostics_by_alternative: dict[str, Any] = {}
    for alternative in execution_input["alternatives"]:
        alternative_id = alternative["id"]
        assignment = assignments[alternative_id]
        profile_priorities = (
            assignment.get("profileGlobalPrioritiesById")
            or assignment.get("centralProfilePrioritiesById")
        )
        classification = {"rule": assignment["assignmentRule"]}
        if execution_input["profileMode"] == "central":
            classification.update(
                {
                    "selectedCenterProfileId": assignment["selectedCenterProfileId"],
                    "distanceToSelectedCenter": assignment["distanceToSelectedCenter"],
                    "centerDistancesByProfileId": assignment[
                        "centerDistancesByProfileId"
                    ],
                    "tieDetected": assignment["tieDetected"],
                    "tiedCenterProfileIds": assignment["tiedCenterProfileIds"],
                    "tiePolicy": assignment["tiePolicy"],
                }
            )
        diagnostics_by_alternative[alternative_id] = {
            "categoryId": assignment["categoryId"],
            "globalPriority": assignment["globalPriority"],
            "profileGlobalPrioritiesById": profile_priorities,
            "weightsByCriterion": assignment["weightsByCriterion"],
            "weightedContributionsByCriterion": assignment[
                "weightedContributionsByCriterion"
            ],
            "localPrioritiesByCriterion": assignment["localPrioritiesByCriterion"],
            "classification": classification,
        }

    diagnostics = {
        "modelKey": "ahp_sort_i",
        "profileMode": execution_input["profileMode"],
        "resultsByAlternativeId": diagnostics_by_alternative,
    }
    if execution_input["profileMode"] == "central":
        diagnostics["tiePolicy"] = execution_input["tiePolicy"]

    return {
        "categories": execution_input["resultCategories"],
        "categoryOrderSemantics": CATEGORY_ORDER_SEMANTICS,
        "assignments": [
            {
                "alternativeId": alternative["id"],
                "categoryId": assignments[alternative["id"]]["categoryId"],
            }
            for alternative in execution_input["alternatives"]
        ],
        "diagnostics": diagnostics,
    }


def execute_ahp_sort_i(
    payload: GenericModelExecutionRequest,
) -> dict[str, Any] | JSONResponse:
    """Run individual AHPSort I evaluations and project to ``sorting@1``."""

    try:
        execution_input = _execution_input(payload)
        expert_results = {}
        category_by_expert_and_alternative = {}
        for expert_evaluation in execution_input["expertEvaluations"]:
            expert_id = expert_evaluation["expertId"]
            if execution_input["profileMode"] == "limiting":
                core_result = run_ahp_sort_i_multiple_profiles(
                    criteria=execution_input["criteria"],
                    categories=execution_input["categories"],
                    alternatives=execution_input["alternatives"],
                    limiting_profiles=execution_input["profiles"],
                    criterion_weights_by_id=execution_input["criterionWeightsById"],
                    comparisons=expert_evaluation["comparisons"],
                    profile_comparisons=expert_evaluation["profileComparisons"],
                )
            else:
                core_result = run_ahp_sort_i_central_profiles(
                    criteria=execution_input["criteria"],
                    categories=execution_input["categories"],
                    alternatives=execution_input["alternatives"],
                    central_profiles=execution_input["profiles"],
                    criterion_weights_by_id=execution_input["criterionWeightsById"],
                    comparisons=expert_evaluation["comparisons"],
                    profile_comparisons=expert_evaluation["profileComparisons"],
                    tie_policy=execution_input["tiePolicy"],
                )
            expert_results[expert_id] = _sorting_result(execution_input, core_result)
            category_by_expert_and_alternative[expert_id] = {
                alternative_id: assignment["categoryId"]
                for alternative_id, assignment in core_result[
                    "resultsByAlternative"
                ].items()
            }

        if len(expert_results) == 1:
            result = next(iter(expert_results.values()))
        else:
            assignments, group_diagnostics = aggregate_category_votes(
                categories=execution_input["resultCategories"],
                alternatives=execution_input["alternatives"],
                category_by_expert_and_alternative=category_by_expert_and_alternative,
                tie_policy=execution_input["groupTiePolicy"],
            )
            diagnostics = {
                "modelKey": "ahp_sort_i",
                "profileMode": execution_input["profileMode"],
                "aggregationMethod": "unweighted_plurality_vote",
                "groupTiePolicy": execution_input["groupTiePolicy"],
                "individualResultsByExpertId": {
                    expert_id: expert_results[expert_id]["diagnostics"]
                    for expert_id in sorted(expert_results)
                },
                "resultsByAlternativeId": group_diagnostics,
            }
            if execution_input["profileMode"] == "central":
                diagnostics["profileTiePolicy"] = execution_input["tiePolicy"]
            result = {
                "categories": execution_input["resultCategories"],
                "categoryOrderSemantics": CATEGORY_ORDER_SEMANTICS,
                "assignments": assignments,
                "diagnostics": diagnostics,
            }
        return success_response(
            "AHPSort I executed successfully",
            result,
        )
    except AHPSortIProfileOrderError as error:
        return error_response(
            str(error), code=error.code, details=error.as_dict()
        )
    except (ValueError, TypeError, KeyError) as error:
        return error_response(
            f"Invalid AHPSort I execution input: {error}",
            code="VALIDATION_ERROR",
            details={"reason": str(error)},
        )
    except Exception:
        return error_response(
            "AHPSort I execution could not be completed.",
            code="INTERNAL_ERROR",
        )


__all__ = ["execute_ahp_sort_i"]
