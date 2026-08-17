"""
2-Tuple Linguistic TOPSIS
=========================

This module implements the 2-tuple linguistic TOPSIS method used by the
decision model. The implementation keeps the original linguistic meaning of
the evaluations while performing the TOPSIS calculations in the numeric
linguistic-position domain (beta).

Notation
--------

    i           alternative index
    j           criterion index
    k           expert index
    s_r         linguistic label at position r
    alpha       symbolic translation of a 2-tuple
    beta        numeric linguistic position
    lambda_k    weight of expert k
    w_j         weight of criterion j

1. 2-tuple linguistic representation
-------------------------------------

A linguistic assessment is represented as:

    (s_r, alpha),    -0.5 <= alpha < 0.5

The inverse symbolic translation maps the linguistic 2-tuple to its numeric
position:

    Delta^-1(s_r, alpha) = r + alpha = beta

The direct transformation maps beta back to a linguistic 2-tuple:

    Delta(beta) = (s_r, alpha)

with:

    r     = floor(beta + 0.5)
    alpha = beta - r

Half positions are assigned to the upper linguistic label. This guarantees
the interval:

    -0.5 <= alpha < 0.5


2. Aggregation of expert evaluations
------------------------------------

Each expert evaluation is first represented by its beta value. For every
alternative i and criterion j, the collective evaluation is the weighted
average of the expert evaluations:

    beta_ij = sum_k lambda_k * beta_ij^k

subject to:

    lambda_k >= 0
    sum_k lambda_k = 1

The resulting collective beta_ij is converted back to a linguistic 2-tuple
with Delta so both numeric and linguistic representations are preserved.


3. Positive and negative ideal solutions
----------------------------------------

For a benefit criterion (max):

    beta_j+ = max_i beta_ij
    beta_j- = min_i beta_ij

For a cost criterion (min):

    beta_j+ = min_i beta_ij
    beta_j- = max_i beta_ij

beta_j+ is the positive ideal and beta_j- is the negative ideal.


4. Weighted distances to the ideal solutions
---------------------------------------------

This implementation uses weighted L1 distance in the beta domain:

    D_i+ = sum_j w_j * |beta_ij - beta_j+|

    D_i- = sum_j w_j * |beta_ij - beta_j-|

subject to:

    w_j >= 0
    sum_j w_j = 1

This is intentionally a weighted absolute-distance formulation, not the
Euclidean-distance variant of TOPSIS.


5. TOPSIS relative closeness
----------------------------

For each alternative:

    C_i = D_i- / (D_i+ + D_i-)

A larger C_i indicates that the alternative is closer to the positive ideal
and farther from the negative ideal.

If both distances are zero:

    D_i+ = D_i- = 0

the implementation returns the symmetric neutral value:

    C_i = 0.5


6. Final ranking
----------------

Alternatives are ranked from highest to lowest closeness coefficient:

    C_(1) >= C_(2) >= ... >= C_(m)

Exact technical ties preserve the original alternative order.


Implementation conventions
--------------------------

- Calculations are performed internally with beta values.
- Linguistic 2-tuples are preserved in the returned result.
- Expert and criterion weights must be non-negative and sum to 1.
- All linguistic2Tuple criteria must use the same number of labels.
- The distance metric is weighted L1.
- The ranking is based only on the final TOPSIS closeness coefficients.
"""

import math
from typing import Any

from utils.get_plots_graphics_from_matrices import (
    get_plots_graphics_from_matrices,
)


FLOAT_TOLERANCE = 1e-12
WEIGHT_SUM_TOLERANCE = 1e-9


def _finite_number(value: Any, field: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field} must be a finite number")

    number = float(value)

    if not math.isfinite(number):
        raise ValueError(f"{field} must be a finite number")

    return number


def delta_inverse(
    *,
    label_index: int,
    alpha: float,
    maximum_index: int,
) -> float:
    """
    Apply the inverse 2-tuple transformation:

        Delta^-1(s_i, alpha) = i + alpha

    where:

        -0.5 <= alpha < 0.5

    The resulting beta must remain inside the linguistic term-set range:

        0 <= beta <= maximum_index
    """

    if isinstance(label_index, bool) or not isinstance(label_index, int):
        raise ValueError("label_index must be an integer")

    if isinstance(maximum_index, bool) or not isinstance(
        maximum_index,
        int,
    ):
        raise ValueError("maximum_index must be an integer")

    if maximum_index < 0:
        raise ValueError(
            "maximum_index must be greater than or equal to 0"
        )

    if label_index < 0 or label_index > maximum_index:
        raise ValueError(
            "label_index must be inside the linguistic scale"
        )

    normalized_alpha = _finite_number(alpha, "alpha")

    if normalized_alpha < -0.5 or normalized_alpha >= 0.5:
        raise ValueError(
            "alpha must be greater than or equal to -0.5 "
            "and less than 0.5"
        )

    # Delta^-1: move from the linguistic 2-tuple representation
    # (s_i, alpha) to the numeric linguistic position beta.
    beta = float(label_index + normalized_alpha)

    if (
        beta < -FLOAT_TOLERANCE
        or beta > maximum_index + FLOAT_TOLERANCE
    ):
        raise ValueError(
            "label_index and alpha produce an out-of-range "
            "linguistic position"
        )

    if abs(beta) <= FLOAT_TOLERANCE:
        beta = 0.0
    elif abs(beta - maximum_index) <= FLOAT_TOLERANCE:
        beta = float(maximum_index)

    return beta


def delta(
    *,
    beta: float,
    labels: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Apply the 2-tuple transformation:

        Delta(beta) = (s_i, alpha)

    Half values are assigned to the upper linguistic label so that:

        -0.5 <= alpha < 0.5

    Python's built-in round() is intentionally not used because its
    banker's-rounding semantics do not match the 2-tuple transformation.
    """

    if not isinstance(labels, list) or len(labels) == 0:
        raise ValueError("labels must be a non-empty list")

    normalized_beta = _finite_number(beta, "beta")
    maximum_index = len(labels) - 1

    if (
        normalized_beta < -FLOAT_TOLERANCE
        or normalized_beta > maximum_index + FLOAT_TOLERANCE
    ):
        raise ValueError(
            "beta must be inside the linguistic scale"
        )

    if normalized_beta < 0:
        normalized_beta = 0.0
    elif normalized_beta > maximum_index:
        normalized_beta = float(maximum_index)

    # Delta: choose the nearest linguistic label. Adding 0.5 before floor
    # makes exact half positions belong to the upper label, which keeps
    # alpha inside the canonical interval [-0.5, 0.5).
    label_index = math.floor(normalized_beta + 0.5)

    if label_index < 0:
        label_index = 0
    elif label_index > maximum_index:
        label_index = maximum_index

    # Symbolic translation relative to the selected linguistic label:
    # alpha = beta - i.
    alpha = float(normalized_beta - label_index)

    if abs(alpha) <= FLOAT_TOLERANCE:
        alpha = 0.0
    elif abs(alpha + 0.5) <= FLOAT_TOLERANCE:
        alpha = -0.5

    if alpha < -0.5 or alpha >= 0.5:
        raise ValueError(
            "Delta produced an invalid symbolic translation"
        )

    label_definition = labels[label_index]

    if not isinstance(label_definition, dict):
        raise ValueError(
            f"labels[{label_index}] must be an object"
        )

    label_key = str(
        label_definition.get("key") or ""
    ).strip()

    if not label_key:
        raise ValueError(
            f"labels[{label_index}].key is required"
        )

    return {
        "labelKey": label_key,
        "alpha": alpha,
    }


def _normalized_expert_weights(
    expert_weights: list[float],
    expert_count: int,
) -> list[float]:
    if not isinstance(expert_weights, list):
        raise ValueError("expert_weights must be a list")

    if len(expert_weights) != expert_count:
        raise ValueError(
            "expert_weights length must match the number of experts"
        )

    normalized: list[float] = []

    for index, raw_weight in enumerate(expert_weights):
        weight = _finite_number(
            raw_weight,
            f"expert_weights[{index}]",
        )

        if weight < 0:
            raise ValueError(
                f"expert_weights[{index}] must be greater "
                "than or equal to 0"
            )

        normalized.append(weight)

    total_weight = sum(normalized)

    if total_weight <= 0:
        raise ValueError(
            "expert_weights must contain at least one positive weight"
        )

    if abs(total_weight - 1.0) > WEIGHT_SUM_TOLERANCE:
        raise ValueError(
            "expert_weights must sum to 1"
        )

    return [
        float(weight / total_weight)
        for weight in normalized
    ]


def _criterion_scale_labels(
    scale: Any,
    criterion_index: int,
) -> list[dict[str, Any]]:
    if not isinstance(scale, dict):
        raise ValueError(
            f"criterion_scales[{criterion_index}] must be an object"
        )

    labels = scale.get("labels")

    if not isinstance(labels, list) or len(labels) == 0:
        raise ValueError(
            f"criterion_scales[{criterion_index}].labels "
            "must be a non-empty list"
        )

    return labels


def aggregate_expert_matrices(
    *,
    matrices: dict[str, list[list[float]]],
    expert_weights: list[float],
    criterion_scales: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Aggregate expert 2-tuple evaluations through their numeric beta
    representations.

    For each alternative i and criterion j:

        beta_ij = sum_k lambda_k * beta_ij^k

    where:

        lambda_k >= 0
        sum_k lambda_k = 1

    The resulting collective beta is converted back to a linguistic
    2-tuple with Delta.
    """

    if not isinstance(matrices, dict) or len(matrices) == 0:
        raise ValueError(
            "matrices must contain at least one expert matrix"
        )

    expert_items = list(matrices.items())

    weights = _normalized_expert_weights(
        expert_weights,
        len(expert_items),
    )

    first_expert_key, first_matrix = expert_items[0]

    if not isinstance(first_matrix, list) or len(first_matrix) == 0:
        raise ValueError(
            f"matrices['{first_expert_key}'] must be a non-empty matrix"
        )

    if not isinstance(first_matrix[0], list) or len(first_matrix[0]) == 0:
        raise ValueError(
            f"matrices['{first_expert_key}'][0] must be a non-empty row"
        )

    alternative_count = len(first_matrix)
    criterion_count = len(first_matrix[0])

    if not isinstance(criterion_scales, list):
        raise ValueError("criterion_scales must be a list")

    if len(criterion_scales) != criterion_count:
        raise ValueError(
            "criterion_scales length must match "
            "the number of criteria"
        )

    scale_labels = [
        _criterion_scale_labels(scale, index)
        for index, scale in enumerate(criterion_scales)
    ]

    granularities = {
        len(labels)
        for labels in scale_labels
    }

    if len(granularities) != 1:
        raise ValueError(
            "All linguistic2Tuple criteria must use "
            "the same number of linguistic labels"
        )

    # Step 1 — Expert aggregation.
    #
    # For every alternative i and criterion j:
    #
    #     beta_ij = sum_k lambda_k * beta_ij^k
    #
    # The accumulation below constructs the collective beta matrix directly
    # from the expert beta matrices and their normalized weights.
    collective_beta_matrix = [
        [0.0 for _ in range(criterion_count)]
        for _ in range(alternative_count)
    ]

    for expert_index, (expert_key, matrix) in enumerate(expert_items):
        if not isinstance(matrix, list):
            raise ValueError(
                f"matrices['{expert_key}'] must be a matrix"
            )

        if len(matrix) != alternative_count:
            raise ValueError(
                "All expert matrices must contain "
                "the same number of alternatives"
            )

        for alternative_index, row in enumerate(matrix):
            if not isinstance(row, list):
                raise ValueError(
                    f"matrices['{expert_key}']"
                    f"[{alternative_index}] must be a row"
                )

            if len(row) != criterion_count:
                raise ValueError(
                    "All expert matrices must contain "
                    "the same number of criteria"
                )

            for criterion_index, raw_beta in enumerate(row):
                beta = _finite_number(
                    raw_beta,
                    (
                        f"matrices['{expert_key}']"
                        f"[{alternative_index}]"
                        f"[{criterion_index}]"
                    ),
                )

                maximum_index = (
                    len(scale_labels[criterion_index]) - 1
                )

                if (
                    beta < -FLOAT_TOLERANCE
                    or beta > maximum_index + FLOAT_TOLERANCE
                ):
                    raise ValueError(
                        f"matrices['{expert_key}']"
                        f"[{alternative_index}]"
                        f"[{criterion_index}] is outside "
                        "the linguistic scale"
                    )

                if beta < 0:
                    beta = 0.0
                elif beta > maximum_index:
                    beta = float(maximum_index)

                collective_beta_matrix[
                    alternative_index
                ][criterion_index] += (
                    weights[expert_index] * beta
                )

    # Convert the aggregated beta values back to 2-tuples so the result
    # keeps the linguistic representation in addition to the numeric matrix.
    collective_matrix: list[list[dict[str, Any]]] = []

    for alternative_index in range(alternative_count):
        collective_row: list[dict[str, Any]] = []

        for criterion_index in range(criterion_count):
            collective_row.append(
                delta(
                    beta=collective_beta_matrix[
                        alternative_index
                    ][criterion_index],
                    labels=scale_labels[criterion_index],
                )
            )

        collective_matrix.append(collective_row)

    return {
        "collective_beta_matrix": collective_beta_matrix,
        "collective_matrix": collective_matrix,
    }


def calculate_ideal_solutions(
    *,
    collective_beta_matrix: list[list[float]],
    criterion_directions: list[str],
    criterion_scales: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Calculate the positive and negative ideal linguistic solutions.

    For benefit/max criteria:

        positive ideal = max beta
        negative ideal = min beta

    For cost/min criteria:

        positive ideal = min beta
        negative ideal = max beta

    The numeric beta ideals are also converted back to linguistic
    2-tuples through Delta.
    """

    if (
        not isinstance(collective_beta_matrix, list)
        or len(collective_beta_matrix) == 0
    ):
        raise ValueError(
            "collective_beta_matrix must be a non-empty matrix"
        )

    first_row = collective_beta_matrix[0]

    if not isinstance(first_row, list) or len(first_row) == 0:
        raise ValueError(
            "collective_beta_matrix[0] must be a non-empty row"
        )

    criterion_count = len(first_row)

    if not isinstance(criterion_directions, list):
        raise ValueError(
            "criterion_directions must be a list"
        )

    if len(criterion_directions) != criterion_count:
        raise ValueError(
            "criterion_directions length must match "
            "the number of criteria"
        )

    if not isinstance(criterion_scales, list):
        raise ValueError(
            "criterion_scales must be a list"
        )

    if len(criterion_scales) != criterion_count:
        raise ValueError(
            "criterion_scales length must match "
            "the number of criteria"
        )

    columns: list[list[float]] = [
        []
        for _ in range(criterion_count)
    ]

    for alternative_index, row in enumerate(
        collective_beta_matrix
    ):
        if not isinstance(row, list):
            raise ValueError(
                f"collective_beta_matrix[{alternative_index}] "
                "must be a row"
            )

        if len(row) != criterion_count:
            raise ValueError(
                "All collective matrix rows must contain "
                "the same number of criteria"
            )

        for criterion_index, raw_beta in enumerate(row):
            beta = _finite_number(
                raw_beta,
                (
                    f"collective_beta_matrix"
                    f"[{alternative_index}]"
                    f"[{criterion_index}]"
                ),
            )

            labels = _criterion_scale_labels(
                criterion_scales[criterion_index],
                criterion_index,
            )

            maximum_index = len(labels) - 1

            if (
                beta < -FLOAT_TOLERANCE
                or beta > maximum_index + FLOAT_TOLERANCE
            ):
                raise ValueError(
                    f"collective_beta_matrix"
                    f"[{alternative_index}]"
                    f"[{criterion_index}] is outside "
                    "the linguistic scale"
                )

            if beta < 0:
                beta = 0.0
            elif beta > maximum_index:
                beta = float(maximum_index)

            columns[criterion_index].append(beta)

    positive_ideal_beta: list[float] = []
    negative_ideal_beta: list[float] = []

    # Step 2 — Ideal solutions.
    #
    # Benefit/max criterion:  beta+ = max, beta- = min
    # Cost/min criterion:     beta+ = min, beta- = max
    for criterion_index, direction in enumerate(
        criterion_directions
    ):
        normalized_direction = str(
            direction or ""
        ).strip().lower()

        criterion_values = columns[criterion_index]

        if normalized_direction == "max":
            positive_beta = max(criterion_values)
            negative_beta = min(criterion_values)

        elif normalized_direction == "min":
            positive_beta = min(criterion_values)
            negative_beta = max(criterion_values)

        else:
            raise ValueError(
                f"Unsupported criterion direction: {direction}"
            )

        positive_ideal_beta.append(
            float(positive_beta)
        )
        negative_ideal_beta.append(
            float(negative_beta)
        )

    positive_ideal = [
        delta(
            beta=positive_ideal_beta[index],
            labels=_criterion_scale_labels(
                criterion_scales[index],
                index,
            ),
        )
        for index in range(criterion_count)
    ]

    negative_ideal = [
        delta(
            beta=negative_ideal_beta[index],
            labels=_criterion_scale_labels(
                criterion_scales[index],
                index,
            ),
        )
        for index in range(criterion_count)
    ]

    return {
        "positive_ideal_beta": positive_ideal_beta,
        "negative_ideal_beta": negative_ideal_beta,
        "positive_ideal": positive_ideal,
        "negative_ideal": negative_ideal,
    }


def _normalized_criterion_weights(
    weights: list[float],
    criterion_count: int,
) -> list[float]:
    if not isinstance(weights, list):
        raise ValueError("weights must be a list")

    if len(weights) != criterion_count:
        raise ValueError(
            "weights length must match the number of criteria"
        )

    normalized: list[float] = []

    for index, raw_weight in enumerate(weights):
        weight = _finite_number(
            raw_weight,
            f"weights[{index}]",
        )

        if weight < 0:
            raise ValueError(
                f"weights[{index}] must be greater than "
                "or equal to 0"
            )

        normalized.append(weight)

    total_weight = sum(normalized)

    if total_weight <= 0:
        raise ValueError(
            "weights must contain at least one positive weight"
        )

    if abs(total_weight - 1.0) > WEIGHT_SUM_TOLERANCE:
        raise ValueError(
            "weights must sum to 1"
        )

    return [
        float(weight / total_weight)
        for weight in normalized
    ]


def calculate_weighted_distances(
    *,
    collective_beta_matrix: list[list[float]],
    positive_ideal_beta: list[float],
    negative_ideal_beta: list[float],
    weights: list[float],
) -> dict[str, list[float]]:
    """
    Calculate weighted absolute distances to the positive and
    negative ideal solutions.

    For each alternative i:

        D_i+ = sum_j w_j * |beta_ij - beta_j+|

        D_i- = sum_j w_j * |beta_ij - beta_j-|

    This is the weighted L1 distance used by the 2-tuple TOPSIS
    method, not Euclidean distance.
    """

    if (
        not isinstance(collective_beta_matrix, list)
        or len(collective_beta_matrix) == 0
    ):
        raise ValueError(
            "collective_beta_matrix must be a non-empty matrix"
        )

    first_row = collective_beta_matrix[0]

    if not isinstance(first_row, list) or len(first_row) == 0:
        raise ValueError(
            "collective_beta_matrix[0] must be a non-empty row"
        )

    criterion_count = len(first_row)

    if not isinstance(positive_ideal_beta, list):
        raise ValueError(
            "positive_ideal_beta must be a list"
        )

    if len(positive_ideal_beta) != criterion_count:
        raise ValueError(
            "positive_ideal_beta length must match "
            "the number of criteria"
        )

    if not isinstance(negative_ideal_beta, list):
        raise ValueError(
            "negative_ideal_beta must be a list"
        )

    if len(negative_ideal_beta) != criterion_count:
        raise ValueError(
            "negative_ideal_beta length must match "
            "the number of criteria"
        )

    normalized_weights = _normalized_criterion_weights(
        weights,
        criterion_count,
    )

    positive_ideal = [
        _finite_number(
            value,
            f"positive_ideal_beta[{index}]",
        )
        for index, value in enumerate(positive_ideal_beta)
    ]

    negative_ideal = [
        _finite_number(
            value,
            f"negative_ideal_beta[{index}]",
        )
        for index, value in enumerate(negative_ideal_beta)
    ]

    positive_distances: list[float] = []
    negative_distances: list[float] = []

    for alternative_index, row in enumerate(
        collective_beta_matrix
    ):
        if not isinstance(row, list):
            raise ValueError(
                f"collective_beta_matrix[{alternative_index}] "
                "must be a row"
            )

        if len(row) != criterion_count:
            raise ValueError(
                "All collective matrix rows must contain "
                "the same number of criteria"
            )

        positive_distance = 0.0
        negative_distance = 0.0

        # Step 3 — Weighted L1 distances for alternative i:
        #
        #     D_i+ = sum_j w_j * |beta_ij - beta_j+|
        #     D_i- = sum_j w_j * |beta_ij - beta_j-|
        for criterion_index, raw_beta in enumerate(row):
            beta = _finite_number(
                raw_beta,
                (
                    f"collective_beta_matrix"
                    f"[{alternative_index}]"
                    f"[{criterion_index}]"
                ),
            )

            weight = normalized_weights[criterion_index]

            positive_distance += (
                weight
                * abs(
                    beta
                    - positive_ideal[criterion_index]
                )
            )

            negative_distance += (
                weight
                * abs(
                    beta
                    - negative_ideal[criterion_index]
                )
            )

        positive_distances.append(
            float(positive_distance)
        )

        negative_distances.append(
            float(negative_distance)
        )

    return {
        "positive_distances": positive_distances,
        "negative_distances": negative_distances,
    }


def calculate_closeness_coefficients(
    *,
    positive_distances: list[float],
    negative_distances: list[float],
) -> list[float]:
    """
    Calculate TOPSIS relative closeness coefficients:

        C_i = D_i- / (D_i+ + D_i-)

    Higher values are better.

    If both distances are zero, the alternative is indistinguishable
    from both ideal solutions. In that degenerate case, use the
    symmetric neutral value 0.5.
    """

    if not isinstance(positive_distances, list):
        raise ValueError(
            "positive_distances must be a list"
        )

    if not isinstance(negative_distances, list):
        raise ValueError(
            "negative_distances must be a list"
        )

    if len(positive_distances) == 0:
        raise ValueError(
            "positive_distances must not be empty"
        )

    if len(positive_distances) != len(
        negative_distances
    ):
        raise ValueError(
            "positive_distances and negative_distances "
            "must contain the same number of alternatives"
        )

    coefficients: list[float] = []

    for index, (
        raw_positive_distance,
        raw_negative_distance,
    ) in enumerate(
        zip(
            positive_distances,
            negative_distances,
            strict=True,
        )
    ):
        positive_distance = _finite_number(
            raw_positive_distance,
            f"positive_distances[{index}]",
        )

        negative_distance = _finite_number(
            raw_negative_distance,
            f"negative_distances[{index}]",
        )

        if positive_distance < 0:
            raise ValueError(
                f"positive_distances[{index}] "
                "must be greater than or equal to 0"
            )

        if negative_distance < 0:
            raise ValueError(
                f"negative_distances[{index}] "
                "must be greater than or equal to 0"
            )

        # Step 4 — TOPSIS relative closeness:
        #
        #     C_i = D_i- / (D_i+ + D_i-)
        #
        # Higher values are preferred.
        denominator = (
            positive_distance
            + negative_distance
        )

        if denominator <= FLOAT_TOLERANCE:
            coefficient = 0.5
        else:
            coefficient = (
                negative_distance
                / denominator
            )

        if coefficient < 0:
            coefficient = 0.0
        elif coefficient > 1:
            coefficient = 1.0

        coefficients.append(
            float(coefficient)
        )

    return coefficients


def rank_closeness_coefficients(
    closeness_coefficients: list[float],
) -> list[int]:
    """
    Rank alternatives from highest to lowest closeness coefficient.

    Ties preserve the original alternative order.
    """

    if (
        not isinstance(closeness_coefficients, list)
        or len(closeness_coefficients) == 0
    ):
        raise ValueError(
            "closeness_coefficients must be a non-empty list"
        )

    normalized: list[float] = []

    for index, raw_score in enumerate(
        closeness_coefficients
    ):
        score = _finite_number(
            raw_score,
            f"closeness_coefficients[{index}]",
        )

        if (
            score < -FLOAT_TOLERANCE
            or score > 1.0 + FLOAT_TOLERANCE
        ):
            raise ValueError(
                f"closeness_coefficients[{index}] "
                "must be between 0 and 1"
            )

        if score < 0:
            score = 0.0
        elif score > 1:
            score = 1.0

        normalized.append(score)

    # Step 5 — Final TOPSIS order: decreasing closeness coefficient.
    # Python's stable ordering keeps the original alternative order on exact
    # technical ties.
    return sorted(
        range(len(normalized)),
        key=lambda index: (
            -normalized[index],
            index,
        ),
    )


def run_topsis_2tuple(
    *,
    matrices: dict[str, list[list[float]]],
    expert_weights: list[float],
    weights: list[float],
    criterion_directions: list[str],
    criterion_scales: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Execute the complete 2-tuple linguistic TOPSIS pipeline.

    Steps:

    1. Aggregate expert beta matrices using expert weights.
    2. Determine positive and negative ideal solutions.
    3. Calculate weighted absolute distances to both ideals.
    4. Calculate relative closeness coefficients.
    5. Rank alternatives from highest to lowest closeness.

    The algorithm operates internally on beta values while preserving
    collective and ideal linguistic 2-tuples for the public result and
    later model-specific analysis.
    """

    # 1) Aggregate the expert assessments in the beta domain and recover
    #    the collective linguistic 2-tuples.
    aggregation = aggregate_expert_matrices(
        matrices=matrices,
        expert_weights=expert_weights,
        criterion_scales=criterion_scales,
    )

    collective_beta_matrix = aggregation[
        "collective_beta_matrix"
    ]
    collective_matrix = aggregation[
        "collective_matrix"
    ]

    # 2) Build the positive and negative ideal solution for every
    #    criterion according to its max/min direction.
    ideals = calculate_ideal_solutions(
        collective_beta_matrix=collective_beta_matrix,
        criterion_directions=criterion_directions,
        criterion_scales=criterion_scales,
    )

    # 3) Measure each alternative against both ideals with the configured
    #    criterion weights using weighted L1 distance.
    distances = calculate_weighted_distances(
        collective_beta_matrix=collective_beta_matrix,
        positive_ideal_beta=ideals[
            "positive_ideal_beta"
        ],
        negative_ideal_beta=ideals[
            "negative_ideal_beta"
        ],
        weights=weights,
    )

    # 4) Convert the pair of ideal distances into the TOPSIS closeness
    #    coefficient C_i.
    closeness_coefficients = (
        calculate_closeness_coefficients(
            positive_distances=distances[
                "positive_distances"
            ],
            negative_distances=distances[
                "negative_distances"
            ],
        )
    )

    # 5) Rank alternatives from the largest C_i to the smallest.
    collective_ranking = (
        rank_closeness_coefficients(
            closeness_coefficients
        )
    )
    # The plot is presentation evidence only; it does not participate in
    # the TOPSIS score or ranking.
    plots_graphic = get_plots_graphics_from_matrices(
        list(matrices.values()),
        collective_beta_matrix,
        method="MDS",
    )

    return {
        "collective_matrix": collective_matrix,
        "collective_beta_matrix": collective_beta_matrix,
        "positive_ideal": ideals[
            "positive_ideal"
        ],
        "negative_ideal": ideals[
            "negative_ideal"
        ],
        "positive_ideal_beta": ideals[
            "positive_ideal_beta"
        ],
        "negative_ideal_beta": ideals[
            "negative_ideal_beta"
        ],
        "positive_distances": distances[
            "positive_distances"
        ],
        "negative_distances": distances[
            "negative_distances"
        ],
        "closeness_coefficients": closeness_coefficients,
        "collective_scores": closeness_coefficients,
        "collective_ranking": collective_ranking,
        "expert_weights": list(expert_weights),
        "criterion_weights": list(weights),
        "criterion_directions": list(
            criterion_directions
        ),
        "plots_graphic": plots_graphic,
    }