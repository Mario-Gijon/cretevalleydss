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

  raw_result = aras_method(matrix_clean, weights_clean, criteria_clean).tolist()
  # raw_result: [[alt, score], ...] (normalmente ordenado por score)

  n_alts = matrix_clean.shape[0]
  scores_by_index = [None] * n_alts

  # Detectar si alt es 0-based o 1-based (muy común que sea 1..n)
  alts = [int(a) for a, _ in raw_result]
  one_based = (min(alts) == 1 and max(alts) == n_alts)

  for alt, score in raw_result:
    idx = int(alt) - 1 if one_based else int(alt)
    if 0 <= idx < n_alts:
      scores_by_index[idx] = float(score)

  # Si algo quedó None, fallback seguro (por si el método devuelve raro)
  # (no debería pasar, pero evitamos romper)
  for i in range(n_alts):
    if scores_by_index[i] is None:
      scores_by_index[i] = float("-inf")

  collective_scores = scores_by_index
  collective_ranking = np.argsort(collective_scores)[::-1].tolist()

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