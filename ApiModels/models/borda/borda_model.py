"""Implementación del modelo Borda para ejecución desde la API."""

from typing import Any

import numpy as np
from pyDecision.algorithm import borda_method

from utils.clean_matrix import clean_matrix
from utils.get_plots_graphics_from_matrices import get_plots_graphics_from_matrices


def run_borda(
    matrices: dict[str, list[list[float]]],
    criterion_type: list[str],
) -> dict[str, Any]:
    """Ejecuta Borda sobre la matriz colectiva de expertos."""

    matrices_np = [np.array(matrix, dtype=float) for matrix in matrices.values()]
    collective_matrix = np.mean(matrices_np, axis=0)

    dummy_weights = np.ones(collective_matrix.shape[1], dtype=float)
    matrix_clean, _, criteria_clean = clean_matrix(
        collective_matrix,
        dummy_weights,
        criterion_type,
    )

    rank_sum = borda_method(matrix_clean, criteria_clean, graph=False, verbose=False)
    alternatives_count, criteria_count = matrix_clean.shape
    borda_points = (criteria_count * (alternatives_count + 1)) - rank_sum

    return {
        "collective_matrix": collective_matrix.tolist(),
        "matrix_used": matrix_clean.tolist(),
        "collective_scores": borda_points.tolist(),
        "collective_ranking": np.argsort(borda_points)[::-1].tolist(),
        "plots_graphic": get_plots_graphics_from_matrices(
            matrices_np,
            collective_matrix,
            method="MDS",
        ),
    }
