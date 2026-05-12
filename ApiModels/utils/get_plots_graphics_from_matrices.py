"""Generación de puntos 2D para visualizar expertos y opinión colectiva."""

from typing import Any, Sequence

import numpy as np
from sklearn.decomposition import PCA
from sklearn.manifold import MDS


def get_plots_graphics_from_matrices(
    matrices_np: Sequence[Any],
    collective_matrix: Any,
    method: str = "MDS",
) -> dict[str, Any]:
    """Obtiene puntos 2D para expertos y punto colectivo.

    El punto colectivo se calcula sobre la matriz agregada y los puntos de experto
    se expresan relativos a ese centro para mantener el formato histórico.
    """

    preferences = list(matrices_np) + [collective_matrix]
    preferences_flat = np.array([np.array(pref, dtype=float).flatten() for pref in preferences], dtype=float)
    preferences_flat[preferences_flat == 0] = 1e-10

    """ if preferences_flat.shape[0] < 2:
        return {
            "reason": "insufficient_points_for_projection",
        }

    if np.allclose(preferences_flat, preferences_flat[0], atol=1e-12):
        return {
            "reason": "insufficient_variation_for_projection",
        } """

    if method.upper() == "PCA":
        reducer = PCA(n_components=2)
    else:
        reducer = MDS(n_components=2, dissimilarity="euclidean", random_state=42)

    try:
        transformed = reducer.fit_transform(preferences_flat)
    except Exception:
        return {
            "reason": "projection_failed",
        }
    collective_point_np = transformed[-1]
    expert_points_np = transformed[:-1] - collective_point_np

    return {
        "expert_points": np.round(expert_points_np, 4).tolist(),
        "collective_point": np.round(collective_point_np, 4).tolist(),
    }
