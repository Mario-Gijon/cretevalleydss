"""Generación de puntos 2D para visualizar expertos y opinión colectiva."""

from typing import Any, Sequence

import numpy as np
from sklearn.decomposition import PCA
from sklearn.manifold import MDS


def get_plots_graphics_from_matrices(
    matrices_np: Sequence[Any],
    collective_matrix: Any,
    method: str = "MDS",
) -> dict[str, list[list[float]] | list[float]]:
    """Obtiene puntos 2D para expertos y punto colectivo.

    El punto colectivo se calcula sobre la matriz agregada y los puntos de experto
    se expresan relativos a ese centro para mantener el formato histórico.
    """

    preferences = list(matrices_np) + [collective_matrix]
    preferences_flat = np.array([np.array(pref, dtype=float).flatten() for pref in preferences], dtype=float)
    preferences_flat[preferences_flat == 0] = 1e-10

    if preferences_flat.shape[0] < 2 or np.allclose(preferences_flat, preferences_flat[0], atol=1e-12):
        collective_point = [0.0, 0.0]
        expert_points = [[0.0, 0.0] for _ in range(preferences_flat.shape[0] - 1)]
        return {"expert_points": expert_points, "collective_point": collective_point}

    if method.upper() == "PCA":
        reducer = PCA(n_components=2)
    else:
        reducer = MDS(n_components=2, dissimilarity="euclidean", random_state=42)

    transformed = reducer.fit_transform(preferences_flat)
    collective_point_np = transformed[-1]
    expert_points_np = transformed[:-1] - collective_point_np

    return {
        "expert_points": np.round(expert_points_np, 4).tolist(),
        "collective_point": np.round(collective_point_np, 4).tolist(),
    }
