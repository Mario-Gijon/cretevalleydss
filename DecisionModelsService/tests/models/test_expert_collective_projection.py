import numpy as np

from utils.get_plots_graphics_from_matrices import (
    get_plots_graphics_from_matrices,
)


def test_projection_normalizes_each_criterion_to_its_declared_domain():
    matrices = [
        [[0.0, 0.0], [1000.0, 0.0]],
        [[0.0, 10.0], [1000.0, 10.0]],
    ]
    collective = np.mean(np.asarray(matrices, dtype=float), axis=0)

    projection = get_plots_graphics_from_matrices(
        matrices,
        collective,
        feature_ranges=[[0.0, 1000.0], [0.0, 10.0]],
    )

    assert projection["projection_space"] == "criterion_domain_minmax"
    assert len(projection["expert_points"]) == 2
    assert len(projection["collective_point"]) == 2
    assert np.isfinite(np.asarray(projection["expert_points"], dtype=float)).all()
    assert np.isfinite(np.asarray(projection["collective_point"], dtype=float)).all()


def test_projection_returns_exact_coincident_points_for_identical_matrices():
    matrix = [[2.0, 4.0], [6.0, 8.0]]
    projection = get_plots_graphics_from_matrices(
        [matrix],
        matrix,
        feature_ranges=[[0.0, 10.0], [0.0, 10.0]],
    )

    assert projection == {
        "expert_points": [[0.0, 0.0]],
        "collective_point": [0.0, 0.0],
        "projection_space": "criterion_domain_minmax",
    }


def test_projection_rejects_incomplete_or_non_finite_matrix_evidence():
    assert get_plots_graphics_from_matrices(
        [[[1.0, 2.0]]],
        [[1.0]],
        feature_ranges=[[0.0, 2.0], [0.0, 2.0]],
    ) == {"reason": "incompatible_matrix_dimensions"}
    assert get_plots_graphics_from_matrices(
        [[[1.0, float("nan")]]],
        [[1.0, 2.0]],
        feature_ranges=[[0.0, 2.0], [0.0, 2.0]],
    ) == {"reason": "non_finite_input"}
    assert get_plots_graphics_from_matrices(
        [[[1.0, 2.0]]],
        [[1.0, 2.0]],
        feature_ranges=[[0.0, 2.0]],
    ) == {"reason": "invalid_normalization_domains"}
    assert get_plots_graphics_from_matrices(
        [[[0.0]]],
        [[0.0]],
        feature_ranges=[[-1e308, 1e308]],
    ) == {"reason": "invalid_normalization_domains"}


def test_projection_rejects_values_outside_declared_domains_without_coordinates():
    projection = get_plots_graphics_from_matrices(
        [[[0.0, 2.1]]],
        [[0.0, 2.1]],
        feature_ranges=[[0.0, 1.0], [0.0, 2.0]],
    )

    assert projection == {"reason": "values_outside_normalization_domain"}
