"""Generación de puntos 2D para visualizar expertos y opinión colectiva."""

from typing import Any, Sequence

import numpy as np
from sklearn.decomposition import PCA
from sklearn.manifold import MDS


def get_plots_graphics_from_matrices(
    matrices_np: Sequence[Any],
    collective_matrix: Any,
    method: str = "MDS",
    *,
    feature_ranges: Sequence[Sequence[float]] | None = None,
) -> dict[str, Any]:
    """Obtiene puntos 2D para expertos y punto colectivo.

    El punto colectivo se calcula sobre la matriz agregada y los puntos de experto
    se expresan relativos a ese centro para mantener el formato histórico. Cuando
    se indican dominios, cada criterio se lleva a su rango [0, 1] antes de MDS; la
    proyección resultante es evidencia visual y no altera la decisión del modelo.
    """

    if len(matrices_np) == 0:
        return {"reason": "insufficient_expert_matrices"}

    try:
        matrices = [np.asarray(matrix, dtype=float) for matrix in matrices_np]
        collective = np.asarray(collective_matrix, dtype=float)
    except (TypeError, ValueError):
        return {"reason": "invalid_matrix_values"}

    expected_shape = matrices[0].shape
    if (
        len(expected_shape) != 2
        or expected_shape[0] == 0
        or expected_shape[1] == 0
        or collective.shape != expected_shape
        or any(matrix.shape != expected_shape for matrix in matrices)
    ):
        return {"reason": "incompatible_matrix_dimensions"}

    if not all(np.isfinite(matrix).all() for matrix in [*matrices, collective]):
        return {"reason": "non_finite_input"}

    preferences = [*matrices, collective]
    preferences_flat = np.asarray(
        [preference.flatten() for preference in preferences], dtype=float
    )

    projection_space = None
    if feature_ranges is not None:
        try:
            ranges = np.asarray(feature_ranges, dtype=float)
        except (TypeError, ValueError):
            return {"reason": "invalid_normalization_domains"}
        if (
            ranges.shape != (expected_shape[1], 2)
            or not np.isfinite(ranges).all()
            or np.any(ranges[:, 0] >= ranges[:, 1])
        ):
            return {"reason": "invalid_normalization_domains"}

        minimums = np.tile(ranges[:, 0], expected_shape[0])
        with np.errstate(over="ignore", invalid="ignore"):
            criterion_spans = ranges[:, 1] - ranges[:, 0]
        spans = np.tile(criterion_spans, expected_shape[0])
        maximums = np.tile(ranges[:, 1], expected_shape[0])
        if not np.isfinite(spans).all():
            return {"reason": "invalid_normalization_domains"}
        if np.any(preferences_flat < minimums) or np.any(preferences_flat > maximums):
            return {"reason": "values_outside_normalization_domain"}
        preferences_flat = (preferences_flat - minimums) / spans
        projection_space = "criterion_domain_minmax"
    else:
        # Preserve the historical behavior for existing model callers.
        preferences_flat[preferences_flat == 0] = 1e-10

    if np.array_equal(
        preferences_flat,
        np.repeat(preferences_flat[:1], len(preferences_flat), axis=0),
    ):
        projection = {
            "expert_points": [[0.0, 0.0] for _ in matrices],
            "collective_point": [0.0, 0.0],
        }
        if projection_space:
            projection["projection_space"] = projection_space
        return projection

    if method.upper() == "PCA":
        reducer = PCA(n_components=2)
    else:
        reducer = MDS(
            n_components=2,
            dissimilarity="euclidean",
            random_state=42,
            n_init=4,
        )

    try:
        transformed = reducer.fit_transform(preferences_flat)
    except Exception:
        return {
            "reason": "projection_failed",
        }
    collective_point_np = transformed[-1]
    expert_points_np = transformed[:-1] - collective_point_np

    return {
        # Keep the full floating-point projection. Rounding here can collapse
        # distinct projected points and turn small positive distances into
        # exact zeros before the UI has a chance to format them honestly.
        "expert_points": expert_points_np.tolist(),
        "collective_point": collective_point_np.tolist(),
        **({"projection_space": projection_space} if projection_space else {}),
    }
