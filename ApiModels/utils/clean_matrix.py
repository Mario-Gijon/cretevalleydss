"""Utilidades para filtrar columnas no informativas en matrices de decisión."""

from typing import Any

import numpy as np


def clean_matrix(
    matrix: Any,
    weights: Any,
    criterion_type: Any,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Elimina columnas constantes y ajusta pesos/tipos en el mismo índice.

    Si todas las columnas son constantes, conserva todas para mantener
    compatibilidad con el comportamiento histórico de los modelos.
    """

    matrix_np = np.array(matrix, dtype=float)
    weights_np = np.array(weights, dtype=float)
    criterion_type_np = np.array(criterion_type)

    keep_cols = np.ptp(matrix_np, axis=0) != 0
    if not np.any(keep_cols):
        keep_cols[:] = True

    return (
        matrix_np[:, keep_cols],
        weights_np[keep_cols],
        criterion_type_np[keep_cols],
    )
