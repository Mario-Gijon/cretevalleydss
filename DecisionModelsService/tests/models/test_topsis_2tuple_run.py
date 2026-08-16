from typing import Any

import pytest

from models.topsis_2tuple.run import (
    aggregate_expert_matrices,
    calculate_closeness_coefficients,
    calculate_ideal_solutions,
    calculate_weighted_distances,
    delta,
    delta_inverse,
    rank_closeness_coefficients,
    run_topsis_2tuple,
)


LABELS: list[dict[str, Any]] = [
    {
        "key": "s0",
        "label": "Very Low",
        "index": 0,
    },
    {
        "key": "s1",
        "label": "Low",
        "index": 1,
    },
    {
        "key": "s2",
        "label": "Medium",
        "index": 2,
    },
    {
        "key": "s3",
        "label": "High",
        "index": 3,
    },
    {
        "key": "s4",
        "label": "Very High",
        "index": 4,
    },
]


def test_delta_inverse_returns_beta() -> None:
    assert delta_inverse(
        label_index=2,
        alpha=-0.25,
        maximum_index=4,
    ) == pytest.approx(1.75)


@pytest.mark.parametrize(
    ("label_index", "alpha", "expected_beta"),
    [
        (0, 0.0, 0.0),
        (1, -0.5, 0.5),
        (2, 0.0, 2.0),
        (3, 0.49, 3.49),
        (4, 0.0, 4.0),
    ],
)
def test_delta_inverse_accepts_valid_2tuples(
    label_index: int,
    alpha: float,
    expected_beta: float,
) -> None:
    assert delta_inverse(
        label_index=label_index,
        alpha=alpha,
        maximum_index=4,
    ) == pytest.approx(expected_beta)


@pytest.mark.parametrize(
    "alpha",
    [
        0.5,
        0.5001,
        -0.5001,
    ],
)
def test_delta_inverse_rejects_invalid_alpha(
    alpha: float,
) -> None:
    with pytest.raises(
        ValueError,
        match="greater than or equal to -0.5",
    ):
        delta_inverse(
            label_index=2,
            alpha=alpha,
            maximum_index=4,
        )


@pytest.mark.parametrize(
    "alpha",
    [
        float("nan"),
        float("inf"),
        float("-inf"),
    ],
)
def test_delta_inverse_rejects_non_finite_alpha(
    alpha: float,
) -> None:
    with pytest.raises(
        ValueError,
        match="finite number",
    ):
        delta_inverse(
            label_index=2,
            alpha=alpha,
            maximum_index=4,
        )


@pytest.mark.parametrize(
    ("label_index", "alpha"),
    [
        (0, -0.5),
        (4, 0.1),
    ],
)
def test_delta_inverse_rejects_beta_outside_scale(
    label_index: int,
    alpha: float,
) -> None:
    with pytest.raises(
        ValueError,
        match="out-of-range",
    ):
        delta_inverse(
            label_index=label_index,
            alpha=alpha,
            maximum_index=4,
        )


def test_delta_reconstructs_2tuple() -> None:
    result = delta(
        beta=1.75,
        labels=LABELS,
    )

    assert result == {
        "labelKey": "s2",
        "alpha": -0.25,
    }


def test_delta_zero_maps_to_first_label() -> None:
    assert delta(
        beta=0.0,
        labels=LABELS,
    ) == {
        "labelKey": "s0",
        "alpha": 0.0,
    }


def test_delta_maximum_maps_to_last_label() -> None:
    assert delta(
        beta=4.0,
        labels=LABELS,
    ) == {
        "labelKey": "s4",
        "alpha": 0.0,
    }


@pytest.mark.parametrize(
    ("beta", "expected_label", "expected_alpha"),
    [
        (0.5, "s1", -0.5),
        (1.5, "s2", -0.5),
        (2.5, "s3", -0.5),
        (3.5, "s4", -0.5),
    ],
)
def test_delta_half_boundary_uses_upper_label(
    beta: float,
    expected_label: str,
    expected_alpha: float,
) -> None:
    result = delta(
        beta=beta,
        labels=LABELS,
    )

    assert result["labelKey"] == expected_label
    assert result["alpha"] == pytest.approx(
        expected_alpha
    )


def test_delta_does_not_use_python_bankers_rounding() -> None:
    assert round(2.5) == 2

    assert delta(
        beta=2.5,
        labels=LABELS,
    ) == {
        "labelKey": "s3",
        "alpha": -0.5,
    }


@pytest.mark.parametrize(
    "beta",
    [
        -0.01,
        4.01,
        float("nan"),
        float("inf"),
        float("-inf"),
    ],
)
def test_delta_rejects_invalid_beta(
    beta: float,
) -> None:
    with pytest.raises(ValueError):
        delta(
            beta=beta,
            labels=LABELS,
        )


def test_delta_tolerates_tiny_lower_floating_drift() -> None:
    assert delta(
        beta=-1e-13,
        labels=LABELS,
    ) == {
        "labelKey": "s0",
        "alpha": 0.0,
    }


def test_delta_tolerates_tiny_upper_floating_drift() -> None:
    assert delta(
        beta=4.0 + 1e-13,
        labels=LABELS,
    ) == {
        "labelKey": "s4",
        "alpha": 0.0,
    }


@pytest.mark.parametrize(
    ("label_index", "alpha"),
    [
        (0, 0.0),
        (1, -0.4),
        (1, 0.3),
        (2, -0.5),
        (2, 0.0),
        (3, -0.2),
        (3, 0.49),
        (4, -0.49),
        (4, 0.0),
    ],
)
def test_delta_and_delta_inverse_round_trip(
    label_index: int,
    alpha: float,
) -> None:
    beta = delta_inverse(
        label_index=label_index,
        alpha=alpha,
        maximum_index=4,
    )

    reconstructed = delta(
        beta=beta,
        labels=LABELS,
    )

    assert reconstructed["labelKey"] == (
        f"s{label_index}"
    )
    assert reconstructed["alpha"] == pytest.approx(
        alpha
    )
    
WEI_LABELS: list[dict[str, Any]] = [
    {"key": "EP", "label": "Extremely Poor", "index": 0},
    {"key": "VP", "label": "Very Poor", "index": 1},
    {"key": "P", "label": "Poor", "index": 2},
    {"key": "M", "label": "Medium", "index": 3},
    {"key": "G", "label": "Good", "index": 4},
    {"key": "VG", "label": "Very Good", "index": 5},
    {"key": "EG", "label": "Extremely Good", "index": 6},
]


WEI_CRITERION_SCALES = [
    {
        "criterionId": f"c{index + 1}",
        "labelCount": 7,
        "maximumIndex": 6,
        "labels": WEI_LABELS,
    }
    for index in range(4)
]


WEI_MATRICES = {
    "expert-1": [
        [3.0, 4.0, 2.0, 2.0],
        [2.0, 1.0, 3.0, 2.0],
        [4.0, 3.0, 4.0, 0.0],
        [5.0, 2.0, 2.0, 4.0],
        [6.0, 0.0, 1.0, 3.0],
    ],
    "expert-2": [
        [2.0, 3.0, 1.0, 1.0],
        [1.0, 0.0, 4.0, 4.0],
        [3.0, 4.0, 2.0, 6.0],
        [6.0, 1.0, 1.0, 3.0],
        [2.0, 1.0, 3.0, 1.0],
    ],
    "expert-3": [
        [4.0, 2.0, 1.0, 5.0],
        [1.0, 4.0, 2.0, 4.0],
        [5.0, 1.0, 4.0, 2.0],
        [4.0, 5.0, 6.0, 1.0],
        [3.0, 1.0, 3.0, 4.0],
    ],
}


def _assert_numeric_matrix_approx(
    actual: list[list[float]],
    expected: list[list[float]],
) -> None:
    assert len(actual) == len(expected)

    for actual_row, expected_row in zip(
        actual,
        expected,
        strict=True,
    ):
        assert actual_row == pytest.approx(expected_row)


def test_equal_expert_weights_reproduce_wei_collective_beta_matrix() -> None:
    result = aggregate_expert_matrices(
        matrices=WEI_MATRICES,
        expert_weights=[
            1.0 / 3.0,
            1.0 / 3.0,
            1.0 / 3.0,
        ],
        criterion_scales=WEI_CRITERION_SCALES,
    )

    _assert_numeric_matrix_approx(
        result["collective_beta_matrix"],
        [
            [
                3.0,
                3.0,
                4.0 / 3.0,
                8.0 / 3.0,
            ],
            [
                4.0 / 3.0,
                5.0 / 3.0,
                3.0,
                10.0 / 3.0,
            ],
            [
                4.0,
                8.0 / 3.0,
                10.0 / 3.0,
                8.0 / 3.0,
            ],
            [
                5.0,
                8.0 / 3.0,
                3.0,
                8.0 / 3.0,
            ],
            [
                11.0 / 3.0,
                2.0 / 3.0,
                7.0 / 3.0,
                8.0 / 3.0,
            ],
        ],
    )


def test_equal_expert_weights_reproduce_wei_collective_2tuples() -> None:
    result = aggregate_expert_matrices(
        matrices=WEI_MATRICES,
        expert_weights=[
            1.0 / 3.0,
            1.0 / 3.0,
            1.0 / 3.0,
        ],
        criterion_scales=WEI_CRITERION_SCALES,
    )

    collective = result["collective_matrix"]

    expected_labels = [
        ["M", "M", "VP", "M"],
        ["VP", "P", "M", "M"],
        ["G", "M", "M", "M"],
        ["VG", "M", "M", "M"],
        ["G", "VP", "P", "M"],
    ]

    expected_alphas = [
        [0.0, 0.0, 1.0 / 3.0, -1.0 / 3.0],
        [1.0 / 3.0, -1.0 / 3.0, 0.0, 1.0 / 3.0],
        [0.0, -1.0 / 3.0, 1.0 / 3.0, -1.0 / 3.0],
        [0.0, -1.0 / 3.0, 0.0, -1.0 / 3.0],
        [-1.0 / 3.0, -1.0 / 3.0, 1.0 / 3.0, -1.0 / 3.0],
    ]

    for row_index, row in enumerate(collective):
        for criterion_index, value in enumerate(row):
            assert value["labelKey"] == (
                expected_labels[row_index][criterion_index]
            )

            assert value["alpha"] == pytest.approx(
                expected_alphas[row_index][criterion_index]
            )


def test_weighted_expert_aggregation_uses_declared_weights() -> None:
    result = aggregate_expert_matrices(
        matrices=WEI_MATRICES,
        expert_weights=[0.5, 0.3, 0.2],
        criterion_scales=WEI_CRITERION_SCALES,
    )

    assert result["collective_beta_matrix"][0] == pytest.approx(
        [
            2.9,
            3.3,
            1.5,
            2.3,
        ]
    )

    assert result["collective_matrix"][0][0] == {
        "labelKey": "M",
        "alpha": pytest.approx(-0.1),
    }

    assert result["collective_matrix"][0][1] == {
        "labelKey": "M",
        "alpha": pytest.approx(0.3),
    }

    assert result["collective_matrix"][0][2] == {
        "labelKey": "P",
        "alpha": -0.5,
    }

    assert result["collective_matrix"][0][3] == {
        "labelKey": "P",
        "alpha": pytest.approx(0.3),
    }


def test_expert_aggregation_rejects_invalid_weight_sum() -> None:
    with pytest.raises(
        ValueError,
        match="expert_weights must sum to 1",
    ):
        aggregate_expert_matrices(
            matrices=WEI_MATRICES,
            expert_weights=[0.5, 0.3, 0.1],
            criterion_scales=WEI_CRITERION_SCALES,
        )


def test_expert_aggregation_rejects_inconsistent_matrix_shape() -> None:
    matrices = {
        key: [
            list(row)
            for row in matrix
        ]
        for key, matrix in WEI_MATRICES.items()
    }

    matrices["expert-2"][0] = [
        2.0,
        3.0,
        1.0,
    ]

    with pytest.raises(
        ValueError,
        match="same number of criteria",
    ):
        aggregate_expert_matrices(
            matrices=matrices,
            expert_weights=[
                1.0 / 3.0,
                1.0 / 3.0,
                1.0 / 3.0,
            ],
            criterion_scales=WEI_CRITERION_SCALES,
        )
        
def test_wei_collective_matrix_reproduces_published_ideal_solutions() -> None:
    aggregation = aggregate_expert_matrices(
        matrices=WEI_MATRICES,
        expert_weights=[
            1.0 / 3.0,
            1.0 / 3.0,
            1.0 / 3.0,
        ],
        criterion_scales=WEI_CRITERION_SCALES,
    )

    ideals = calculate_ideal_solutions(
        collective_beta_matrix=aggregation[
            "collective_beta_matrix"
        ],
        criterion_directions=[
            "max",
            "max",
            "max",
            "max",
        ],
        criterion_scales=WEI_CRITERION_SCALES,
    )

    assert ideals["positive_ideal_beta"] == pytest.approx(
        [
            5.0,
            3.0,
            10.0 / 3.0,
            10.0 / 3.0,
        ]
    )

    assert ideals["negative_ideal_beta"] == pytest.approx(
        [
            4.0 / 3.0,
            2.0 / 3.0,
            4.0 / 3.0,
            8.0 / 3.0,
        ]
    )


def test_wei_collective_matrix_reproduces_published_ideal_2tuples() -> None:
    aggregation = aggregate_expert_matrices(
        matrices=WEI_MATRICES,
        expert_weights=[
            1.0 / 3.0,
            1.0 / 3.0,
            1.0 / 3.0,
        ],
        criterion_scales=WEI_CRITERION_SCALES,
    )

    ideals = calculate_ideal_solutions(
        collective_beta_matrix=aggregation[
            "collective_beta_matrix"
        ],
        criterion_directions=[
            "max",
            "max",
            "max",
            "max",
        ],
        criterion_scales=WEI_CRITERION_SCALES,
    )

    positive = ideals["positive_ideal"]

    assert positive[0] == {
        "labelKey": "VG",
        "alpha": 0.0,
    }
    assert positive[1] == {
        "labelKey": "M",
        "alpha": 0.0,
    }
    assert positive[2]["labelKey"] == "M"
    assert positive[2]["alpha"] == pytest.approx(
        1.0 / 3.0
    )
    assert positive[3]["labelKey"] == "M"
    assert positive[3]["alpha"] == pytest.approx(
        1.0 / 3.0
    )

    negative = ideals["negative_ideal"]

    assert negative[0]["labelKey"] == "VP"
    assert negative[0]["alpha"] == pytest.approx(
        1.0 / 3.0
    )

    assert negative[1]["labelKey"] == "VP"
    assert negative[1]["alpha"] == pytest.approx(
        -1.0 / 3.0
    )

    assert negative[2]["labelKey"] == "VP"
    assert negative[2]["alpha"] == pytest.approx(
        1.0 / 3.0
    )

    assert negative[3]["labelKey"] == "M"
    assert negative[3]["alpha"] == pytest.approx(
        -1.0 / 3.0
    )


def test_ideal_solutions_reverse_positive_and_negative_for_cost_criteria() -> None:
    scales = [
        {
            "criterionId": "benefit",
            "labelCount": 5,
            "maximumIndex": 4,
            "labels": LABELS,
        },
        {
            "criterionId": "cost",
            "labelCount": 5,
            "maximumIndex": 4,
            "labels": LABELS,
        },
    ]

    ideals = calculate_ideal_solutions(
        collective_beta_matrix=[
            [1.0, 4.0],
            [3.0, 2.0],
            [2.0, 3.0],
        ],
        criterion_directions=[
            "max",
            "min",
        ],
        criterion_scales=scales,
    )

    assert ideals["positive_ideal_beta"] == pytest.approx(
        [
            3.0,
            2.0,
        ]
    )

    assert ideals["negative_ideal_beta"] == pytest.approx(
        [
            1.0,
            4.0,
        ]
    )

    assert ideals["positive_ideal"] == [
        {
            "labelKey": "s3",
            "alpha": 0.0,
        },
        {
            "labelKey": "s2",
            "alpha": 0.0,
        },
    ]

    assert ideals["negative_ideal"] == [
        {
            "labelKey": "s1",
            "alpha": 0.0,
        },
        {
            "labelKey": "s4",
            "alpha": 0.0,
        },
    ]


def test_ideal_solutions_reject_unknown_direction() -> None:
    with pytest.raises(
        ValueError,
        match="Unsupported criterion direction",
    ):
        calculate_ideal_solutions(
            collective_beta_matrix=[
                [1.0],
                [2.0],
            ],
            criterion_directions=[
                "sideways",
            ],
            criterion_scales=[
                {
                    "criterionId": "criterion",
                    "labelCount": 5,
                    "maximumIndex": 4,
                    "labels": LABELS,
                }
            ],
        )


def test_ideal_solutions_reject_inconsistent_collective_matrix() -> None:
    with pytest.raises(
        ValueError,
        match="same number of criteria",
    ):
        calculate_ideal_solutions(
            collective_beta_matrix=[
                [1.0, 2.0],
                [3.0],
            ],
            criterion_directions=[
                "max",
                "max",
            ],
            criterion_scales=[
                {
                    "criterionId": "c1",
                    "labelCount": 5,
                    "maximumIndex": 4,
                    "labels": LABELS,
                },
                {
                    "criterionId": "c2",
                    "labelCount": 5,
                    "maximumIndex": 4,
                    "labels": LABELS,
                },
            ],
        )


WEI_CRITERION_WEIGHTS = [
    0.1800,
    0.3200,
    0.3560,
    0.1440,
]


def _wei_aggregation_and_ideals() -> tuple[
    dict[str, Any],
    dict[str, Any],
]:
    aggregation = aggregate_expert_matrices(
        matrices=WEI_MATRICES,
        expert_weights=[
            1.0 / 3.0,
            1.0 / 3.0,
            1.0 / 3.0,
        ],
        criterion_scales=WEI_CRITERION_SCALES,
    )

    ideals = calculate_ideal_solutions(
        collective_beta_matrix=aggregation[
            "collective_beta_matrix"
        ],
        criterion_directions=[
            "max",
            "max",
            "max",
            "max",
        ],
        criterion_scales=WEI_CRITERION_SCALES,
    )

    return aggregation, ideals


def test_wei_example_reproduces_weighted_positive_distances() -> None:
    aggregation, ideals = _wei_aggregation_and_ideals()

    distances = calculate_weighted_distances(
        collective_beta_matrix=aggregation[
            "collective_beta_matrix"
        ],
        positive_ideal_beta=ideals[
            "positive_ideal_beta"
        ],
        negative_ideal_beta=ideals[
            "negative_ideal_beta"
        ],
        weights=WEI_CRITERION_WEIGHTS,
    )

    assert distances[
        "positive_distances"
    ] == pytest.approx(
        [
            1.168,
            1.2053333333333334,
            0.38266666666666665,
            0.32133333333333336,
            1.4386666666666668,
        ]
    )


def test_wei_example_reproduces_weighted_negative_distances() -> None:
    aggregation, ideals = _wei_aggregation_and_ideals()

    distances = calculate_weighted_distances(
        collective_beta_matrix=aggregation[
            "collective_beta_matrix"
        ],
        positive_ideal_beta=ideals[
            "positive_ideal_beta"
        ],
        negative_ideal_beta=ideals[
            "negative_ideal_beta"
        ],
        weights=WEI_CRITERION_WEIGHTS,
    )

    assert distances[
        "negative_distances"
    ] == pytest.approx(
        [
            1.0466666666666666,
            1.0093333333333334,
            1.832,
            1.8933333333333333,
            0.776,
        ]
    )


def test_wei_distances_reproduce_published_rounded_values() -> None:
    aggregation, ideals = _wei_aggregation_and_ideals()

    distances = calculate_weighted_distances(
        collective_beta_matrix=aggregation[
            "collective_beta_matrix"
        ],
        positive_ideal_beta=ideals[
            "positive_ideal_beta"
        ],
        negative_ideal_beta=ideals[
            "negative_ideal_beta"
        ],
        weights=WEI_CRITERION_WEIGHTS,
    )

    assert [
        round(value, 2)
        for value in distances["positive_distances"]
    ] == [
        1.17,
        1.21,
        0.38,
        0.32,
        1.44,
    ]

    assert [
        round(value, 2)
        for value in distances["negative_distances"]
    ] == [
        1.05,
        1.01,
        1.83,
        1.89,
        0.78,
    ]


def test_wei_distances_can_be_represented_as_published_2tuples() -> None:
    aggregation, ideals = _wei_aggregation_and_ideals()

    distances = calculate_weighted_distances(
        collective_beta_matrix=aggregation[
            "collective_beta_matrix"
        ],
        positive_ideal_beta=ideals[
            "positive_ideal_beta"
        ],
        negative_ideal_beta=ideals[
            "negative_ideal_beta"
        ],
        weights=WEI_CRITERION_WEIGHTS,
    )

    positive_tuples = [
        delta(
            beta=value,
            labels=WEI_LABELS,
        )
        for value in distances["positive_distances"]
    ]

    negative_tuples = [
        delta(
            beta=value,
            labels=WEI_LABELS,
        )
        for value in distances["negative_distances"]
    ]

    assert [
        value["labelKey"]
        for value in positive_tuples
    ] == [
        "VP",
        "VP",
        "EP",
        "EP",
        "VP",
    ]

    assert [
        round(value["alpha"], 2)
        for value in positive_tuples
    ] == [
        0.17,
        0.21,
        0.38,
        0.32,
        0.44,
    ]

    assert [
        value["labelKey"]
        for value in negative_tuples
    ] == [
        "VP",
        "VP",
        "P",
        "P",
        "VP",
    ]

    assert [
        round(value["alpha"], 2)
        for value in negative_tuples
    ] == [
        0.05,
        0.01,
        -0.17,
        -0.11,
        -0.22,
    ]


def test_weighted_distances_use_weighted_absolute_distance() -> None:
    distances = calculate_weighted_distances(
        collective_beta_matrix=[
            [1.0, 4.0],
            [3.0, 2.0],
        ],
        positive_ideal_beta=[
            3.0,
            2.0,
        ],
        negative_ideal_beta=[
            1.0,
            4.0,
        ],
        weights=[
            0.75,
            0.25,
        ],
    )

    assert distances[
        "positive_distances"
    ] == pytest.approx(
        [
            2.0,
            0.0,
        ]
    )

    assert distances[
        "negative_distances"
    ] == pytest.approx(
        [
            0.0,
            2.0,
        ]
    )


def test_weighted_distances_reject_invalid_weight_sum() -> None:
    with pytest.raises(
        ValueError,
        match="weights must sum to 1",
    ):
        calculate_weighted_distances(
            collective_beta_matrix=[
                [1.0, 2.0],
            ],
            positive_ideal_beta=[
                2.0,
                2.0,
            ],
            negative_ideal_beta=[
                1.0,
                1.0,
            ],
            weights=[
                0.4,
                0.4,
            ],
        )


def test_weighted_distances_reject_negative_weight() -> None:
    with pytest.raises(
        ValueError,
        match="greater than or equal to 0",
    ):
        calculate_weighted_distances(
            collective_beta_matrix=[
                [1.0, 2.0],
            ],
            positive_ideal_beta=[
                2.0,
                2.0,
            ],
            negative_ideal_beta=[
                1.0,
                1.0,
            ],
            weights=[
                1.1,
                -0.1,
            ],
        )


def test_weighted_distances_reject_inconsistent_matrix_shape() -> None:
    with pytest.raises(
        ValueError,
        match="same number of criteria",
    ):
        calculate_weighted_distances(
            collective_beta_matrix=[
                [1.0, 2.0],
                [3.0],
            ],
            positive_ideal_beta=[
                3.0,
                2.0,
            ],
            negative_ideal_beta=[
                1.0,
                1.0,
            ],
            weights=[
                0.5,
                0.5,
            ],
        )


def _wei_distances() -> dict[str, list[float]]:
    aggregation, ideals = _wei_aggregation_and_ideals()

    return calculate_weighted_distances(
        collective_beta_matrix=aggregation[
            "collective_beta_matrix"
        ],
        positive_ideal_beta=ideals[
            "positive_ideal_beta"
        ],
        negative_ideal_beta=ideals[
            "negative_ideal_beta"
        ],
        weights=WEI_CRITERION_WEIGHTS,
    )


def test_wei_example_reproduces_closeness_coefficients() -> None:
    distances = _wei_distances()

    coefficients = calculate_closeness_coefficients(
        positive_distances=distances[
            "positive_distances"
        ],
        negative_distances=distances[
            "negative_distances"
        ],
    )

    assert coefficients == pytest.approx(
        [
            0.4726068633353402,
            0.4557495484647802,
            0.827212522576761,
            0.8549066827212523,
            0.3503913305237808,
        ]
    )


def test_wei_example_reproduces_published_ranking() -> None:
    distances = _wei_distances()

    coefficients = calculate_closeness_coefficients(
        positive_distances=distances[
            "positive_distances"
        ],
        negative_distances=distances[
            "negative_distances"
        ],
    )

    ranking = rank_closeness_coefficients(
        coefficients
    )

    assert ranking == [
        3,
        2,
        0,
        1,
        4,
    ]


def test_wei_example_matches_published_closeness_values_with_rounding_tolerance() -> None:
    distances = _wei_distances()

    coefficients = calculate_closeness_coefficients(
        positive_distances=distances[
            "positive_distances"
        ],
        negative_distances=distances[
            "negative_distances"
        ],
    )

    published_values = [
        0.47,
        0.45,
        0.83,
        0.86,
        0.35,
    ]

    for actual, published in zip(
        coefficients,
        published_values,
        strict=True,
    ):
        assert actual == pytest.approx(
            published,
            abs=0.01,
        )


def test_closeness_coefficient_uses_negative_distance_over_total() -> None:
    coefficients = calculate_closeness_coefficients(
        positive_distances=[
            0.0,
            2.0,
            1.0,
        ],
        negative_distances=[
            2.0,
            0.0,
            1.0,
        ],
    )

    assert coefficients == pytest.approx(
        [
            1.0,
            0.0,
            0.5,
        ]
    )


def test_closeness_coefficient_uses_neutral_value_for_zero_denominator() -> None:
    coefficients = calculate_closeness_coefficients(
        positive_distances=[
            0.0,
        ],
        negative_distances=[
            0.0,
        ],
    )

    assert coefficients == [
        0.5,
    ]


@pytest.mark.parametrize(
    (
        "positive_distances",
        "negative_distances",
        "message",
    ),
    [
        (
            [-0.1],
            [0.5],
            "greater than or equal to 0",
        ),
        (
            [0.5],
            [-0.1],
            "greater than or equal to 0",
        ),
    ],
)
def test_closeness_rejects_negative_distances(
    positive_distances: list[float],
    negative_distances: list[float],
    message: str,
) -> None:
    with pytest.raises(
        ValueError,
        match=message,
    ):
        calculate_closeness_coefficients(
            positive_distances=positive_distances,
            negative_distances=negative_distances,
        )


def test_closeness_rejects_mismatched_distance_lengths() -> None:
    with pytest.raises(
        ValueError,
        match="same number of alternatives",
    ):
        calculate_closeness_coefficients(
            positive_distances=[
                1.0,
                2.0,
            ],
            negative_distances=[
                1.0,
            ],
        )


def test_ranking_orders_highest_closeness_first() -> None:
    assert rank_closeness_coefficients(
        [
            0.2,
            0.9,
            0.5,
        ]
    ) == [
        1,
        2,
        0,
    ]


def test_ranking_preserves_original_order_for_ties() -> None:
    assert rank_closeness_coefficients(
        [
            0.7,
            0.7,
            0.2,
        ]
    ) == [
        0,
        1,
        2,
    ]


@pytest.mark.parametrize(
    "score",
    [
        -0.1,
        1.1,
        float("nan"),
        float("inf"),
        float("-inf"),
    ],
)
def test_ranking_rejects_invalid_closeness_scores(
    score: float,
) -> None:
    with pytest.raises(ValueError):
        rank_closeness_coefficients(
            [
                score,
            ]
        )


def test_run_topsis_2tuple_reproduces_wei_example_end_to_end() -> None:
    result = run_topsis_2tuple(
        matrices=WEI_MATRICES,
        expert_weights=[
            1.0 / 3.0,
            1.0 / 3.0,
            1.0 / 3.0,
        ],
        weights=WEI_CRITERION_WEIGHTS,
        criterion_directions=[
            "max",
            "max",
            "max",
            "max",
        ],
        criterion_scales=WEI_CRITERION_SCALES,
    )

    assert result["collective_ranking"] == [
        3,
        2,
        0,
        1,
        4,
    ]

    assert result[
        "collective_scores"
    ] == pytest.approx(
        [
            0.4726068633353402,
            0.4557495484647802,
            0.827212522576761,
            0.8549066827212523,
            0.3503913305237808,
        ]
    )

    assert result[
        "closeness_coefficients"
    ] == pytest.approx(
        result["collective_scores"]
    )


def test_run_topsis_2tuple_reproduces_wei_collective_matrix() -> None:
    result = run_topsis_2tuple(
        matrices=WEI_MATRICES,
        expert_weights=[
            1.0 / 3.0,
            1.0 / 3.0,
            1.0 / 3.0,
        ],
        weights=WEI_CRITERION_WEIGHTS,
        criterion_directions=[
            "max",
            "max",
            "max",
            "max",
        ],
        criterion_scales=WEI_CRITERION_SCALES,
    )

    collective = result["collective_matrix"]

    assert collective[0][0] == {
        "labelKey": "M",
        "alpha": 0.0,
    }

    assert collective[0][2]["labelKey"] == "VP"
    assert collective[0][2]["alpha"] == pytest.approx(
        1.0 / 3.0
    )

    assert collective[3][0] == {
        "labelKey": "VG",
        "alpha": 0.0,
    }


def test_run_topsis_2tuple_reproduces_wei_ideal_solutions() -> None:
    result = run_topsis_2tuple(
        matrices=WEI_MATRICES,
        expert_weights=[
            1.0 / 3.0,
            1.0 / 3.0,
            1.0 / 3.0,
        ],
        weights=WEI_CRITERION_WEIGHTS,
        criterion_directions=[
            "max",
            "max",
            "max",
            "max",
        ],
        criterion_scales=WEI_CRITERION_SCALES,
    )

    assert result[
        "positive_ideal_beta"
    ] == pytest.approx(
        [
            5.0,
            3.0,
            10.0 / 3.0,
            10.0 / 3.0,
        ]
    )

    assert result[
        "negative_ideal_beta"
    ] == pytest.approx(
        [
            4.0 / 3.0,
            2.0 / 3.0,
            4.0 / 3.0,
            8.0 / 3.0,
        ]
    )


def test_run_topsis_2tuple_reproduces_wei_distances() -> None:
    result = run_topsis_2tuple(
        matrices=WEI_MATRICES,
        expert_weights=[
            1.0 / 3.0,
            1.0 / 3.0,
            1.0 / 3.0,
        ],
        weights=WEI_CRITERION_WEIGHTS,
        criterion_directions=[
            "max",
            "max",
            "max",
            "max",
        ],
        criterion_scales=WEI_CRITERION_SCALES,
    )

    assert result[
        "positive_distances"
    ] == pytest.approx(
        [
            1.168,
            1.2053333333333334,
            0.38266666666666665,
            0.32133333333333336,
            1.4386666666666668,
        ]
    )

    assert result[
        "negative_distances"
    ] == pytest.approx(
        [
            1.0466666666666666,
            1.0093333333333334,
            1.832,
            1.8933333333333333,
            0.776,
        ]
    )


def test_run_topsis_2tuple_preserves_algorithm_evidence() -> None:
    expert_weights = [
        0.5,
        0.3,
        0.2,
    ]

    criterion_weights = [
        0.18,
        0.32,
        0.356,
        0.144,
    ]

    directions = [
        "max",
        "max",
        "max",
        "max",
    ]

    result = run_topsis_2tuple(
        matrices=WEI_MATRICES,
        expert_weights=expert_weights,
        weights=criterion_weights,
        criterion_directions=directions,
        criterion_scales=WEI_CRITERION_SCALES,
    )

    assert result["expert_weights"] == expert_weights

    assert result[
        "criterion_weights"
    ] == criterion_weights

    assert result[
        "criterion_directions"
    ] == directions

    assert result["plots_graphic"] == {}
