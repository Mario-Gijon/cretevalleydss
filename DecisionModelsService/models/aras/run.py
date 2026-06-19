"""Implementación del modelo ARAS para ejecución desde la API."""

from typing import Any

import numpy as np
from pyDecision.algorithm import aras_method

from utils.clean_matrix import clean_matrix
from utils.get_plots_graphics_from_matrices import get_plots_graphics_from_matrices


def run_aras(
    matrices: dict[str, list[list[float]]],
    weights: list[float],
    criterion_type: list[str],
) -> dict[str, Any]:
    """Ejecuta ARAS sobre la matriz colectiva de expertos."""

    matrices_np = [np.array(matrix, dtype=float) for matrix in matrices.values()]
    collective_matrix = np.mean(matrices_np, axis=0)

    matrix_clean, weights_clean, criteria_clean = clean_matrix(
        collective_matrix,
        weights,
        criterion_type,
    )
    raw_result = aras_method(matrix_clean, weights_clean, criteria_clean).tolist()

    n_alts = matrix_clean.shape[0]
    scores_by_index: list[float | None] = [None] * n_alts

    alts = [int(alt) for alt, _ in raw_result]
    one_based = min(alts) == 1 and max(alts) == n_alts

    for alt, score in raw_result:
        idx = int(alt) - 1 if one_based else int(alt)
        if 0 <= idx < n_alts:
            scores_by_index[idx] = float(score)

    for index, score in enumerate(scores_by_index):
        if score is None:
            scores_by_index[index] = float("-inf")

    collective_scores = [float(score) for score in scores_by_index]
    collective_ranking = np.argsort(collective_scores)[::-1].tolist()

    return {
        "collective_matrix": collective_matrix.tolist(),
        "matrix_used": matrix_clean.tolist(),
        "collective_scores": collective_scores,
        "collective_ranking": collective_ranking,
        "plots_graphic": get_plots_graphics_from_matrices(
            matrices_np,
            collective_matrix,
            method="MDS",
        ),
    }
