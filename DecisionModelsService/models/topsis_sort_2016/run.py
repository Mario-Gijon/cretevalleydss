"""Pure mathematical core for Sabokbar et al.'s original TOPSIS-Sort (2016).

The procedure uses the max-based, benefit/cost-oriented normalization in Eq. (7),
then the weighted TOPSIS ideal, Euclidean distance, and relative-closeness steps
in Eqs. (2)--(6). It deliberately does not call the classic TOPSIS executor.
"""

from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from numbers import Real
from typing import Any

import numpy as np


class TopsisSort2016Error(ValueError):
    """Base class for invalid or mathematically undefined TOPSIS-Sort input."""


class UndefinedNormalizationError(TopsisSort2016Error):
    """Raised when Eq. (7) has no positive column maximum to divide by."""


class UndefinedClosenessError(TopsisSort2016Error):
    """Raised when the relative-closeness denominator is zero or non-finite."""


class ProfileBoundaryTieError(TopsisSort2016Error):
    """Raised when strict Eq. (8) leaves an alternative on a profile boundary."""


class AssignmentUndeterminedError(TopsisSort2016Error):
    """Raised when profile closeness values do not define a unique class."""


_DIRECTIONS = {"benefit", "cost"}
_WEIGHT_SUM_TOL = 1e-12


def _identifier(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise TopsisSort2016Error(f"{field} must be a non-empty string ID")
    return value.strip()


def _number(value: Any, field: str) -> float:
    if isinstance(value, bool) or not isinstance(value, Real):
        raise TopsisSort2016Error(f"{field} must be a finite numeric value")
    try:
        number = float(value)
    except (OverflowError, TypeError, ValueError) as error:
        raise TopsisSort2016Error(f"{field} must be a finite numeric value") from error
    if not math.isfinite(number):
        raise TopsisSort2016Error(f"{field} must be a finite numeric value")
    return number


def _unique_ids(values: Sequence[str], field: str) -> None:
    if len(values) != len(set(values)):
        raise TopsisSort2016Error(f"{field} must be unique")


def _criterion_inputs(
    criteria: Sequence[Mapping[str, Any]],
) -> tuple[list[str], list[str], np.ndarray, list[tuple[float, float] | None]]:
    if (
        not isinstance(criteria, Sequence)
        or isinstance(criteria, (str, bytes))
        or not criteria
    ):
        raise TopsisSort2016Error("criteria must contain at least one criterion")

    criterion_ids: list[str] = []
    directions: list[str] = []
    weights: list[float] = []
    domains: list[tuple[float, float] | None] = []
    for index, criterion in enumerate(criteria):
        if not isinstance(criterion, Mapping):
            raise TopsisSort2016Error(f"criteria[{index}] must be an object")
        criterion_id = _identifier(
            criterion.get("criterion_id"), f"criteria[{index}].criterion_id"
        )
        direction = criterion.get("direction")
        if not isinstance(direction, str) or direction not in _DIRECTIONS:
            raise TopsisSort2016Error(
                f"criterion '{criterion_id}' direction must be 'benefit' or 'cost'"
            )
        weight = _number(
            criterion.get("weight"), f"criterion '{criterion_id}' weight"
        )
        if weight < 0:
            raise TopsisSort2016Error(
                f"criterion '{criterion_id}' weight cannot be negative"
            )

        minimum = criterion.get("minimum")
        maximum = criterion.get("maximum")
        if (minimum is None) != (maximum is None):
            raise TopsisSort2016Error(
                f"criterion '{criterion_id}' must provide both minimum and maximum or neither"
            )
        domain = None
        if minimum is not None:
            lower = _number(minimum, f"criterion '{criterion_id}' minimum")
            upper = _number(maximum, f"criterion '{criterion_id}' maximum")
            if lower > upper:
                raise TopsisSort2016Error(
                    f"criterion '{criterion_id}' minimum must not exceed maximum"
                )
            domain = (lower, upper)

        criterion_ids.append(criterion_id)
        directions.append(direction)
        weights.append(weight)
        domains.append(domain)

    _unique_ids(criterion_ids, "criterion IDs")
    weight_array = np.asarray(weights, dtype=float)
    weight_sum = float(weight_array.sum())
    if not math.isclose(weight_sum, 1.0, rel_tol=0.0, abs_tol=_WEIGHT_SUM_TOL):
        raise TopsisSort2016Error("criterion weights must sum to 1")
    return criterion_ids, directions, weight_array, domains


def _category_inputs(
    categories: Sequence[Mapping[str, Any]],
) -> list[dict[str, Any]]:
    if (
        not isinstance(categories, Sequence)
        or isinstance(categories, (str, bytes))
        or len(categories) < 2
    ):
        raise TopsisSort2016Error("at least two ordered categories are required")

    normalized: list[dict[str, Any]] = []
    for index, category in enumerate(categories):
        if not isinstance(category, Mapping):
            raise TopsisSort2016Error(f"categories[{index}] must be an object")
        category_id = _identifier(
            category.get("category_id"), f"categories[{index}].category_id"
        )
        label = category.get("label")
        if not isinstance(label, str):
            raise TopsisSort2016Error(f"category '{category_id}' label must be a string")
        order_value = category.get("order")
        if isinstance(order_value, bool) or not isinstance(order_value, int):
            raise TopsisSort2016Error(f"category '{category_id}' order must be an integer")
        normalized.append(
            {"category_id": category_id, "label": label, "order": order_value}
        )

    _unique_ids([category["category_id"] for category in normalized], "category IDs")
    normalized.sort(key=lambda category: category["order"])
    if [category["order"] for category in normalized] != list(range(len(normalized))):
        raise TopsisSort2016Error(
            "category orders must be consecutive integers beginning at 0"
        )
    return normalized


def _value_rows(
    rows: Sequence[Mapping[str, Any]],
    *,
    row_id_field: str,
    row_label: str,
    criterion_ids: Sequence[str],
    domains: Sequence[tuple[float, float] | None],
) -> tuple[list[str], np.ndarray]:
    if not isinstance(rows, Sequence) or isinstance(rows, (str, bytes)) or not rows:
        raise TopsisSort2016Error(f"{row_label} must contain at least one row")

    row_ids: list[str] = []
    matrix_rows: list[list[float]] = []
    expected_criterion_ids = set(criterion_ids)
    for row_index, row in enumerate(rows):
        if not isinstance(row, Mapping):
            raise TopsisSort2016Error(f"{row_label}[{row_index}] must be an object")
        row_id = _identifier(
            row.get(row_id_field), f"{row_label}[{row_index}].{row_id_field}"
        )
        values = row.get("values_by_criterion_id")
        if not isinstance(values, Mapping):
            raise TopsisSort2016Error(
                f"{row_label} '{row_id}' values_by_criterion_id must be an object"
            )
        if any(not isinstance(value_id, str) for value_id in values):
            raise TopsisSort2016Error(
                f"{row_label} '{row_id}' criterion IDs must be strings"
            )
        provided_ids = set(values)
        if provided_ids != expected_criterion_ids:
            missing = sorted(expected_criterion_ids - provided_ids)
            unknown = sorted(provided_ids - expected_criterion_ids)
            raise TopsisSort2016Error(
                f"{row_label} '{row_id}' criterion IDs do not match; "
                f"missing={missing}, unknown={unknown}"
            )

        parsed_row = []
        for column, criterion_id in enumerate(criterion_ids):
            value = _number(
                values[criterion_id],
                f"{row_label} '{row_id}' value for criterion '{criterion_id}'",
            )
            domain = domains[column]
            if domain is not None and not domain[0] <= value <= domain[1]:
                raise TopsisSort2016Error(
                    f"{row_label} '{row_id}' value for criterion '{criterion_id}' "
                    f"must be within numeric domain [{domain[0]}, {domain[1]}]"
                )
            parsed_row.append(value)
        row_ids.append(row_id)
        matrix_rows.append(parsed_row)

    _unique_ids(row_ids, f"{row_label} IDs")
    return row_ids, np.asarray(matrix_rows, dtype=float)


def normalize_eq7(
    matrix: Sequence[Sequence[float]] | np.ndarray,
    directions: Sequence[str],
) -> tuple[np.ndarray, np.ndarray]:
    """Normalize rows using Eq. (7); the matrix must already include profiles.

    Benefit criteria use x/max(x). Cost criteria use 1 - x/max(x). The latter
    reverses the cost axis so every transformed coordinate increases with
    preference. Negative observations are accepted when the shared column
    maximum remains positive; such output can lie outside [0, 1], exactly as
    the stated algebra implies. A non-positive maximum reverses or destroys
    the intended scale and is rejected.
    """

    values = np.asarray(matrix, dtype=float)
    if values.ndim != 2 or values.shape[0] == 0 or values.shape[1] == 0:
        raise TopsisSort2016Error(
            "matrix must be a non-empty two-dimensional numeric matrix"
        )
    if len(directions) != values.shape[1] or any(
        not isinstance(direction, str) or direction not in _DIRECTIONS
        for direction in directions
    ):
        raise TopsisSort2016Error(
            "directions must specify benefit or cost for each matrix column"
        )
    if not np.isfinite(values).all():
        raise TopsisSort2016Error("matrix values must be finite")

    maxima = values.max(axis=0)
    invalid = np.flatnonzero(maxima <= 0)
    if invalid.size:
        raise UndefinedNormalizationError(
            "Eq. (7) requires a positive maximum in every criterion; "
            f"undefined criterion column(s): {invalid.tolist()}"
        )

    normalized = values / maxima
    for column, direction in enumerate(directions):
        if direction == "cost":
            normalized[:, column] = 1.0 - normalized[:, column]
    if not np.isfinite(normalized).all():
        raise UndefinedNormalizationError("Eq. (7) produced a non-finite normalized value")
    return normalized, maxima


def weighted_normalized_matrix(
    normalized_matrix: Sequence[Sequence[float]] | np.ndarray,
    weights: Sequence[float] | np.ndarray,
) -> np.ndarray:
    """Apply Eq. (2), multiplying each normalized criterion by its weight."""

    normalized = np.asarray(normalized_matrix, dtype=float)
    weight_values = np.asarray(weights, dtype=float)
    if normalized.ndim != 2 or weight_values.ndim != 1:
        raise TopsisSort2016Error(
            "normalized matrix and weights must have compatible dimensions"
        )
    if normalized.shape[1] != weight_values.size:
        raise TopsisSort2016Error("weight count must match the number of criteria")
    if not np.isfinite(normalized).all() or not np.isfinite(weight_values).all():
        raise TopsisSort2016Error("normalized matrix and weights must be finite")
    if np.any(weight_values < 0):
        raise TopsisSort2016Error("weights cannot be negative")
    if not math.isclose(
        float(weight_values.sum()), 1.0, rel_tol=0.0, abs_tol=_WEIGHT_SUM_TOL
    ):
        raise TopsisSort2016Error("criterion weights must sum to 1")
    return normalized * weight_values


def calculate_euclidean_distances(
    matrix: Sequence[Sequence[float]] | np.ndarray,
    reference: Sequence[float] | np.ndarray,
) -> np.ndarray:
    """Calculate Euclidean distances to an ideal vector using Eqs. (4) or (5)."""

    values = np.asarray(matrix, dtype=float)
    point = np.asarray(reference, dtype=float)
    if values.ndim != 2 or point.ndim != 1 or values.shape[1] != point.size:
        raise TopsisSort2016Error("matrix and reference vector have incompatible dimensions")
    if not np.isfinite(values).all() or not np.isfinite(point).all():
        raise TopsisSort2016Error("distance inputs must be finite")
    distances = np.linalg.norm(values - point, axis=1)
    if not np.isfinite(distances).all():
        raise TopsisSort2016Error("Euclidean distance calculation produced a non-finite value")
    return distances


def calculate_closeness_coefficients(
    distance_to_ideal: Sequence[float] | np.ndarray,
    distance_to_anti_ideal: Sequence[float] | np.ndarray,
) -> np.ndarray:
    """Calculate Eq. (6), D- / (D+ + D-), for alternatives and profiles."""

    positive = np.asarray(distance_to_ideal, dtype=float)
    negative = np.asarray(distance_to_anti_ideal, dtype=float)
    if (
        positive.ndim != 1
        or negative.ndim != 1
        or positive.shape != negative.shape
    ):
        raise TopsisSort2016Error("ideal and anti-ideal distances must be equal-length vectors")
    if not np.isfinite(positive).all() or not np.isfinite(negative).all():
        raise TopsisSort2016Error("ideal and anti-ideal distances must be finite")
    if np.any(positive < 0) or np.any(negative < 0):
        raise TopsisSort2016Error("distances cannot be negative")
    denominator = positive + negative
    if not np.isfinite(denominator).all():
        raise UndefinedClosenessError("Eq. (6) has a non-finite denominator")
    undefined = np.flatnonzero(denominator == 0)
    if undefined.size:
        raise UndefinedClosenessError(
            "Eq. (6) is undefined when both ideal distances are zero; "
            f"undefined row(s): {undefined.tolist()}"
        )
    closeness = negative / denominator
    if not np.isfinite(closeness).all():
        raise UndefinedClosenessError("Eq. (6) produced a non-finite closeness coefficient")
    return closeness


def _assign_order(
    *,
    alternative_id: str,
    closeness: float,
    categories: Sequence[Mapping[str, Any]],
    profile_rows: Sequence[Mapping[str, Any]],
    profile_closeness_by_id: Mapping[str, float],
    boundary_profile_by_category: Mapping[str, Mapping[str, Any]],
) -> int:
    """Apply Eq. (8)'s strict intervals; equalities are deliberately errors."""

    for profile in profile_rows:
        profile_id = profile["profile_id"]
        boundary = profile_closeness_by_id[profile_id]
        if closeness == boundary:
            raise ProfileBoundaryTieError(
                f"alternative '{alternative_id}' has closeness {closeness:.17g} "
                f"equal to boundary profile '{profile_id}' ({boundary:.17g}); "
                "Eq. (8) uses strict inequalities and defines no assignment for equality"
            )

    thresholds: dict[int, float] = {}
    for category in categories[1:]:
        profile = boundary_profile_by_category[category["category_id"]]
        thresholds[category["order"]] = profile_closeness_by_id[profile["profile_id"]]

    for order in range(len(categories) - 1):
        lower = -math.inf if order == 0 else thresholds[order]
        upper = thresholds[order + 1]
        if lower < closeness < upper:
            return order
    if closeness > thresholds[len(categories) - 1]:
        return len(categories) - 1
    raise AssignmentUndeterminedError(
        f"alternative '{alternative_id}' closeness {closeness:.17g} "
        "does not fall in exactly one strict profile interval"
    )


def run_topsis_sort_2016(
    *,
    alternatives: Sequence[Mapping[str, Any]],
    criteria: Sequence[Mapping[str, Any]],
    profiles: Sequence[Mapping[str, Any]],
    categories: Sequence[Mapping[str, Any]],
) -> dict[str, Any]:
    """Classify alternatives with TOPSIS-Sort as formulated in the 2016 paper.

    ``categories`` follow the application's order convention: order zero is
    least preferred, and increasing order is more preferred. ``profiles`` are
    raw criterion-space limits. ``profile.category_id`` names the category
    entered at that boundary, matching the existing boundaryProfiles shape.
    """

    category_rows = _category_inputs(categories)
    criterion_ids, directions, weights, domains = _criterion_inputs(criteria)
    alternative_ids, alternative_matrix = _value_rows(
        alternatives,
        row_id_field="alternative_id",
        row_label="alternatives",
        criterion_ids=criterion_ids,
        domains=domains,
    )
    profile_ids, profile_matrix = _value_rows(
        profiles,
        row_id_field="profile_id",
        row_label="profiles",
        criterion_ids=criterion_ids,
        domains=domains,
    )
    profile_rows = [
        {
            "profile_id": profile_id,
            "category_id": _identifier(
                profile.get("category_id"), f"profiles[{index}].category_id"
            ),
            "values_by_criterion_id": {
                criterion_id: float(profile_matrix[index, column])
                for column, criterion_id in enumerate(criterion_ids)
            },
        }
        for index, (profile_id, profile) in enumerate(zip(profile_ids, profiles))
    ]

    expected_boundary_category_ids = [
        category["category_id"] for category in category_rows[1:]
    ]
    profile_by_category: dict[str, Mapping[str, Any]] = {}
    for profile in profile_rows:
        category_id = profile["category_id"]
        if category_id in profile_by_category:
            raise TopsisSort2016Error(
                f"multiple boundary profiles identify category '{category_id}'"
            )
        profile_by_category[category_id] = profile
    if len(profile_rows) != len(expected_boundary_category_ids):
        raise TopsisSort2016Error(
            f"exactly {len(expected_boundary_category_ids)} boundary profiles are required "
            f"for {len(category_rows)} categories"
        )
    if set(profile_by_category) != set(expected_boundary_category_ids):
        raise TopsisSort2016Error(
            "each profile category_id must identify the category entered at one "
            "boundary after the least-preferred category"
        )
    ordered_profiles = [
        profile_by_category[category_id] for category_id in expected_boundary_category_ids
    ]
    ordered_profile_ids = [profile["profile_id"] for profile in ordered_profiles]
    ordered_profile_matrix = np.asarray(
        [
            [
                float(profile["values_by_criterion_id"][criterion_id])
                for criterion_id in criterion_ids
            ]
            for profile in ordered_profiles
        ],
        dtype=float,
    )

    # boundaryProfiles are expected to move monotonically from the least-
    # preferred category toward the more-preferred categories.
    for index in range(1, len(ordered_profiles)):
        less_preferred = ordered_profiles[index - 1]
        more_preferred = ordered_profiles[index]
        strict_preference = False
        for column, direction in enumerate(directions):
            previous = ordered_profile_matrix[index - 1, column]
            following = ordered_profile_matrix[index, column]
            monotone = following >= previous if direction == "benefit" else following <= previous
            if not monotone:
                raise TopsisSort2016Error(
                    f"profiles '{less_preferred['profile_id']}' and "
                    f"'{more_preferred['profile_id']}' violate preference order "
                    f"for criterion '{criterion_ids[column]}'"
                )
            strict_preference = strict_preference or following != previous
        if not strict_preference:
            raise TopsisSort2016Error(
                f"profiles '{less_preferred['profile_id']}' and "
                f"'{more_preferred['profile_id']}' must differ on at least one criterion"
            )

    # Step 3 of the 2016 procedure adds profiles before Eq. (7), so they take
    # part in the normalization maxima and in the ideal/anti-ideal vectors.
    combined_matrix = np.vstack((alternative_matrix, ordered_profile_matrix))
    normalized, maxima = normalize_eq7(combined_matrix, directions)
    weighted = weighted_normalized_matrix(normalized, weights)

    # Eq. (7) reverses cost coordinates, so larger is preferred in every
    # transformed dimension. These are Eq. (3)'s ideal and anti-ideal vectors.
    positive_ideal = weighted.max(axis=0)
    negative_ideal = weighted.min(axis=0)
    distance_to_ideal = calculate_euclidean_distances(weighted, positive_ideal)
    distance_to_anti_ideal = calculate_euclidean_distances(weighted, negative_ideal)
    closeness = calculate_closeness_coefficients(distance_to_ideal, distance_to_anti_ideal)

    profile_closeness_by_id = {
        profile_id: float(closeness[len(alternative_ids) + index])
        for index, profile_id in enumerate(ordered_profile_ids)
    }
    ordered_profile_closeness = [
        profile_closeness_by_id[profile_id] for profile_id in ordered_profile_ids
    ]
    for index, (previous, following) in enumerate(
        zip(ordered_profile_closeness, ordered_profile_closeness[1:])
    ):
        if following <= previous:
            less_preferred = ordered_profiles[index]
            more_preferred = ordered_profiles[index + 1]
            relation = "equal" if following == previous else "decrease"
            raise AssignmentUndeterminedError(
                f"consecutive profiles '{less_preferred['profile_id']}' and "
                f"'{more_preferred['profile_id']}' have {relation} closeness "
                f"values ({previous:.17g}, {following:.17g}); Eq. (8) requires "
                "strictly increasing profile limits to delimit every category"
            )
    boundary_profile_by_category = {
        profile["category_id"]: profile for profile in ordered_profiles
    }
    assignments = []
    for index, alternative_id in enumerate(alternative_ids):
        order = _assign_order(
            alternative_id=alternative_id,
            closeness=float(closeness[index]),
            categories=category_rows,
            profile_rows=ordered_profiles,
            profile_closeness_by_id=profile_closeness_by_id,
            boundary_profile_by_category=boundary_profile_by_category,
        )
        assignments.append(
            {
                "alternative_id": alternative_id,
                "category_id": category_rows[order]["category_id"],
            }
        )

    def criterion_map(row: np.ndarray) -> dict[str, float]:
        return {criterion_id: float(row[index]) for index, criterion_id in enumerate(criterion_ids)}

    normalized_by_alternative_id = {
        alternative_id: criterion_map(normalized[index])
        for index, alternative_id in enumerate(alternative_ids)
    }
    normalized_by_profile_id = {
        profile_id: criterion_map(normalized[len(alternative_ids) + index])
        for index, profile_id in enumerate(ordered_profile_ids)
    }
    weighted_by_alternative_id = {
        alternative_id: criterion_map(weighted[index])
        for index, alternative_id in enumerate(alternative_ids)
    }
    weighted_by_profile_id = {
        profile_id: criterion_map(weighted[len(alternative_ids) + index])
        for index, profile_id in enumerate(ordered_profile_ids)
    }
    distance_by_alternative_id = {
        alternative_id: {
            "to_positive_ideal": float(distance_to_ideal[index]),
            "to_negative_ideal": float(distance_to_anti_ideal[index]),
        }
        for index, alternative_id in enumerate(alternative_ids)
    }
    distance_by_profile_id = {
        profile_id: {
            "to_positive_ideal": float(distance_to_ideal[len(alternative_ids) + index]),
            "to_negative_ideal": float(distance_to_anti_ideal[len(alternative_ids) + index]),
        }
        for index, profile_id in enumerate(ordered_profile_ids)
    }
    closeness_by_alternative_id = {
        alternative_id: float(closeness[index])
        for index, alternative_id in enumerate(alternative_ids)
    }
    closeness_by_profile_id = {
        profile_id: float(closeness[len(alternative_ids) + index])
        for index, profile_id in enumerate(ordered_profile_ids)
    }
    article_class_by_category_id = {
        category["category_id"]: f"C{len(category_rows) - category['order']}"
        for category in category_rows
    }

    return {
        "categories": category_rows,
        "category_order_semantics": "lower-order-is-less-preferred",
        "assignments": assignments,
        "diagnostics": {
            "method": "TOPSIS-Sort (Sabokbar et al., 2016)",
            "normalized_values_by_alternative_id": normalized_by_alternative_id,
            "normalized_values_by_profile_id": normalized_by_profile_id,
            "weighted_values_by_alternative_id": weighted_by_alternative_id,
            "weighted_values_by_profile_id": weighted_by_profile_id,
            "normalization_maxima_by_criterion_id": {
                criterion_id: float(maxima[index])
                for index, criterion_id in enumerate(criterion_ids)
            },
            "positive_ideal_by_criterion_id": criterion_map(positive_ideal),
            "negative_ideal_by_criterion_id": criterion_map(negative_ideal),
            "distances_by_alternative_id": distance_by_alternative_id,
            "distances_by_profile_id": distance_by_profile_id,
            "closeness_by_alternative_id": closeness_by_alternative_id,
            "closeness_by_profile_id": closeness_by_profile_id,
            "article_class_by_category_id": article_class_by_category_id,
        },
    }
