"""Baseline TOPSIS-Sort facts derived from validated frozen evidence."""

from __future__ import annotations

from typing import Any

from .evidence import COEFFICIENT_TOLERANCE, TopsisSort2016Evidence


def _boundary_labels(
    categories: list[dict[str, Any]],
    profiles: list[dict[str, Any]],
    profile_closeness: dict[str, float],
) -> list[dict[str, Any]]:
    profiles_by_category = {item["category_id"]: item for item in profiles}
    boundaries = []
    for order in range(1, len(categories)):
        lower = categories[order - 1]
        upper = categories[order]
        profile = profiles_by_category[upper["category_id"]]
        boundaries.append(
            {
                "profileId": profile["profile_id"],
                "lowerCategoryId": lower["category_id"],
                "lowerCategoryLabel": lower["label"],
                "upperCategoryId": upper["category_id"],
                "upperCategoryLabel": upper["label"],
                "label": f"{lower['label']} / {upper['label']} boundary",
                "closeness": float(profile_closeness[profile["profile_id"]]),
            }
        )
    return boundaries


def build_core_facts(evidence: TopsisSort2016Evidence) -> dict[str, Any]:
    categories = [
        {
            "categoryId": item["category_id"],
            "label": item["label"],
            "order": item["order"],
        }
        for item in evidence.categories
    ]
    categories_by_id = {item["categoryId"]: item for item in categories}
    diagnostics = evidence.baseline_result["diagnostics"]
    alternative_closeness = diagnostics["closeness_by_alternative_id"]
    profile_closeness = diagnostics["closeness_by_profile_id"]
    profiles_by_category = {
        item["category_id"]: item for item in evidence.profiles
    }
    ordered_profiles = [
        profiles_by_category[category["categoryId"]]
        for category in categories[1:]
    ]
    boundaries = _boundary_labels(
        evidence.categories,
        ordered_profiles,
        profile_closeness,
    )
    boundary_by_profile = {item["profileId"]: item for item in boundaries}
    assignment_by_alternative = evidence.executed_assignments
    alternatives = []
    for alternative in evidence.alternatives:
        alternative_id = alternative["alternativeId"]
        category_id = assignment_by_alternative[alternative_id]
        category = categories_by_id[category_id]
        order = category["order"]
        lower = boundaries[order - 1] if order > 0 else None
        upper = boundaries[order] if order < len(boundaries) else None
        coefficient = float(alternative_closeness[alternative_id])
        boundary_gaps = []
        if lower is not None:
            boundary_gaps.append(
                {
                    "profileId": lower["profileId"],
                    "label": lower["label"],
                    "distance": coefficient - lower["closeness"],
                    "side": "above",
                }
            )
        if upper is not None:
            boundary_gaps.append(
                {
                    "profileId": upper["profileId"],
                    "label": upper["label"],
                    "distance": upper["closeness"] - coefficient,
                    "side": "below",
                }
            )
        nearest = min(boundary_gaps, key=lambda item: item["distance"])
        alternatives.append(
            {
                **alternative,
                "categoryId": category_id,
                "categoryLabel": category["label"],
                "categoryOrder": order,
                "closeness": coefficient,
                "boundaryGaps": boundary_gaps,
                "nearestBoundary": nearest,
            }
        )

    category_members = {
        item["categoryId"]: [
            alternative for alternative in alternatives
            if alternative["categoryId"] == item["categoryId"]
        ]
        for item in categories
    }
    return {
        "status": "available",
        "sourcePhase": evidence.source_phase,
        "executedRounds": evidence.executed_rounds,
        "executionId": evidence.execution_id,
        "comparisonKey": evidence.comparison_key,
        "baselineValidation": {
            "available": True,
            "coefficientTolerance": COEFFICIENT_TOLERANCE,
            "checks": [
                "categories",
                "assignments",
                "alternative_closeness",
                "profile_closeness",
                "alternative_ideal_distances",
                "profile_ideal_distances",
            ],
        },
        "criteria": evidence.criteria,
        "categories": categories,
        "alternatives": alternatives,
        "profiles": [
            {
                "profileId": item["profile_id"],
                "categoryId": item["category_id"],
                "categoryLabel": categories_by_id[item["category_id"]]["label"],
                **boundary_by_profile[item["profile_id"]],
                "valuesByCriterionId": dict(item["values_by_criterion_id"]),
            }
            for item in ordered_profiles
        ],
        "collectiveEvaluations": [
            {
                "alternativeId": alternative["alternativeId"],
                "valuesByCriterionId": dict(alternative["valuesByCriterionId"]),
            }
            for alternative in evidence.alternatives
        ],
        "categoryMembership": [
            {
                "categoryId": category["categoryId"],
                "categoryLabel": category["label"],
                "alternativeIds": [
                    item["alternativeId"]
                    for item in category_members[category["categoryId"]]
                ],
            }
            for category in categories
        ],
        "idealDistances": {
            "alternatives": diagnostics["distances_by_alternative_id"],
            "profiles": diagnostics["distances_by_profile_id"],
        },
    }


__all__ = ["build_core_facts"]
