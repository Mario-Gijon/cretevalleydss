"""Sampled criterion-weight sensitivity using the original TOPSIS-Sort core."""

from __future__ import annotations

import math
from typing import Any

from ..run import (
    AssignmentUndeterminedError,
    ProfileBoundaryTieError,
    TopsisSort2016Error,
    UndefinedClosenessError,
    UndefinedNormalizationError,
    run_topsis_sort_2016,
)
from .evidence import TopsisSort2016Evidence


SENSITIVITY_STEP = 0.05


def _sample_weights(configured_weight: float) -> list[float]:
    values = [round(index * SENSITIVITY_STEP, 12) for index in range(21)]
    values.append(configured_weight)
    return sorted(set(values))


def _scenario_weights(
    evidence: TopsisSort2016Evidence,
    criterion_index: int,
    varied_weight: float,
) -> tuple[list[float] | None, str | None]:
    configured = [float(item["weight"]) for item in evidence.criteria]
    original_weight = configured[criterion_index]
    complement = math.fsum(
        weight for index, weight in enumerate(configured)
        if index != criterion_index
    )

    if varied_weight == original_weight:
        return configured, None
    if complement == 0.0:
        if varied_weight == 1.0:
            return configured, None
        return None, "proportional_redistribution_impossible_zero_complement"

    weights = [0.0] * len(configured)
    weights[criterion_index] = varied_weight
    for index, original in enumerate(configured):
        if index != criterion_index:
            weights[index] = (1.0 - varied_weight) * original / complement
    return weights, None


def _unavailable_reason(error: TopsisSort2016Error) -> str:
    if isinstance(error, UndefinedNormalizationError):
        return "normalization_undefined"
    if isinstance(error, UndefinedClosenessError):
        return "closeness_undefined"
    if isinstance(error, ProfileBoundaryTieError):
        return "alternative_equals_boundary"
    if isinstance(error, AssignmentUndeterminedError):
        message = str(error).lower()
        if "consecutive profiles" in message:
            return "profile_closeness_order_not_strict"
        return "assignment_interval_undefined"
    return "invalid_scenario"


def _assignment_map(result: dict[str, Any]) -> dict[str, str]:
    return {
        item["alternative_id"]: item["category_id"]
        for item in result["assignments"]
    }


def _valid_point(
    *,
    evidence: TopsisSort2016Evidence,
    varied_weight: float,
    weights: list[float],
    result: dict[str, Any],
    baseline_assignments: dict[str, str],
) -> dict[str, Any]:
    assignments = _assignment_map(result)
    categories_by_id = {item["category_id"]: item for item in evidence.categories}
    alternatives_by_id = {
        item["alternativeId"]: item for item in evidence.alternatives
    }
    changes = [
        {
            "alternativeId": alternative_id,
            "alternativeName": alternatives_by_id[alternative_id]["name"],
            "fromCategoryId": baseline_assignments[alternative_id],
            "fromCategory": categories_by_id[baseline_assignments[alternative_id]]["label"],
            "toCategoryId": category_id,
            "toCategory": categories_by_id[category_id]["label"],
        }
        for alternative_id, category_id in assignments.items()
        if category_id != baseline_assignments[alternative_id]
    ]
    diagnostics = result["diagnostics"]
    return {
        "variedWeight": varied_weight,
        "available": True,
        "reason": None,
        "criterionWeights": [
            {
                "criterionId": criterion["criterionId"],
                "weight": weights[index],
            }
            for index, criterion in enumerate(evidence.criteria)
        ],
        "closenessByAlternativeId": diagnostics["closeness_by_alternative_id"],
        "closenessByProfileId": diagnostics["closeness_by_profile_id"],
        "assignments": [
            {
                "alternativeId": alternative_id,
                "alternativeName": alternatives_by_id[alternative_id]["name"],
                "categoryId": category_id,
                "category": categories_by_id[category_id]["label"],
            }
            for alternative_id, category_id in assignments.items()
        ],
        "changedAssignments": changes,
        "distancesByAlternativeId": diagnostics["distances_by_alternative_id"],
        "distancesByProfileId": diagnostics["distances_by_profile_id"],
    }


def _transitions(points: list[dict[str, Any]]) -> list[dict[str, Any]]:
    transitions = []
    for previous, current in zip(points, points[1:], strict=False):
        if not previous["available"] or not current["available"]:
            continue
        previous_assignments = {
            item["alternativeId"]: item for item in previous["assignments"]
        }
        current_assignments = {
            item["alternativeId"]: item for item in current["assignments"]
        }
        changes = []
        for alternative_id, previous_item in previous_assignments.items():
            current_item = current_assignments[alternative_id]
            if previous_item["categoryId"] == current_item["categoryId"]:
                continue
            changes.append(
                {
                    "alternativeId": alternative_id,
                    "alternativeName": current_item["alternativeName"],
                    "fromCategoryId": previous_item["categoryId"],
                    "fromCategory": previous_item["category"],
                    "toCategoryId": current_item["categoryId"],
                    "toCategory": current_item["category"],
                }
            )
        if changes:
            transitions.append(
                {
                    "fromWeight": previous["variedWeight"],
                    "toWeight": current["variedWeight"],
                    "changes": changes,
                }
            )
    return transitions


def build_sensitivity_facts(
    evidence: TopsisSort2016Evidence,
    baseline_facts: dict[str, Any],
) -> dict[str, Any]:
    """Re-run the pure model for each valid sampled criterion weight."""
    if len(evidence.criteria) == 1:
        return {
            "availability": {"available": False, "reason": "single_criterion"},
            "items": [
                {
                    "criterionId": evidence.criteria[0]["criterionId"],
                    "criterionName": evidence.criteria[0]["name"],
                    "configuredWeight": evidence.criteria[0]["weight"],
                    "available": False,
                    "reason": "single_criterion",
                    "points": [],
                    "summary": None,
                }
            ],
        }

    baseline_assignments = evidence.executed_assignments
    items = []
    for criterion_index, criterion in enumerate(evidence.criteria):
        configured_weight = criterion["weight"]
        points = []
        for varied_weight in _sample_weights(configured_weight):
            weights, weight_error = _scenario_weights(
                evidence,
                criterion_index,
                varied_weight,
            )
            if weight_error:
                points.append(
                    {
                        "variedWeight": varied_weight,
                        "available": False,
                        "reason": weight_error,
                        "criterionWeights": None,
                        "closenessByAlternativeId": None,
                        "closenessByProfileId": None,
                        "assignments": None,
                        "changedAssignments": [],
                        "distancesByAlternativeId": None,
                        "distancesByProfileId": None,
                    }
                )
                continue

            varied_criteria = [
                {**item, "weight": weights[index]}
                for index, item in enumerate(evidence.criteria)
            ]
            try:
                result = run_topsis_sort_2016(
                    alternatives=[
                        {
                            "alternative_id": item["alternativeId"],
                            "values_by_criterion_id": item["valuesByCriterionId"],
                        }
                        for item in evidence.alternatives
                    ],
                    criteria=[
                        {
                            "criterion_id": item["criterionId"],
                            "direction": item["direction"],
                            "weight": item["weight"],
                            "minimum": item["minimum"],
                            "maximum": item["maximum"],
                        }
                        for item in varied_criteria
                    ],
                    profiles=evidence.profiles,
                    categories=evidence.categories,
                )
            except TopsisSort2016Error as error:
                points.append(
                    {
                        "variedWeight": varied_weight,
                        "available": False,
                        "reason": _unavailable_reason(error),
                        "criterionWeights": [
                            {
                                "criterionId": item["criterionId"],
                                "weight": weights[index],
                            }
                            for index, item in enumerate(evidence.criteria)
                        ],
                        "closenessByAlternativeId": None,
                        "closenessByProfileId": None,
                        "assignments": None,
                        "changedAssignments": [],
                        "distancesByAlternativeId": None,
                        "distancesByProfileId": None,
                    }
                )
            else:
                point = _valid_point(
                    evidence=evidence,
                    varied_weight=varied_weight,
                    weights=weights,
                    result=result,
                    baseline_assignments=baseline_assignments,
                )
                if varied_weight == configured_weight and (
                    point["assignments"]
                    != [
                        {
                            "alternativeId": item["alternativeId"],
                            "alternativeName": item["name"],
                            "categoryId": item["categoryId"],
                            "category": item["categoryLabel"],
                        }
                        for item in baseline_facts["alternatives"]
                    ]
                ):
                    raise ValueError(
                        "Criterion sensitivity did not reproduce the configured baseline"
                    )
                points.append(point)

        baseline_points = [
            point for point in points
            if point["available"] and point["variedWeight"] == configured_weight
        ]
        if len(baseline_points) != 1:
            raise ValueError(
                "Criterion sensitivity must include exactly one valid configured baseline point"
            )

        valid_points = [point for point in points if point["available"]]
        transitions = _transitions(points)
        observed_changes = [
            {
                "variedWeight": point["variedWeight"],
                "weightDifferenceFromConfigured": point["variedWeight"] - configured_weight,
                "changedAssignments": point["changedAssignments"],
            }
            for point in valid_points
            if point["changedAssignments"]
        ]
        nearest_change = min(
            observed_changes,
            key=lambda item: abs(item["weightDifferenceFromConfigured"]),
            default=None,
        )
        trajectory_available = len(valid_points) >= 2
        unavailable_reason = None
        if not trajectory_available:
            unavailable_reason = (
                "insufficient_valid_weight_samples"
                if valid_points
                else "no_valid_weight_samples"
            )
        items.append(
            {
                "criterionId": criterion["criterionId"],
                "criterionName": criterion["name"],
                "criterionIndex": criterion_index,
                "configuredWeight": configured_weight,
                "available": trajectory_available,
                "reason": unavailable_reason,
                "redistribution": {
                    "method": "proportional_preserve_other_weight_ratios",
                    "complementConfiguredWeight": math.fsum(
                        item["weight"]
                        for index, item in enumerate(evidence.criteria)
                        if index != criterion_index
                    ),
                },
                "points": points,
                "summary": {
                    "validSampleCount": len(valid_points),
                    "unavailableSampleCount": len(points) - len(valid_points),
                    "observedChanges": observed_changes,
                    "nearestObservedChange": nearest_change,
                    "observedAdjacentTransitions": transitions,
                    "noChangesAcrossValidSamples": not observed_changes,
                    "allValidSamplesRetainBaselineCategory": not observed_changes,
                },
            }
        )

    return {
        "availability": {
            "available": any(item["available"] for item in items),
            "reason": None if any(item["available"] for item in items) else "no_renderable_criterion_trajectories",
        },
        "items": items,
    }


__all__ = ["SENSITIVITY_STEP", "build_sensitivity_facts"]
