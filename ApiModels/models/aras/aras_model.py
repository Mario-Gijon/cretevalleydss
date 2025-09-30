import numpy as np
from pyDecision.algorithm import aras_method

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

  print("collective_scores:", collective_scores)
  print("collective_ranking:", collective_ranking)

  return {
      "collective_matrix": collective_matrix.tolist(),
      "matrix_used": matrix_clean.tolist(),
      "collective_scores": collective_scores,
      "collective_ranking": collective_ranking
  }

