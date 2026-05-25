"""EDAS model implementation for API execution."""

from typing import Any

import numpy as np
from pyDecision.algorithm import edas_method

from utils.clean_matrix import clean_matrix
from utils.get_plots_graphics_from_matrices import get_plots_graphics_from_matrices


def _ensure_valid_scores(scores: np.ndarray, expected_length: int) -> list[float]:
    if scores.ndim != 1:
        raise ValueError("EDAS returned an invalid score array")

    if scores.shape[0] != expected_length:
        raise ValueError("EDAS score length does not match the number of alternatives")

    if not np.all(np.isfinite(scores)):
        raise ValueError("EDAS returned non-finite scores")

    return [float(score) for score in scores.tolist()]


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

    a_s = edas_method(
        matrix_clean,
        criteria_clean,
        weights_clean,
        graph=False,
        verbose=False,
    )

    scores_np = np.array(a_s, dtype=float)
    collective_scores = _ensure_valid_scores(
        scores_np,
        expected_length=matrix_clean.shape[0],
    )

    return {
        "collective_matrix": collective_matrix.tolist(),
        "matrix_used": matrix_clean.tolist(),
        "collective_scores": collective_scores,
        "collective_ranking": np.argsort(scores_np)[::-1].tolist(),
        "a_s": collective_scores,
        "weights_used": np.array(weights_clean, dtype=float).tolist(),
        "plots_graphic": get_plots_graphics_from_matrices(
            matrices_np,
            collective_matrix,
            method="MDS",
        ),
    }