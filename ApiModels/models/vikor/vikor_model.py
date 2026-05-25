"""VIKOR model implementation for API execution."""

from typing import Any

import numpy as np

from utils.clean_matrix import clean_matrix
from utils.get_plots_graphics_from_matrices import get_plots_graphics_from_matrices


def _normalize_weights(weights: np.ndarray) -> np.ndarray:
    total = float(np.sum(weights))

    if total <= 0:
        raise ValueError("VIKOR weights must have a positive sum")

    return weights / total


def _safe_linear_normalization(values: np.ndarray) -> np.ndarray:
    best = float(np.min(values))
    worst = float(np.max(values))
    denominator = worst - best

    if denominator == 0:
        return np.zeros_like(values, dtype=float)

    return (values - best) / denominator


def _vikor_q_values(
    *,
    matrix: np.ndarray,
    weights: np.ndarray,
    criterion_type: np.ndarray,
    v: float,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    rows, cols = matrix.shape
    normalized_distances = np.zeros((rows, cols), dtype=float)

    for criterion_index in range(cols):
        column = matrix[:, criterion_index]
        direction = str(criterion_type[criterion_index]).strip().lower()

        if direction == "max":
            best = float(np.max(column))
            worst = float(np.min(column))
            denominator = best - worst

            if denominator == 0:
                normalized_distances[:, criterion_index] = 0
            else:
                normalized_distances[:, criterion_index] = (best - column) / denominator

            continue

        if direction == "min":
            best = float(np.min(column))
            worst = float(np.max(column))
            denominator = worst - best

            if denominator == 0:
                normalized_distances[:, criterion_index] = 0
            else:
                normalized_distances[:, criterion_index] = (column - best) / denominator

            continue

        raise ValueError(f"Unsupported VIKOR criterion type: {direction}")

    weighted_distances = normalized_distances * weights

    s_values = np.sum(weighted_distances, axis=1)
    r_values = np.max(weighted_distances, axis=1)

    s_normalized = _safe_linear_normalization(s_values)
    r_normalized = _safe_linear_normalization(r_values)

    q_values = (v * s_normalized) + ((1 - v) * r_normalized)

    return q_values, s_values, r_values


def run_vikor(
    matrices: dict[str, list[list[float]]],
    weights: list[float],
    criterion_type: list[str],
    v: float = 0.5,
) -> dict[str, Any]:
    matrices_np = [np.array(matrix, dtype=float) for matrix in matrices.values()]
    collective_matrix = np.mean(matrices_np, axis=0)

    matrix_clean, weights_clean, criteria_clean = clean_matrix(
        collective_matrix,
        weights,
        criterion_type,
    )

    normalized_weights = _normalize_weights(np.array(weights_clean, dtype=float))

    q_values, s_values, r_values = _vikor_q_values(
        matrix=matrix_clean,
        weights=normalized_weights,
        criterion_type=criteria_clean,
        v=v,
    )

    collective_scores = (1 - q_values).tolist()
    collective_ranking = np.argsort(q_values).tolist()

    return {
        "collective_matrix": collective_matrix.tolist(),
        "matrix_used": matrix_clean.tolist(),
        "collective_scores": collective_scores,
        "collective_ranking": collective_ranking,
        "q_values": q_values.tolist(),
        "s_values": s_values.tolist(),
        "r_values": r_values.tolist(),
        "v": v,
        "weights_used": normalized_weights.tolist(),
        "plots_graphic": get_plots_graphics_from_matrices(
            matrices_np,
            collective_matrix,
            method="MDS",
        ),
    }