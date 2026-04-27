"""Conversión de matrices difusas triangulares a escala crisp por centroide."""

from typing import Any

import numpy as np


def defuzzify_centroid(matrix_fuzzy: Any) -> np.ndarray:
    """Defuzzifica una matriz fuzzy triangular aplicando promedio (l+m+u)/3."""

    matrix = np.array(matrix_fuzzy, dtype=float)
    return (matrix[..., 0] + matrix[..., 1] + matrix[..., 2]) / 3.0
