"""Pure mathematical cores for limiting-profile AHPSort I.

This module deliberately does not expose a Decision Plugin or HTTP contract.
``run_ahp_sort_i`` preserves the Phase 1A binary contract. The generalized
``run_ahp_sort_i_multiple_profiles`` accepts two or more ordered categories
and their consecutive limiting profiles. Comparison records carry stable
entity IDs so the inputs do not depend on positional alignment.
"""

from __future__ import annotations

import math
from collections.abc import Mapping
from typing import Any

from models.ahp_criteria_weights.run import (
    MAX_SUPPORTED_CRITERIA as MAX_SUPPORTED_LOCAL_MATRIX_SIZE,
    run_ahp_criteria_weights,
)


SAATY_VALUES = frozenset(
    [float(value) for value in range(1, 10)]
    + [1.0 / value for value in range(2, 10)]
)
WEIGHT_SUM_TOLERANCE = 1e-12
PROFILE_ORDER_TOLERANCE = 1e-12
CLASSIFICATION_TIE_TOLERANCE = 1e-12


class AHPSortIProfileOrderError(ValueError):
    """A calculated pair of consecutive profiles cannot define an interval."""

    code = "ahpsort_i_profile_order_invalid"

    def __init__(
        self,
        *,
        alternative_id: str,
        lower_profile_id: str,
        upper_profile_id: str,
        lower_priority: float,
        upper_priority: float,
    ) -> None:
        self.alternative_id = alternative_id
        self.profile_ids = [lower_profile_id, upper_profile_id]
        self.profile_priorities = [lower_priority, upper_priority]
        self.lower_profile_id = lower_profile_id
        self.upper_profile_id = upper_profile_id
        self.lower_priority = lower_priority
        self.upper_priority = upper_priority
        super().__init__(
            "AHPSort I profile priorities are not strictly increasing for "
            f"alternative '{alternative_id}' between profiles "
            f"'{lower_profile_id}' ({lower_priority:.17g}) and "
            f"'{upper_profile_id}' ({upper_priority:.17g})"
        )

    def as_dict(self) -> dict[str, Any]:
        """Return machine-readable context for logs and execution diagnostics."""

        return {
            "code": self.code,
            "message": str(self),
            "alternativeId": self.alternative_id,
            "profileIds": list(self.profile_ids),
            "profilePrioritiesById": {
                self.lower_profile_id: self.lower_priority,
                self.upper_profile_id: self.upper_priority,
            },
        }


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


def _normalize_limiting_profiles(
    profiles: Any, categories: list[dict[str, str]]
) -> list[dict[str, str]]:
    if len(categories) < 2:
        raise ValueError("AHPSort I requires at least two ordered categories")
    if not isinstance(profiles, list):
        raise ValueError("limiting_profiles must be a list")

    category_index = {category["id"]: index for index, category in enumerate(categories)}
    expected_boundaries = {
        (categories[index]["id"], categories[index + 1]["id"])
        for index in range(len(categories) - 1)
    }
    normalized: list[dict[str, str]] = []
    seen_ids: set[str] = set()
    seen_boundaries: set[tuple[str, str]] = set()
    for index, profile in enumerate(profiles):
        field = f"limiting_profiles[{index}]"
        if not isinstance(profile, dict):
            raise ValueError(f"{field} must be an object")
        profile_id = _non_empty_string(profile.get("profileId"))
        lower_category_id = _non_empty_string(profile.get("lowerCategoryId"))
        upper_category_id = _non_empty_string(profile.get("upperCategoryId"))
        if profile_id is None or lower_category_id is None or upper_category_id is None:
            raise ValueError(
                f"{field} must have non-empty profileId, lowerCategoryId and upperCategoryId"
            )
        if profile_id in seen_ids:
            raise ValueError(f"limiting_profiles contains duplicate profileId '{profile_id}'")
        seen_ids.add(profile_id)
        boundary = (lower_category_id, upper_category_id)
        if boundary not in expected_boundaries:
            raise ValueError(
                f"{field} must identify one consecutive ordered category boundary"
            )
        if boundary in seen_boundaries:
            raise ValueError(f"limiting_profiles duplicates category boundary {boundary}")
        seen_boundaries.add(boundary)
        normalized.append(
            {
                "profileId": profile_id,
                "lowerCategoryId": lower_category_id,
                "upperCategoryId": upper_category_id,
            }
        )

    missing = expected_boundaries - seen_boundaries
    if missing:
        raise ValueError(f"limiting_profiles are incomplete: missing boundaries {sorted(missing)}")
    if len(normalized) != len(categories) - 1:
        raise ValueError("limiting_profiles must contain exactly one profile per category boundary")

    normalized.sort(key=lambda item: category_index[item["lowerCategoryId"]])
    return normalized


def _normalize_multiple_profile_comparisons(
    comparisons: Any,
    *,
    criteria: list[dict[str, str]],
    alternatives: list[dict[str, str]],
    profile_ids: set[str],
) -> dict[tuple[str, str, str], float]:
    if not isinstance(comparisons, list):
        raise ValueError("comparisons must be a list")

    criterion_ids = {criterion["id"] for criterion in criteria}
    alternative_ids = {alternative["id"] for alternative in alternatives}
    expected = {
        (alternative_id, criterion_id, profile_id)
        for alternative_id in alternative_ids
        for criterion_id in criterion_ids
        for profile_id in profile_ids
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
        key = (
            _non_empty_string(comparison.get("alternativeId")),
            _non_empty_string(comparison.get("criterionId")),
            _non_empty_string(comparison.get("profileId")),
        )
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
            "alternative/criterion/profile comparisons are present"
        )
    return values


def _normalize_profile_comparisons(
    comparisons: Any,
    *,
    criteria: list[dict[str, str]],
    profiles: list[dict[str, str]],
) -> dict[tuple[str, str, str], float]:
    if not isinstance(comparisons, list):
        raise ValueError("profile_comparisons must be a list")

    criterion_ids = {criterion["id"] for criterion in criteria}
    profile_ids = {profile["profileId"] for profile in profiles}
    expected = {
        (criterion_id, first_profile_id, second_profile_id)
        for criterion_id in criterion_ids
        for first_profile_id in profile_ids
        for second_profile_id in profile_ids
        if first_profile_id < second_profile_id
    }
    values: dict[tuple[str, str, str], float] = {}
    for index, comparison in enumerate(comparisons):
        field = f"profile_comparisons[{index}]"
        if not isinstance(comparison, dict) or set(comparison) != {
            "criterionId",
            "firstProfileId",
            "secondProfileId",
            "firstToSecond",
        }:
            raise ValueError(
                f"{field} must contain criterionId, firstProfileId, secondProfileId and firstToSecond"
            )
        criterion_id = _non_empty_string(comparison.get("criterionId"))
        first_profile_id = _non_empty_string(comparison.get("firstProfileId"))
        second_profile_id = _non_empty_string(comparison.get("secondProfileId"))
        if (
            criterion_id not in criterion_ids
            or first_profile_id not in profile_ids
            or second_profile_id not in profile_ids
        ):
            raise ValueError(f"{field} references an unknown criterion or profile id")
        if first_profile_id == second_profile_id:
            raise ValueError(f"{field} cannot compare a profile with itself")

        # Canonicalize each unordered pair by ID. If the input orientation is
        # reversed, store its mathematical reciprocal so records stay unique.
        if first_profile_id < second_profile_id:
            key = (criterion_id, first_profile_id, second_profile_id)
            value = _normalize_judgment(comparison.get("firstToSecond"), f"{field}.firstToSecond")
        else:
            key = (criterion_id, second_profile_id, first_profile_id)
            value = 1.0 / _normalize_judgment(
                comparison.get("firstToSecond"), f"{field}.firstToSecond"
            )
        if key in values:
            raise ValueError(f"{field} duplicates an unordered criterion/profile pair")
        values[key] = value

    missing = expected - set(values)
    if missing:
        raise ValueError(
            f"profile_comparisons are incomplete: {len(values)} of {len(expected)} "
            "criterion/profile pairs are present"
        )
    return values


def _build_multiple_profile_matrix(
    *,
    alternative_id: str,
    criterion_id: str,
    profiles: list[dict[str, str]],
    alternative_judgments: dict[tuple[str, str, str], float],
    profile_judgments: dict[tuple[str, str, str], float],
) -> list[list[float]]:
    matrix_size = len(profiles) + 1
    matrix = [[1.0 for _ in range(matrix_size)] for _ in range(matrix_size)]
    profile_index = {profile["profileId"]: index + 1 for index, profile in enumerate(profiles)}

    for profile in profiles:
        profile_id = profile["profileId"]
        index = profile_index[profile_id]
        alternative_to_profile = alternative_judgments[(alternative_id, criterion_id, profile_id)]
        matrix[0][index] = alternative_to_profile
        matrix[index][0] = 1.0 / alternative_to_profile

    for first_profile in profiles:
        for second_profile in profiles:
            first_id = first_profile["profileId"]
            second_id = second_profile["profileId"]
            if first_id == second_id:
                continue
            if first_id < second_id:
                ratio = profile_judgments[(criterion_id, first_id, second_id)]
            else:
                ratio = 1.0 / profile_judgments[(criterion_id, second_id, first_id)]
            first_index = profile_index[first_id]
            second_index = profile_index[second_id]
            matrix[first_index][second_index] = ratio

    return matrix


def _solve_local_pairwise_matrix(matrix: list[list[float]]) -> tuple[list[float], dict[str, Any]]:
    """Solve a complete local AHP matrix using the existing AHP implementation."""

    size = len(matrix)
    if size == 2:
        # Keep Phase 1A's exact binary formula and its not-applicable CR rules.
        _, alternative_priority, profile_priority = _binary_local_priorities(matrix[0][1])
        return [alternative_priority, profile_priority], {
            "lambdaMax": 2.0,
            "consistencyIndex": None,
            "randomIndex": None,
            "consistencyRatio": None,
            "consistencyStatus": "not_applicable",
        }

    if size > MAX_SUPPORTED_LOCAL_MATRIX_SIZE:
        raise ValueError(
            "AHPSort I local AHP matrices are supported up to "
            f"{MAX_SUPPORTED_LOCAL_MATRIX_SIZE} elements by the existing Saaty RI table"
        )

    entities = [
        {"id": f"entity-{index}", "name": f"AHPSort I entity {index}"}
        for index in range(size)
    ]
    judgments = [
        {
            "criterionId": entities[row]["id"],
            "comparedCriterionId": entities[column]["id"],
            "value": matrix[row][column],
        }
        for row in range(size)
        for column in range(row + 1, size)
    ]
    solved = run_ahp_criteria_weights(
        context={"criteria": entities},
        evaluations=[
            {
                "expert": {"id": "ahpsort-i-local-matrix"},
                "payload": {"comparisons": judgments},
            }
        ],
    )["expertResultsByExpert"]["ahpsort-i-local-matrix"]
    priorities = [solved["weightsByCriterion"][entity["id"]] for entity in entities]
    diagnostics = {
        key: solved[key]
        for key in (
            "lambdaMax",
            "consistencyIndex",
            "randomIndex",
            "consistencyRatio",
            "consistencyStatus",
        )
    }
    return priorities, diagnostics


def _assign_category_from_ordered_profiles(
    *,
    alternative_priority: float,
    profile_priorities: dict[str, float],
    profiles: list[dict[str, str]],
    categories: list[dict[str, str]],
) -> dict[str, str]:
    for boundary_index, profile in enumerate(profiles):
        threshold = profile_priorities[profile["profileId"]]
        if threshold - alternative_priority > CLASSIFICATION_TIE_TOLERANCE:
            return categories[boundary_index]
    return categories[-1]


def _validate_profile_order(
    *, alternative_id: str, profiles: list[dict[str, str]], profile_priorities: dict[str, float]
) -> None:
    for boundary_index in range(len(profiles) - 1):
        lower_profile = profiles[boundary_index]
        upper_profile = profiles[boundary_index + 1]
        lower_priority = profile_priorities[lower_profile["profileId"]]
        upper_priority = profile_priorities[upper_profile["profileId"]]
        if upper_priority - lower_priority <= PROFILE_ORDER_TOLERANCE:
            raise AHPSortIProfileOrderError(
                alternative_id=alternative_id,
                lower_profile_id=lower_profile["profileId"],
                upper_profile_id=upper_profile["profileId"],
                lower_priority=lower_priority,
                upper_priority=upper_priority,
            )


def run_ahp_sort_i_multiple_profiles(
    *,
    criteria: Any,
    categories: Any,
    alternatives: Any,
    limiting_profiles: Any,
    criterion_weights_by_id: Any,
    comparisons: Any,
    profile_comparisons: Any,
) -> dict[str, Any]:
    """Classify alternatives using a full AHP matrix and ordered boundaries.

    Categories are ordered least-to-most preferred. Each boundary profile is
    identified by its stable ID and the adjacent category IDs it separates.
    ``comparisons`` contain alternative/profile judgments specific to an
    alternative. ``profile_comparisons`` contain one criterion-scoped judgment
    for each unordered profile pair, reused in every alternative's matrix.
    Every local matrix is solved afresh. Exact or numerically indistinguishable
    equality with a boundary is assigned to the more preferred adjacent category.
    """

    normalized_criteria = _normalize_entities(criteria, field="criteria")
    normalized_categories = _normalize_entities(categories, field="categories")
    normalized_alternatives = _normalize_entities(alternatives, field="alternatives")
    normalized_profiles = _normalize_limiting_profiles(limiting_profiles, normalized_categories)
    if len(normalized_profiles) + 1 > MAX_SUPPORTED_LOCAL_MATRIX_SIZE:
        raise ValueError(
            "AHPSort I local AHP matrices are supported up to "
            f"{MAX_SUPPORTED_LOCAL_MATRIX_SIZE} elements by the existing Saaty RI table"
        )

    weights = _normalize_weights(criterion_weights_by_id, normalized_criteria)
    alternative_judgments = _normalize_multiple_profile_comparisons(
        comparisons,
        criteria=normalized_criteria,
        alternatives=normalized_alternatives,
        profile_ids={profile["profileId"] for profile in normalized_profiles},
    )
    profile_judgments = _normalize_profile_comparisons(
        profile_comparisons,
        criteria=normalized_criteria,
        profiles=normalized_profiles,
    )

    results_by_alternative: dict[str, dict[str, Any]] = {}
    for alternative in normalized_alternatives:
        alternative_id = alternative["id"]
        local_priorities_by_criterion: dict[str, dict[str, Any]] = {}
        weighted_contributions_by_criterion: dict[str, dict[str, Any]] = {}
        alternative_contributions: list[float] = []
        profile_contributions = {
            profile["profileId"]: [] for profile in normalized_profiles
        }

        for criterion in normalized_criteria:
            criterion_id = criterion["id"]
            matrix = _build_multiple_profile_matrix(
                alternative_id=alternative_id,
                criterion_id=criterion_id,
                profiles=normalized_profiles,
                alternative_judgments=alternative_judgments,
                profile_judgments=profile_judgments,
            )
            priorities, diagnostics = _solve_local_pairwise_matrix(matrix)
            local_profiles = {
                profile["profileId"]: priorities[index + 1]
                for index, profile in enumerate(normalized_profiles)
            }
            weight = weights[criterion_id]
            local_priorities_by_criterion[criterion_id] = {
                "pairwiseMatrix": matrix,
                "entityOrder": [
                    {"entityType": "alternative", "alternativeId": alternative_id},
                    *[
                        {"entityType": "profile", "profileId": profile["profileId"]}
                        for profile in normalized_profiles
                    ],
                ],
                "alternativeToProfileJudgments": {
                    profile["profileId"]: alternative_judgments[
                        (alternative_id, criterion_id, profile["profileId"])
                    ]
                    for profile in normalized_profiles
                },
                "alternative": priorities[0],
                "profilesById": local_profiles,
                "consistency": diagnostics,
            }
            weighted_contributions_by_criterion[criterion_id] = {
                "alternative": weight * priorities[0],
                "profilesById": {
                    profile_id: weight * priority
                    for profile_id, priority in local_profiles.items()
                },
            }
            alternative_contributions.append(weight * priorities[0])
            for profile_id, priority in local_profiles.items():
                profile_contributions[profile_id].append(weight * priority)

        alternative_priority = math.fsum(alternative_contributions)
        profile_priorities = {
            profile["profileId"]: math.fsum(profile_contributions[profile["profileId"]])
            for profile in normalized_profiles
        }
        _validate_profile_order(
            alternative_id=alternative_id,
            profiles=normalized_profiles,
            profile_priorities=profile_priorities,
        )

        assigned_category = _assign_category_from_ordered_profiles(
            alternative_priority=alternative_priority,
            profile_priorities=profile_priorities,
            profiles=normalized_profiles,
            categories=normalized_categories,
        )

        results_by_alternative[alternative_id] = {
            "alternativeId": alternative_id,
            "categoryId": assigned_category["id"],
            "localPrioritiesByCriterion": local_priorities_by_criterion,
            "weightsByCriterion": dict(weights),
            "weightedContributionsByCriterion": weighted_contributions_by_criterion,
            "globalPriority": alternative_priority,
            "profileGlobalPrioritiesById": profile_priorities,
            "assignmentRule": "ordered_limiting_profiles_equal_goes_to_more_preferred_category",
        }

    return {
        "criteria": normalized_criteria,
        "categories": normalized_categories,
        "limitingProfiles": normalized_profiles,
        "criterionWeightsById": weights,
        "resultsByAlternative": results_by_alternative,
    }
