import numpy as np
from pyDecision.algorithm import borda_method
from sklearn.manifold import MDS  # ya lo usas en el otro modelo
from sklearn.decomposition import PCA  # por si quieres cambiar método
from utils.get_plots_graphics_from_matrices import get_plots_graphics_from_matrices
from utils.clean_matrix import clean_matrix

def run_borda(matrices, criterion_type):
  # Convertimos todas las matrices de los expertos a numpy arrays
  matrices_np = [np.array(matrix, dtype=float) for matrix in matrices.values()]

  # Calculamos la matriz colectiva como la media aritmética
  collective_matrix = np.mean(matrices_np, axis=0)

  # Limpiar matriz antes de pasar a TOPSIS
  matrix_clean, criteria_clean = clean_matrix(
      collective_matrix, criterion_type
  )
  
  plots_graphic = get_plots_graphics_from_matrices(
      matrices_np,
      collective_matrix,
      method='MDS'   # o 'PCA' si algún día cambias
  )

  # Aplicamos una sola vez sobre la matriz colectiva limpia
  collective_scores = borda_method(matrix_clean, criteria_clean).tolist()
  collective_ranking = np.argsort(collective_scores)[::-1].tolist()

  return {
    "collective_matrix": collective_matrix.tolist(),   # matriz promedio original
    "matrix_used": matrix_clean.tolist(),              # matriz realmente usada en TOPSIS
    "collective_scores": collective_scores,            # puntuaciones TOPSIS
    "collective_ranking": collective_ranking,           # ranking TOPSIS
    "plots_graphic": plots_graphic
  }
