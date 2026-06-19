"""Implementación del modelo TOPSIS para ejecución desde la API."""

from typing import Any

import numpy as np
from pyDecision.algorithm import topsis_method

from utils.clean_matrix import clean_matrix
from utils.get_plots_graphics_from_matrices import get_plots_graphics_from_matrices


def run_topsis(
    matrices: dict[str, list[list[float]]],
    weights: list[float],
    criterion_type: list[str],
) -> dict[str, Any]:
    """Ejecuta TOPSIS sobre la matriz colectiva de expertos."""

    matrices_np = [np.array(matrix, dtype=float) for matrix in matrices.values()]
    collective_matrix = np.mean(matrices_np, axis=0)
    matrix_clean, weights_clean, criteria_clean = clean_matrix(
        collective_matrix,
        weights,
        criterion_type,
    )

    collective_scores = topsis_method(
        matrix_clean,
        weights_clean,
        criteria_clean,
        graph=False,
        verbose=False,
    ).tolist()

    return {
        "collective_matrix": collective_matrix.tolist(),
        "matrix_used": matrix_clean.tolist(),
        "collective_scores": collective_scores,
        "collective_ranking": np.argsort(collective_scores)[::-1].tolist(),
        "plots_graphic": get_plots_graphics_from_matrices(
            matrices_np,
            collective_matrix,
            method="MDS",
        ),
    }
