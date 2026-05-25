"""WASPAS model implementation for API execution."""

from typing import Any

import numpy as np

from utils.clean_matrix import clean_matrix
from utils.get_plots_graphics_from_matrices import get_plots_graphics_from_matrices


_EPSILON = 1e-12


def _normalize_weights(weights: np.ndarray) -> np.ndarray:
    total = float(np.sum(weights))

    if total <= 0:
        raise ValueError("WASPAS weights must have a positive sum")

    return weights / total


def _normalize_column(column: np.ndarray, criterion_type: str) -> np.ndarray:
    direction = str(criterion_type).strip().lower()

    if direction == "max":
        max_value = float(np.max(column))
        if max_value == 0:
            return np.zeros_like(column, dtype=float)

        return column / max_value

    if direction == "min":
        min_value = float(np.min(column))
        max_value = float(np.max(column))

        if max_value == min_value:
            return np.ones_like(column, dtype=float)

        if min_value == 0:
            return 1 - ((column - min_value) / (max_value - min_value))

        return min_value / np.clip(column, _EPSILON, None)

    raise ValueError(f"Unsupported WASPAS criterion type: {criterion_type}")


def _normalize_matrix(matrix: np.ndarray, criterion_type: np.ndarray) -> np.ndarray:
    normalized = np.zeros_like(matrix, dtype=float)

    for criterion_index in range(matrix.shape[1]):
        normalized[:, criterion_index] = _normalize_column(
            matrix[:, criterion_index],
            str(criterion_type[criterion_index]),
        )

    return np.clip(normalized, 0, None)


def run_waspas(
    matrices: dict[str, list[list[float]]],
    weights: list[float],
    criterion_type: list[str],
    lambda_value: float = 0.5,
) -> dict[str, Any]:
    matrices_np = [np.array(matrix, dtype=float) for matrix in matrices.values()]
    collective_matrix = np.mean(matrices_np, axis=0)

    matrix_clean, weights_clean, criteria_clean = clean_matrix(
        collective_matrix,
        weights,
        criterion_type,
    )

    normalized_weights = _normalize_weights(np.array(weights_clean, dtype=float))
    normalized_matrix = _normalize_matrix(matrix_clean, criteria_clean)

    weighted_sum_scores = np.sum(normalized_matrix * normalized_weights, axis=1)

    product_matrix = np.power(
        np.clip(normalized_matrix, _EPSILON, None),
        normalized_weights,
    )
    weighted_product_scores = np.prod(product_matrix, axis=1)

    collective_scores = (
        (lambda_value * weighted_sum_scores)
        + ((1 - lambda_value) * weighted_product_scores)
    )

    return {
        "collective_matrix": collective_matrix.tolist(),
        "matrix_used": matrix_clean.tolist(),
        "normalized_matrix": normalized_matrix.tolist(),
        "collective_scores": collective_scores.tolist(),
        "collective_ranking": np.argsort(collective_scores)[::-1].tolist(),
        "weighted_sum_scores": weighted_sum_scores.tolist(),
        "weighted_product_scores": weighted_product_scores.tolist(),
        "lambda": lambda_value,
        "weights_used": normalized_weights.tolist(),
        "plots_graphic": get_plots_graphics_from_matrices(
            matrices_np,
            collective_matrix,
            method="MDS",
        ),
    }