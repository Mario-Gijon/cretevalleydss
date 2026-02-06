import numpy as np
from pyDecision.algorithm import aras_method
from utils.get_plots_graphics_from_matrices import get_plots_graphics_from_matrices
from utils.clean_matrix import clean_matrix

def run_aras(matrices, weights, criterion_type):
  matrices_np = [np.array(matrix, dtype=float) for matrix in matrices.values()]
  collective_matrix = np.mean(matrices_np, axis=0)

  matrix_clean, weights_clean, criteria_clean = clean_matrix(
      collective_matrix, weights, criterion_type
  )

  # ARAS devuelve [[alt, score], ...] → extraemos solo los scores
  raw_result = aras_method(matrix_clean, weights_clean, criteria_clean).tolist()
  collective_scores = [score for _, score in raw_result]

  # Ranking descendente (mejor puntaje primero)
  collective_ranking = np.argsort(collective_scores)[::-1].tolist()

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

