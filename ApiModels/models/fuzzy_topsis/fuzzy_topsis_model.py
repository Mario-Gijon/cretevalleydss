"""Implementación de Fuzzy TOPSIS para ejecución desde la API."""

from typing import Any

import numpy as np
from pyDecision.algorithm import fuzzy_topsis_method

from utils.defuzzify_centroid import defuzzify_centroid
from utils.get_plots_graphics_from_matrices import get_plots_graphics_from_matrices


def _avg_triples(triples_list: list[list[float]]) -> tuple[float, float, float]:
    """Calcula el promedio componente a componente de etiquetas triangulares."""

    low = float(np.mean([triple[0] for triple in triples_list]))
    medium = float(np.mean([triple[1] for triple in triples_list]))
    high = float(np.mean([triple[2] for triple in triples_list]))
    return low, medium, high


def run_fuzzy_topsis(
    matrices: dict[str, list[list[list[float]]]],
    weights: list[list[float]],
    criterion_type: list[str],
) -> dict[str, Any]:
    """Ejecuta Fuzzy TOPSIS sobre una matriz colectiva difusa."""

    matrices_list = list(matrices.values())
    first_matrix = matrices_list[0]
    alternatives_count = len(first_matrix)
    criteria_count = len(first_matrix[0])

    collective_matrix: list[list[tuple[float, float, float]]] = []
    for alternative_idx in range(alternatives_count):
        row: list[tuple[float, float, float]] = []
        for criterion_idx in range(criteria_count):
            triples = [matrix[alternative_idx][criterion_idx] for matrix in matrices_list]
            row.append(_avg_triples(triples))
        collective_matrix.append(row)

    flat_weights = [tuple(weight) for weight in weights]
    if len(flat_weights) != len(criterion_type):
        raise ValueError(f"Mismatch: {len(flat_weights)} weights vs {len(criterion_type)} criteria")

    collective_scores = fuzzy_topsis_method(
        dataset=collective_matrix,
        weights=[flat_weights],
        criterion_type=criterion_type,
        graph=False,
        verbose=False,
    ).tolist()

    matrices_crisp = [defuzzify_centroid(matrix) for matrix in matrices_list]
    collective_crisp = defuzzify_centroid(collective_matrix)

    return {
        "collective_matrix": collective_matrix,
        "collective_scores": collective_scores,
        "collective_ranking": np.argsort(collective_scores)[::-1].tolist(),
        "plots_graphic": get_plots_graphics_from_matrices(
            matrices_np=matrices_crisp,
            collective_matrix=collective_crisp,
            method="MDS",
        ),
    }
