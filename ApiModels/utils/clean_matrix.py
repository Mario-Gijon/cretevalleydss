import numpy as np

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