from typing import Any

import numpy as np
from pyDecision.algorithm import promethee_vi

from utils.get_plots_graphics_from_matrices import get_plots_graphics_from_matrices


def run_promethee_vi(
    matrices: dict[str, list[list[float]]],
    q_thresholds: list[float],
    s_thresholds: list[float],
    p_thresholds: list[float],
    preference_functions: list[str],
    weights_lower: list[float],
    weights_upper: list[float],
    iterations: int,
    topn: int,
) -> dict[str, Any]:
    matrices_np = [np.array(matrix, dtype=float) for matrix in matrices.values()]
    collective_matrix = np.mean(matrices_np, axis=0)

    p6_minus, p6, p6_plus = promethee_vi(
        collective_matrix,
        W_lower=np.array(weights_lower, dtype=float),
        W_upper=np.array(weights_upper, dtype=float),
        Q=q_thresholds,
        S=s_thresholds,
        P=p_thresholds,
        F=preference_functions,
        sort=True,
        topn=topn,
        iterations=iterations,
        graph=False,
    )

    return {
        "collective_matrix": collective_matrix.tolist(),
        "matrix_used": collective_matrix.tolist(),
        "minus_ranking": p6_minus.tolist(),
        "favorable_ranking": p6.tolist(),
        "plus_ranking": p6_plus.tolist(),
        "plots_graphic": get_plots_graphics_from_matrices(
            matrices_np,
            collective_matrix,
            method="MDS",
        ),
    }