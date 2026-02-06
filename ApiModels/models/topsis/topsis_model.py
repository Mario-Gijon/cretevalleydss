import numpy as np
from pyDecision.algorithm import topsis_method
from sklearn.manifold import MDS  # ya lo usas en el otro modelo
from sklearn.decomposition import PCA  # por si quieres cambiar método
from utils.get_plots_graphics_from_matrices import get_plots_graphics_from_matrices
from utils.clean_matrix import clean_matrix

def run_topsis(matrices, weights, criterion_type):
    # 1) Matrices de expertos a numpy
    matrices_np = [np.array(matrix, dtype=float) for matrix in matrices.values()]

    # 2) Matriz colectiva (media)
    collective_matrix = np.mean(matrices_np, axis=0)

    # 3) Limpiar (columnas constantes)
    matrix_clean, weights_clean, criteria_clean = clean_matrix(
        collective_matrix, weights, criterion_type
    )

    # 4) TOPSIS sobre matriz limpia
    collective_scores = topsis_method(matrix_clean, weights_clean, criteria_clean).tolist()
    collective_ranking = np.argsort(collective_scores)[::-1].tolist()

    # 5) Puntos para el scatter (MDS)
    plots_graphic = get_plots_graphics_from_matrices(
        matrices_np,
        collective_matrix,
        method='MDS'   
    )

    return {
        "collective_matrix": collective_matrix.tolist(),
        "matrix_used": matrix_clean.tolist(),
        "collective_scores": collective_scores,
        "collective_ranking": collective_ranking,
        "plots_graphic": plots_graphic
    }
