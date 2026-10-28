"""Pure mathematical core for the binary, limiting-profile AHPSort I case.

This module deliberately does not expose a Decision Plugin or HTTP contract.
The current implementation accepts exactly two ordered categories and one
limiting profile. Comparison records carry stable alternative, criterion, and
profile IDs so that the inputs do not depend on positional alignment.
"""

from __future__ import annotations

import math
from collections.abc import Mapping
from typing import Any


SAATY_VALUES = frozenset(
    [float(value) for value in range(1, 10)]
    + [1.0 / value for value in range(2, 10)]
)
WEIGHT_SUM_TOLERANCE = 1e-12


def _non_empty_string(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    normalized = value.strip()
    return normalized or None


def _normalize_entities(values: Any, *, field: str) -> list[dict[str, str]]:
    if not isinstance(values, list) or not values:
        raise ValueError(f"{field} must be a non-empty list")

    normalized: list[dict[str, str]] = []
    seen_ids: set[str] = set()
    for index, item in enumerate(values):
        item_field = f"{field}[{index}]"
        if not isinstance(item, dict):
            raise ValueError(f"{item_field} must be an object")
        entity_id = _non_empty_string(item.get("id"))
        name = _non_empty_string(item.get("name"))
        if entity_id is None or name is None:
            raise ValueError(f"{item_field} must have non-empty id and name")
        if entity_id in seen_ids:
            raise ValueError(f"{field} contains duplicate id '{entity_id}'")
        seen_ids.add(entity_id)
        normalized.append({"id": entity_id, "name": name})
    return normalized


def _normalize_weights(
    criterion_weights_by_id: Any, criteria: list[dict[str, str]]
) -> dict[str, float]:
    if not isinstance(criterion_weights_by_id, Mapping):
        raise ValueError("criterion_weights_by_id must be an object keyed by criterion id")

    criterion_ids = [criterion["id"] for criterion in criteria]
    provided_ids = set(criterion_weights_by_id)
    expected_ids = set(criterion_ids)
    if provided_ids != expected_ids:
        missing = sorted(expected_ids - provided_ids)
        unknown = sorted(provided_ids - expected_ids, key=str)
        raise ValueError(
            "criterion_weights_by_id must contain exactly the criterion ids "
            f"(missing={missing}, unknown={unknown})"
        )

    weights: dict[str, float] = {}
    for criterion_id in criterion_ids:
        value = criterion_weights_by_id[criterion_id]
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError(f"criterion weight '{criterion_id}' must be numeric")
        numeric = float(value)
        if not math.isfinite(numeric) or numeric < 0:
            raise ValueError(f"criterion weight '{criterion_id}' must be finite and non-negative")
        weights[criterion_id] = numeric

    total = math.fsum(weights.values())
    if not math.isfinite(total) or not math.isclose(
        total, 1.0, rel_tol=0.0, abs_tol=WEIGHT_SUM_TOLERANCE
    ):
        raise ValueError(
            "criterion weights must be normalized to sum to 1 "
            f"(received {total!r})"
        )
    return weights


def _normalize_judgment(value: Any, field: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field} must be a numeric Saaty comparison")
    numeric = float(value)
    if not math.isfinite(numeric) or numeric not in SAATY_VALUES:
        raise ValueError(
            f"{field} must be one of Saaty's 1–9 scale values or a reciprocal"
        )
    return numeric


def _normalize_comparisons(
    comparisons: Any,
    *,
    criteria: list[dict[str, str]],
    alternatives: list[dict[str, str]],
    profile_id: str,
) -> dict[tuple[str, str, str], float]:
    if not isinstance(comparisons, list):
        raise ValueError("comparisons must be a list")

    criterion_ids = {criterion["id"] for criterion in criteria}
    alternative_ids = {alternative["id"] for alternative in alternatives}
    expected = {
        (alternative_id, criterion_id, profile_id)
        for alternative_id in alternative_ids
        for criterion_id in criterion_ids
    }
    values: dict[tuple[str, str, str], float] = {}

    for index, comparison in enumerate(comparisons):
        field = f"comparisons[{index}]"
        if not isinstance(comparison, dict) or set(comparison) != {
            "alternativeId",
            "criterionId",
            "profileId",
            "alternativeToProfile",
        }:
            raise ValueError(
                f"{field} must contain alternativeId, criterionId, profileId and alternativeToProfile"
            )

        alternative_id = _non_empty_string(comparison.get("alternativeId"))
        criterion_id = _non_empty_string(comparison.get("criterionId"))
        comparison_profile_id = _non_empty_string(comparison.get("profileId"))
        key = (alternative_id, criterion_id, comparison_profile_id)
        if key not in expected:
            raise ValueError(f"{field} references an unknown alternative, criterion or profile id")
        if key in values:
            raise ValueError(f"{field} duplicates an alternative/criterion/profile comparison")
        values[key] = _normalize_judgment(
            comparison.get("alternativeToProfile"), f"{field}.alternativeToProfile"
        )

    missing = expected - set(values)
    if missing:
        raise ValueError(
            f"comparisons are incomplete: {len(values)} of {len(expected)} "
            "alternative/criterion comparisons are present"
        )
    return values


def _build_binary_pairwise_matrix(
    alternative_to_profile: float,
) -> tuple[tuple[float, float], tuple[float, float]]:
    return (
        (1.0, alternative_to_profile),
        (1.0 / alternative_to_profile, 1.0),
    )


def _binary_local_priorities(
    alternative_to_profile: float,
) -> tuple[tuple[tuple[float, float], tuple[float, float]], float, float]:
    """Return a reciprocal matrix and its principal-vector priorities.

    For A = [[1, a], [1/a, 1]], the principal eigenvalue is 2 and its
    eigenvector is proportional to [a, 1]. Normalizing gives these priorities.
    """

    matrix = _build_binary_pairwise_matrix(alternative_to_profile)
    alternative_profile_ratio = matrix[0][1]
    denominator = 1.0 + alternative_profile_ratio
    alternative_priority = alternative_profile_ratio / denominator
    profile_priority = 1.0 / denominator
    return matrix, alternative_priority, profile_priority


def run_ahp_sort_i(
    *,
    criteria: Any,
    categories: Any,
    alternatives: Any,
    limiting_profile: Any,
    criterion_weights_by_id: Any,
    comparisons: Any,
) -> dict[str, Any]:
    """Classify alternatives with binary AHPSort I and one limiting profile.

    Categories are supplied from least preferred to most preferred. Every
    comparison record states the Saaty ratio of an alternative to the same
    limiting profile for one criterion; values above 1 favor the alternative.
    Criterion weights must already be normalized, and are used without
    renormalization.
    """

    normalized_criteria = _normalize_entities(criteria, field="criteria")
    normalized_categories = _normalize_entities(categories, field="categories")
    if len(normalized_categories) != 2:
        raise ValueError("AHPSort I phase 1A requires exactly two ordered categories")
    normalized_alternatives = _normalize_entities(alternatives, field="alternatives")
    normalized_profile = _normalize_entities(
        [limiting_profile], field="limiting_profile"
    )[0]

    weights = _normalize_weights(criterion_weights_by_id, normalized_criteria)
    judgments = _normalize_comparisons(
        comparisons,
        criteria=normalized_criteria,
        alternatives=normalized_alternatives,
        profile_id=normalized_profile["id"],
    )

    results_by_alternative: dict[str, dict[str, Any]] = {}
    for alternative in normalized_alternatives:
        alternative_id = alternative["id"]
        local_priorities_by_criterion: dict[str, dict[str, float]] = {}
        weighted_contributions_by_criterion: dict[str, dict[str, float]] = {}
        alternative_contributions: list[float] = []
        profile_contributions: list[float] = []

        for criterion in normalized_criteria:
            criterion_id = criterion["id"]
            judgment = judgments[(alternative_id, criterion_id, normalized_profile["id"])]
            pairwise_matrix, local_alternative, local_profile = _binary_local_priorities(
                judgment
            )
            weight = weights[criterion_id]
            local_priorities_by_criterion[criterion_id] = {
                "alternativeToProfileJudgment": judgment,
                "pairwiseMatrix": [list(row) for row in pairwise_matrix],
                "alternative": local_alternative,
                "profile": local_profile,
            }
            weighted_contributions_by_criterion[criterion_id] = {
                "alternative": weight * local_alternative,
                "profile": weight * local_profile,
            }
            alternative_contributions.append(weight * local_alternative)
            profile_contributions.append(weight * local_profile)

        alternative_priority = math.fsum(alternative_contributions)
        profile_priority = math.fsum(profile_contributions)

        assigned_category = (
            normalized_categories[1]
            if alternative_priority >= profile_priority
            else normalized_categories[0]
        )
        results_by_alternative[alternative_id] = {
            "alternativeId": alternative_id,
            "categoryId": assigned_category["id"],
            "localPrioritiesByCriterion": local_priorities_by_criterion,
            "weightsByCriterion": dict(weights),
            "weightedContributionsByCriterion": weighted_contributions_by_criterion,
            "globalPriority": alternative_priority,
            "profileId": normalized_profile["id"],
            "profileGlobalPriority": profile_priority,
            "assignmentRule": (
                "alternative_priority_greater_than_or_equal_to_limiting_profile"
            ),
        }

    return {
        "criteria": normalized_criteria,
        "categories": normalized_categories,
        "limitingProfile": normalized_profile,
        "criterionWeightsById": weights,
        "resultsByAlternative": results_by_alternative,
    }
