"""EDAS model implementation for API execution."""

from typing import Any

import numpy as np

from utils.clean_matrix import clean_matrix
from utils.get_plots_graphics_from_matrices import get_plots_graphics_from_matrices


_EPSILON = 1e-12


def _normalize_weights(weights: np.ndarray) -> np.ndarray:
    total = float(np.sum(weights))

    if total <= 0:
        raise ValueError("EDAS weights must have a positive sum")

    return weights / total


def _safe_denominator(value: float) -> float:
    absolute = abs(float(value))
    return absolute if absolute > _EPSILON else _EPSILON


def _edas_distances(
    *,
    matrix: np.ndarray,
    criterion_type: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    rows, cols = matrix.shape
    average_solution = np.mean(matrix, axis=0)

    positive_distance = np.zeros((rows, cols), dtype=float)
    negative_distance = np.zeros((rows, cols), dtype=float)

    for criterion_index in range(cols):
        average = float(average_solution[criterion_index])
        denominator = _safe_denominator(average)
        column = matrix[:, criterion_index]
        direction = str(criterion_type[criterion_index]).strip().lower()

        if direction == "max":
            positive_distance[:, criterion_index] = np.maximum(0, column - average) / denominator
            negative_distance[:, criterion_index] = np.maximum(0, average - column) / denominator
            continue

        if direction == "min":
            positive_distance[:, criterion_index] = np.maximum(0, average - column) / denominator
            negative_distance[:, criterion_index] = np.maximum(0, column - average) / denominator
            continue

        raise ValueError(f"Unsupported EDAS criterion type: {direction}")

    return positive_distance, negative_distance


def _normalize_positive_sum(values: np.ndarray) -> np.ndarray:
    maximum = float(np.max(values))

    if maximum <= 0:
        return np.zeros_like(values, dtype=float)

    return values / maximum


def _normalize_negative_sum(values: np.ndarray) -> np.ndarray:
    maximum = float(np.max(values))

    if maximum <= 0:
        return np.ones_like(values, dtype=float)

    return 1 - (values / maximum)


def run_edas(
    matrices: dict[str, list[list[float]]],
    weights: list[float],
    criterion_type: list[str],
) -> dict[str, Any]:
    matrices_np = [np.array(matrix, dtype=float) for matrix in matrices.values()]
    collective_matrix = np.mean(matrices_np, axis=0)

    matrix_clean, weights_clean, criteria_clean = clean_matrix(
        collective_matrix,
        weights,
        criterion_type,
    )

    normalized_weights = _normalize_weights(np.array(weights_clean, dtype=float))

    positive_distance, negative_distance = _edas_distances(
        matrix=matrix_clean,
        criterion_type=criteria_clean,
    )

    weighted_positive_sum = np.sum(positive_distance * normalized_weights, axis=1)
    weighted_negative_sum = np.sum(negative_distance * normalized_weights, axis=1)

    normalized_positive_sum = _normalize_positive_sum(weighted_positive_sum)
    normalized_negative_sum = _normalize_negative_sum(weighted_negative_sum)

    collective_scores = (normalized_positive_sum + normalized_negative_sum) / 2

    return {
        "collective_matrix": collective_matrix.tolist(),
        "matrix_used": matrix_clean.tolist(),
        "positive_distance": positive_distance.tolist(),
        "negative_distance": negative_distance.tolist(),
        "weighted_positive_sum": weighted_positive_sum.tolist(),
        "weighted_negative_sum": weighted_negative_sum.tolist(),
        "normalized_positive_sum": normalized_positive_sum.tolist(),
        "normalized_negative_sum": normalized_negative_sum.tolist(),
        "collective_scores": collective_scores.tolist(),
        "collective_ranking": np.argsort(collective_scores)[::-1].tolist(),
        "weights_used": normalized_weights.tolist(),
        "plots_graphic": get_plots_graphics_from_matrices(
            matrices_np,
            collective_matrix,
            method="MDS",
        ),
    }