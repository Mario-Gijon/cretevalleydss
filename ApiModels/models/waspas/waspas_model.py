"""WASPAS model implementation for API execution."""

from typing import Any

import numpy as np
from pyDecision.algorithm import waspas_method

from utils.clean_matrix import clean_matrix
from utils.get_plots_graphics_from_matrices import get_plots_graphics_from_matrices


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

    wsm, wpm, waspas = waspas_method(
        matrix_clean,
        criteria_clean,
        weights_clean,
        lambda_value,
        graph=False,
    )

    wsm = np.array(wsm, dtype=float)
    wpm = np.array(wpm, dtype=float)
    waspas = np.array(waspas, dtype=float)

    collective_scores = waspas.tolist()
    collective_ranking = np.argsort(waspas)[::-1].tolist()

    return {
        "collective_matrix": collective_matrix.tolist(),
        "matrix_used": matrix_clean.tolist(),
        "collective_scores": collective_scores,
        "collective_ranking": collective_ranking,
        "wsm_scores": wsm.tolist(),
        "wpm_scores": wpm.tolist(),
        "waspas_scores": waspas.tolist(),
        "lambda": lambda_value,
        "weights_used": np.array(weights_clean, dtype=float).tolist(),
        "raw_pydecision_output": {
            "wsm": wsm.tolist(),
            "wpm": wpm.tolist(),
            "waspas": waspas.tolist(),
        },
        "plots_graphic": get_plots_graphics_from_matrices(
            matrices_np,
            collective_matrix,
            method="MDS",
        ),
    }
