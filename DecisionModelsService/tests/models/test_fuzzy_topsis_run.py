import copy

import numpy as np
import pytest

import models.fuzzy_topsis.run as fuzzy_topsis_run


def _patch_projection(monkeypatch) -> None:
    monkeypatch.setattr(
        fuzzy_topsis_run,
        "get_plots_graphics_from_matrices",
        lambda **_: {},
    )


def test_run_fuzzy_topsis_passes_aggregated_inputs_directly_to_pydecision(monkeypatch) -> None:
    captured: dict[str, object] = {}
    matrices = {
        "expert-a": [
            [[0, 0, 0.25], [0.1, 0.3, 0.5]],
            [[0.25, 0.5, 0.75], [0.3, 0.5, 0.7]],
        ],
        "expert-b": [
            [[0, 0, 0.25], [0.1, 0.3, 0.5]],
            [[0.25, 0.5, 0.75], [0.3, 0.5, 0.7]],
        ],
    }
    original_matrices = copy.deepcopy(matrices)
    directions = ["max", "min"]
    original_directions = list(directions)

    def fake_fuzzy_topsis_method(*, dataset, weights, criterion_type, graph, verbose):
        captured["dataset"] = dataset
        captured["weights"] = weights
        captured["criterion_type"] = criterion_type
        captured["graph"] = graph
        captured["verbose"] = verbose
        return np.array([0.2, 0.8])

    monkeypatch.setattr(
        fuzzy_topsis_run,
        "fuzzy_topsis_method",
        fake_fuzzy_topsis_method,
    )
    _patch_projection(monkeypatch)

    result = fuzzy_topsis_run.run_fuzzy_topsis(
        matrices=matrices,
        weights=[[0.4, 0.5, 0.6], [0.2, 0.3, 0.4]],
        criterion_type=directions,
    )

    expected_matrix = [
        [(0.0, 0.0, 0.25), (0.1, 0.3, 0.5)],
        [(0.25, 0.5, 0.75), (0.3, 0.5, 0.7)],
    ]
    assert captured == {
        "dataset": expected_matrix,
        "weights": [[(0.4, 0.5, 0.6), (0.2, 0.3, 0.4)]],
        "criterion_type": directions,
        "graph": False,
        "verbose": False,
    }
    assert captured["criterion_type"] is directions
    assert matrices == original_matrices
    assert directions == original_directions
    assert result["collective_matrix"] == expected_matrix


@pytest.mark.parametrize(
    ("direction", "triplet", "should_raise"),
    [
        ("max", [0, 0, 0.25], False),
        ("min", [0.1, 0.3, 0.5], False),
        ("min", [0, 0, 0.25], True),
        ("min", [0, 0.25, 0.5], True),
    ],
)
def test_run_fuzzy_topsis_validates_zero_lower_bounds_only_for_costs(
    monkeypatch,
    direction,
    triplet,
    should_raise,
) -> None:
    called = False

    def fake_fuzzy_topsis_method(**_):
        nonlocal called
        called = True
        return np.array([0.5])

    monkeypatch.setattr(
        fuzzy_topsis_run,
        "fuzzy_topsis_method",
        fake_fuzzy_topsis_method,
    )
    _patch_projection(monkeypatch)
    matrices = {"expert": [[triplet]]}
    directions = [direction]

    if should_raise:
        with pytest.raises(
            ValueError,
            match=r"zero lower bound.*alternative index 0, criterion index 0",
        ):
            fuzzy_topsis_run.run_fuzzy_topsis(
                matrices=matrices,
                weights=[[0.4, 0.5, 0.6]],
                criterion_type=directions,
            )
        assert called is False
    else:
        result = fuzzy_topsis_run.run_fuzzy_topsis(
            matrices=matrices,
            weights=[[0.4, 0.5, 0.6]],
            criterion_type=directions,
        )
        assert called is True
        assert result["collective_scores"] == [0.5]
