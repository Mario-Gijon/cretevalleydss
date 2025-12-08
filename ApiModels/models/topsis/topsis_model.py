import numpy as np
from pyDecision.algorithm import topsis_method
from sklearn.manifold import MDS  # ya lo usas en el otro modelo
from sklearn.decomposition import PCA  # por si quieres cambiar método

def get_plots_graphics_from_matrices(matrices_np, collective_matrix, method='MDS'):
    """
    matrices_np: lista de matrices de expertos (numpy)
    collective_matrix: matriz colectiva (numpy)
    """
    # Preferencias = todos los expertos + la colectiva al final
    preferences = matrices_np + [collective_matrix]

    preferences_flat = np.array([pref.flatten() for pref in preferences], dtype=float)

    # Evitar todo ceros exactos
    preferences_flat[preferences_flat == 0] = 1e-10

    if method == 'PCA':
        reducer = PCA(n_components=2)
    else:
        reducer = MDS(n_components=2, dissimilarity='euclidean', random_state=42)

    transformed = reducer.fit_transform(preferences_flat)

    collective_point = transformed[-1]
    expert_points = transformed[:-1] - collective_point  # relativos a la colectiva

    collective_point = np.round(collective_point, 4).tolist()
    expert_points = np.round(expert_points, 4).tolist()

    return {
        "expert_points": expert_points,
        "collective_point": collective_point
    }


def clean_matrix(matrix, weights, criterion_type):
  """
  Elimina columnas constantes (todo 0, todo 1, o todo igual).
  Ajusta pesos y tipo de criterio en consecuencia.
  """
  matrix = np.array(matrix, dtype=float)
  weights = np.array(weights, dtype=float)
  criterion_type = np.array(criterion_type)

  # Seleccionamos columnas que tengan variabilidad (ptp = max - min)
  keep_cols = (np.ptp(matrix, axis=0) != 0)

  return matrix[:, keep_cols], weights[keep_cols], criterion_type[keep_cols]


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
        method='MDS'   # o 'PCA' si algún día cambias
    )

    return {
        "collective_matrix": collective_matrix.tolist(),
        "matrix_used": matrix_clean.tolist(),
        "collective_scores": collective_scores,
        "collective_ranking": collective_ranking,
        "plots_graphic": plots_graphic
    }
