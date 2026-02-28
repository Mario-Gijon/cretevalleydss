import numpy as np
from pyDecision.algorithm import borda_method
from utils.get_plots_graphics_from_matrices import get_plots_graphics_from_matrices
from utils.clean_matrix import clean_matrix

def run_borda(matrices, criterion_type):
    matrices_np = [np.array(matrix, dtype=float) for matrix in matrices.values()]
    collective_matrix = np.mean(matrices_np, axis=0)

    criterion_type = np.array(criterion_type)
    dummy_weights = np.ones(collective_matrix.shape[1], dtype=float)

    matrix_clean, _, criteria_clean = clean_matrix(
        collective_matrix, dummy_weights, criterion_type
    )

    plots_graphic = get_plots_graphics_from_matrices(
        matrices_np,
        collective_matrix,
        method="MDS"
    )

    # borda_method devuelve "rank sums" (menor = mejor)
    rank_sum = borda_method(matrix_clean, criteria_clean, graph=False, verbose=False)

    m, n = matrix_clean.shape  # m alternatives, n criteria (tras clean)
    # Puntos Borda: mayor = mejor (rango positivo y consistente)
    borda_points = (n * (m + 1)) - rank_sum

    collective_scores = borda_points.tolist()
    collective_ranking = np.argsort(borda_points)[::-1].tolist()

    return {
        "collective_matrix": collective_matrix.tolist(),
        "matrix_used": matrix_clean.tolist(),
        "collective_scores": collective_scores,
        "collective_ranking": collective_ranking,
        "plots_graphic": plots_graphic,
    }