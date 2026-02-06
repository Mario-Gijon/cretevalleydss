import numpy as np
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
  
  if preferences_flat.shape[0] < 2 or np.allclose(preferences_flat, preferences_flat[0], atol=1e-12):
    collective_point = [0.0, 0.0]
    expert_points = [[0.0, 0.0] for _ in range(preferences_flat.shape[0] - 1)]
    return {"expert_points": expert_points, "collective_point": collective_point}

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