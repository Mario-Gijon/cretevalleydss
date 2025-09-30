import numpy as np
from pyDecision.algorithm import borda_method

def clean_matrix(matrix, criterion_type):
  """
  Elimina columnas constantes (todo 0, todo 1, o todo igual).
  Ajusta pesos y tipo de criterio en consecuencia.
  """
  matrix = np.array(matrix, dtype=float)
  criterion_type = np.array(criterion_type)

  # Seleccionamos columnas que tengan variabilidad (ptp = max - min)
  keep_cols = (np.ptp(matrix, axis=0) != 0)

  return matrix[:, keep_cols], criterion_type[keep_cols]


def run_borda(matrices, criterion_type):
  # Convertimos todas las matrices de los expertos a numpy arrays
  matrices_np = [np.array(matrix, dtype=float) for matrix in matrices.values()]

  # Calculamos la matriz colectiva como la media aritmética
  collective_matrix = np.mean(matrices_np, axis=0)

  # Limpiar matriz antes de pasar a TOPSIS
  matrix_clean, criteria_clean = clean_matrix(
      collective_matrix, criterion_type
  )

  # Aplicamos TOPSIS una sola vez sobre la matriz colectiva limpia
  collective_scores = borda_method(matrix_clean, criteria_clean).tolist()
  collective_ranking = np.argsort(collective_scores)[::-1].tolist()

  return {
    "collective_matrix": collective_matrix.tolist(),   # matriz promedio original
    "matrix_used": matrix_clean.tolist(),              # matriz realmente usada en TOPSIS
    "collective_scores": collective_scores,            # puntuaciones TOPSIS
    "collective_ranking": collective_ranking           # ranking TOPSIS
  }
