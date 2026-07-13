"""Implementación de Fuzzy TOPSIS para ejecución desde la API."""

import copy
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


def _normalize_fuzzy_weight_or_throw(value: Any, index: int) -> tuple[float, float, float]:
    field = f"weights[{index}]"

    if not isinstance(value, (list, tuple)) or len(value) != 3:
        raise ValueError("Fuzzy TOPSIS requires fuzzy criteria weights")

    parsed = [float(item) for item in value]

    if not all(np.isfinite(item) for item in parsed):
        raise ValueError(f"{field} must contain finite numbers")

    return tuple(parsed)


def _validate_fuzzy_matrices_or_throw(
    matrices: dict[str, list[list[list[float]]]],
) -> None:
    for expert_key, matrix in matrices.items():
        for row_index, row in enumerate(matrix):
            for col_index, cell in enumerate(row):
                field = (
                    f"matrices['{expert_key}'][{row_index}][{col_index}]"
                )
                if not isinstance(cell, (list, tuple)):
                    raise ValueError(
                        "Fuzzy TOPSIS requires fuzzy numeric values for every cell; "
                        f"cell {field} received {type(cell).__name__}"
                    )
                if len(cell) != 3:
                    raise ValueError(f"{field} must be a fuzzy triplet [l, m, u]")
                parsed = [float(item) for item in cell]
                if not all(np.isfinite(item) for item in parsed):
                    raise ValueError(f"{field} must contain finite numbers")


def _prepare_bounded_cost_inputs(
    matrix: list[list[tuple[float, float, float]]],
    criterion_type: list[str],
) -> tuple[list[list[tuple[float, float, float]]], list[str]]:
    """Preserve cost semantics when a bounded shoulder has a zero lower bound."""

    prepared_matrix = copy.deepcopy(matrix)
    prepared_types = list(criterion_type)

    for criterion_index, direction in enumerate(prepared_types):
        if direction != "min":
            continue

        has_zero_lower_bound = any(
            row[criterion_index][0] == 0 for row in prepared_matrix
        )
        if not has_zero_lower_bound:
            continue

        for row in prepared_matrix:
            lower, middle, upper = row[criterion_index]
            row[criterion_index] = (1 - upper, 1 - middle, 1 - lower)
        prepared_types[criterion_index] = "max"

    return prepared_matrix, prepared_types


def run_fuzzy_topsis(
    matrices: dict[str, list[list[list[float]]]],
    weights: list[Any],
    criterion_type: list[str],
) -> dict[str, Any]:
    """Ejecuta Fuzzy TOPSIS sobre una matriz colectiva difusa."""

    _validate_fuzzy_matrices_or_throw(matrices)

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

    flat_weights = [
        _normalize_fuzzy_weight_or_throw(weight, index)
        for index, weight in enumerate(weights)
    ]
    if len(flat_weights) != len(criterion_type):
        raise ValueError(f"Mismatch: {len(flat_weights)} weights vs {len(criterion_type)} criteria")

    algorithm_matrix, algorithm_criterion_type = _prepare_bounded_cost_inputs(
        collective_matrix,
        criterion_type,
    )
    collective_scores = fuzzy_topsis_method(
        dataset=algorithm_matrix,
        weights=[flat_weights],
        criterion_type=algorithm_criterion_type,
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
