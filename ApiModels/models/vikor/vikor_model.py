"""VIKOR model implementation for API execution."""

from typing import Any

import numpy as np
from pyDecision.algorithm import vikor_method

from utils.clean_matrix import clean_matrix
from utils.get_plots_graphics_from_matrices import get_plots_graphics_from_matrices


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

    flow_s, flow_r, flow_q, solution = vikor_method(
        matrix_clean,
        weights_clean,
        criteria_clean,
        strategy_coefficient=v,
        graph=False,
        verbose=False,
    )

    flow_s = np.array(flow_s, dtype=float)
    flow_r = np.array(flow_r, dtype=float)
    flow_q = np.array(flow_q, dtype=float)
    solution = np.array(solution, dtype=float)

    n_alternatives = matrix_clean.shape[0]
    collective_scores = [0.0] * n_alternatives
    collective_ranking = []

    for row in flow_q:
        pydecision_index = int(row[0])
        alternative_index = pydecision_index - 1
        q_value = float(row[1])

        if alternative_index < 0 or alternative_index >= n_alternatives:
            raise ValueError(f"VIKOR returned invalid alternative index: {pydecision_index}")

        collective_ranking.append(alternative_index)
        collective_scores[alternative_index] = 1 - q_value

    return {
        "collective_matrix": collective_matrix.tolist(),
        "matrix_used": matrix_clean.tolist(),
        "collective_scores": collective_scores,
        "collective_ranking": collective_ranking,
        "flow_s": flow_s.tolist(),
        "flow_r": flow_r.tolist(),
        "flow_q": flow_q.tolist(),
        "solution": solution.tolist(),
        "v": v,
        "weights_used": np.array(weights_clean, dtype=float).tolist(),
        "plots_graphic": get_plots_graphics_from_matrices(
            matrices_np,
            collective_matrix,
            method="MDS",
        ),
    }
