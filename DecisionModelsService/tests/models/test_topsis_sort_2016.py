from copy import deepcopy

import numpy as np
import pytest

from models.topsis_sort_2016.run import (
    ProfileBoundaryTieError,
    TopsisSort2016Error,
    UndefinedClosenessError,
    UndefinedNormalizationError,
    calculate_closeness_coefficients,
    calculate_euclidean_distances,
    normalize_eq7,
    run_topsis_sort_2016,
    weighted_normalized_matrix,
)
from models.topsis_sort_2016.tehran_2016 import (
    CRITERION_IDS,
    PUBLISHED_TABLE_3_ANTI_IDEAL_DIRECT,
    PUBLISHED_TABLE_3_DIRECT_WEIGHTED,
    PUBLISHED_TABLE_3_IDEAL_DIRECT,
    PUBLISHED_TABLE_4_DISTANCES,
    PUBLISHED_TABLE_5_CLASS_BY_DISTRICT,
    TEHRAN_ALTERNATIVES,
    TEHRAN_CATEGORIES,
    TEHRAN_CRITERIA,
    TEHRAN_PROFILES,
)


def _two_category_problem(*, alternatives=None):
    return {
        "criteria": [
            {"criterion_id": "growth", "direction": "benefit", "weight": 0.6},
            {"criterion_id": "cost", "direction": "cost", "weight": 0.4},
        ],
        "categories": [
            {"category_id": "low", "label": "Shared label", "order": 0},
            {"category_id": "high", "label": "Shared label", "order": 1},
        ],
        "profiles": [
            {
                "profile_id": "limit-high",
                "category_id": "high",
                "values_by_criterion_id": {"growth": 3, "cost": 4},
            }
        ],
        "alternatives": alternatives
        or [
            {
                "alternative_id": "a-best",
                "values_by_criterion_id": {"growth": 4, "cost": 2},
            },
            {
                "alternative_id": "a-worst",
                "values_by_criterion_id": {"growth": 2, "cost": 6},
            },
        ],
    }


def _run(problem):
    return run_topsis_sort_2016(
        alternatives=problem["alternatives"],
        criteria=problem["criteria"],
        profiles=problem["profiles"],
        categories=problem["categories"],
    )


def _entity_value(diagnostics, map_prefix, item_id):
    if item_id.startswith("district-") or item_id in {"a-best", "a-worst", "on-boundary"}:
        entity = "alternative"
    else:
        entity = "profile"
    return diagnostics[f"{map_prefix}_by_{entity}_id"][item_id]


def test_eq7_normalization_and_eq2_weighting_match_independent_values():
    normalized, maxima = normalize_eq7(
        [[4, 2], [2, 6], [3, 4]],
        ["benefit", "cost"],
    )
    expected_normalized = np.array(
        [[1.0, 2 / 3], [0.5, 0.0], [0.75, 1 / 3]],
    )
    np.testing.assert_allclose(maxima, [4, 6], rtol=0, atol=0)
    np.testing.assert_allclose(normalized, expected_normalized, rtol=0, atol=1e-15)

    weighted = weighted_normalized_matrix(normalized, [0.6, 0.4])
    np.testing.assert_allclose(
        weighted,
        [[0.6, 4 / 15], [0.3, 0.0], [0.45, 2 / 15]],
        rtol=0,
        atol=1e-15,
    )


def test_ideal_distances_and_relative_closeness_match_hand_calculation():
    matrix = np.array([[0.6, 4 / 15], [0.3, 0.0], [0.45, 2 / 15]])
    positive_ideal = np.array([0.6, 4 / 15])
    negative_ideal = np.array([0.3, 0.0])
    to_positive = calculate_euclidean_distances(matrix, positive_ideal)
    to_negative = calculate_euclidean_distances(matrix, negative_ideal)
    expected_distance = np.sqrt((0.3**2) + ((4 / 15) ** 2))
    np.testing.assert_allclose(to_positive, [0, expected_distance, expected_distance / 2])
    np.testing.assert_allclose(to_negative, [expected_distance, 0, expected_distance / 2])
    np.testing.assert_allclose(
        calculate_closeness_coefficients(to_positive, to_negative),
        [1.0, 0.0, 0.5],
    )


def test_criteria_alternative_and_profile_ids_drive_ordered_assignments():
    result = _run(_two_category_problem())
    assert result["category_order_semantics"] == "lower-order-is-less-preferred"
    assert result["assignments"] == [
        {"alternative_id": "a-best", "category_id": "high"},
        {"alternative_id": "a-worst", "category_id": "low"},
    ]
    assert result["diagnostics"]["article_class_by_category_id"] == {
        "low": "C2",
        "high": "C1",
    }
    assert "ranked_alternatives" not in result
    assert "rankedAlternatives" not in result


def test_article_2016_tehran_tables_1_to_5_reproduce():
    result = run_topsis_sort_2016(
        alternatives=TEHRAN_ALTERNATIVES,
        criteria=TEHRAN_CRITERIA,
        profiles=TEHRAN_PROFILES,
        categories=TEHRAN_CATEGORIES,
    )
    diagnostics = result["diagnostics"]

    # Table 1: benefit/cost directions, equal weights, four q-1 boundaries.
    assert [criterion["direction"] for criterion in TEHRAN_CRITERIA] == [
        "benefit", "benefit", "benefit", "benefit", "cost"
    ]
    assert [criterion["weight"] for criterion in TEHRAN_CRITERIA] == [0.2] * 5
    assert len(TEHRAN_PROFILES) == len(TEHRAN_CATEGORIES) - 1 == 4

    # Tables 2 and 3: all 22 alternatives and four profiles are evaluated.
    assert len(TEHRAN_ALTERNATIVES) == 22
    assert diagnostics["normalization_maxima_by_criterion_id"] == {
        "g1": 48.0,
        "g2": 91.3,
        "g3": 67.1,
        "g4": 90.71,
        "g5": 916.67,
    }
    assert set(diagnostics["weighted_values_by_alternative_id"]) == {
        f"district-{index:02d}" for index in range(1, 23)
    }
    assert set(diagnostics["weighted_values_by_profile_id"]) == {"p1", "p2", "p3", "p4"}

    # Table 3 prints the cost column without Eq. (7)'s reflection. Undo that
    # affine reflection before comparing the publication's rounded values.
    for item_id, expected in PUBLISHED_TABLE_3_DIRECT_WEIGHTED.items():
        weighted = _entity_value(diagnostics, "weighted_values", item_id)
        displayed_coordinates = [weighted[key] for key in CRITERION_IDS[:4]]
        displayed_coordinates.append(0.2 - weighted["g5"])
        np.testing.assert_allclose(displayed_coordinates, expected, rtol=0, atol=5.01e-5)

    positive_ideal = diagnostics["positive_ideal_by_criterion_id"]
    negative_ideal = diagnostics["negative_ideal_by_criterion_id"]
    ideal_in_table_coordinates = [positive_ideal[key] for key in CRITERION_IDS[:4]]
    ideal_in_table_coordinates.append(0.2 - positive_ideal["g5"])
    anti_in_table_coordinates = [negative_ideal[key] for key in CRITERION_IDS[:4]]
    anti_in_table_coordinates.append(0.2 - negative_ideal["g5"])
    np.testing.assert_allclose(
        ideal_in_table_coordinates, PUBLISHED_TABLE_3_IDEAL_DIRECT, rtol=0, atol=5.01e-5
    )
    np.testing.assert_allclose(
        anti_in_table_coordinates, PUBLISHED_TABLE_3_ANTI_IDEAL_DIRECT, rtol=0, atol=5.01e-5
    )

    # Table 4: compare the published distances and closeness values. The table
    # uses rounded Table 3 values, so its last digits need not equal full-input
    # calculations. The largest observed deviations are below 0.00005 for D+/D-
    # and 0.00009 for closeness.
    for item_id, expected in PUBLISHED_TABLE_4_DISTANCES.items():
        actual_distances = _entity_value(diagnostics, "distances", item_id)
        actual = (
            actual_distances["to_positive_ideal"],
            actual_distances["to_negative_ideal"],
            _entity_value(diagnostics, "closeness", item_id),
        )
        np.testing.assert_allclose(actual[:2], expected[:2], rtol=0, atol=5.01e-5)
        np.testing.assert_allclose(actual[2], expected[2], rtol=0, atol=9.0e-5)

    # Table 5 is exact at the class level. Article C1 is best, while the
    # application contract's highest order represents that same class.
    actual_article_classes = tuple(
        int(diagnostics["article_class_by_category_id"][item["category_id"]][1:])
        for item in result["assignments"]
    )
    assert actual_article_classes == PUBLISHED_TABLE_5_CLASS_BY_DISTRICT
    assert [item["alternative_id"] for item in result["assignments"]] == [
        f"district-{index:02d}" for index in range(1, 23)
    ]


def test_eq7_cost_reflection_and_table_coordinates_have_identical_distances():
    result = run_topsis_sort_2016(
        alternatives=TEHRAN_ALTERNATIVES,
        criteria=TEHRAN_CRITERIA,
        profiles=TEHRAN_PROFILES,
        categories=TEHRAN_CATEGORIES,
    )
    diagnostics = result["diagnostics"]
    # Independent direct-ratio form: retain min-cost ideal, as in Table 3.
    all_rows = TEHRAN_ALTERNATIVES + [
        {
            "alternative_id": profile["profile_id"],
            "values_by_criterion_id": profile["values_by_criterion_id"],
        }
        for profile in TEHRAN_PROFILES
    ]
    raw = np.array(
        [
            [row["values_by_criterion_id"][criterion_id] for criterion_id in CRITERION_IDS]
            for row in all_rows
        ],
        dtype=float,
    )
    direct = raw / raw.max(axis=0) * 0.2
    direct_ideal = np.array([direct[:, index].max() for index in range(4)] + [direct[:, 4].min()])
    direct_anti = np.array([direct[:, index].min() for index in range(4)] + [direct[:, 4].max()])
    direct_d_plus = np.linalg.norm(direct - direct_ideal, axis=1)
    direct_d_minus = np.linalg.norm(direct - direct_anti, axis=1)
    direct_closeness = direct_d_minus / (direct_d_plus + direct_d_minus)

    for index, row in enumerate(all_rows):
        item_id = row.get("alternative_id", row.get("profile_id"))
        actual_distances = _entity_value(diagnostics, "distances", item_id)
        np.testing.assert_allclose(
            actual_distances["to_positive_ideal"], direct_d_plus[index], rtol=0, atol=1e-14
        )
        np.testing.assert_allclose(
            actual_distances["to_negative_ideal"], direct_d_minus[index], rtol=0, atol=1e-14
        )
        np.testing.assert_allclose(
            _entity_value(diagnostics, "closeness", item_id),
            direct_closeness[index],
            rtol=0,
            atol=1e-14,
        )


def test_exact_equality_with_a_profile_returns_controlled_error():
    problem = _two_category_problem()
    problem["alternatives"].append(
        {
            "alternative_id": "on-boundary",
            "values_by_criterion_id": {"growth": 3, "cost": 4},
        }
    )
    with pytest.raises(
        ProfileBoundaryTieError,
        match=r"Eq\. \(8\) uses strict inequalities",
    ):
        _run(problem)


def test_multiple_alternatives_and_empty_categories_are_preserved():
    problem = {
        "criteria": [{"criterion_id": "score", "direction": "benefit", "weight": 1.0}],
        "categories": [
            {"category_id": "low", "label": "Low", "order": 0},
            {"category_id": "middle", "label": "Middle", "order": 1},
            {"category_id": "high", "label": "High", "order": 2},
        ],
        "profiles": [
            {
                "profile_id": "b-low-mid",
                "category_id": "middle",
                "values_by_criterion_id": {"score": 3},
            },
            {
                "profile_id": "b-mid-high",
                "category_id": "high",
                "values_by_criterion_id": {"score": 7},
            },
        ],
        "alternatives": [
            {"alternative_id": "a1", "values_by_criterion_id": {"score": 1}},
            {"alternative_id": "a2", "values_by_criterion_id": {"score": 2}},
        ],
    }
    result = _run(problem)
    assert result["assignments"] == [
        {"alternative_id": "a1", "category_id": "low"},
        {"alternative_id": "a2", "category_id": "low"},
    ]
    assert [category["category_id"] for category in result["categories"]] == [
        "low", "middle", "high"
    ]


def test_profiles_must_be_distinct_and_follow_criterion_preference():
    problem = {
        "criteria": [{"criterion_id": "score", "direction": "benefit", "weight": 1.0}],
        "categories": [
            {"category_id": "low", "label": "Low", "order": 0},
            {"category_id": "middle", "label": "Middle", "order": 1},
            {"category_id": "high", "label": "High", "order": 2},
        ],
        "profiles": [
            {"profile_id": "p1", "category_id": "middle", "values_by_criterion_id": {"score": 4}},
            {"profile_id": "p2", "category_id": "high", "values_by_criterion_id": {"score": 4}},
        ],
        "alternatives": [{"alternative_id": "a", "values_by_criterion_id": {"score": 2}}],
    }
    with pytest.raises(TopsisSort2016Error, match="must differ on at least one criterion"):
        _run(problem)

    problem["profiles"][1]["values_by_criterion_id"]["score"] = 3
    with pytest.raises(TopsisSort2016Error, match="violate preference order"):
        _run(problem)

    problem["profiles"][1]["profile_id"] = "p1"
    with pytest.raises(TopsisSort2016Error, match="profiles IDs must be unique"):
        _run(problem)


def test_numeric_domains_and_identifiers_are_validated():
    problem = _two_category_problem()
    problem["criteria"][0].update(minimum=0, maximum=3)
    with pytest.raises(TopsisSort2016Error, match="numeric domain"):
        _run(problem)

    problem = _two_category_problem()
    problem["alternatives"].append(deepcopy(problem["alternatives"][0]))
    with pytest.raises(TopsisSort2016Error, match="alternatives IDs must be unique"):
        _run(problem)

    problem = _two_category_problem()
    problem["criteria"].append(dict(problem["criteria"][0]))
    with pytest.raises(TopsisSort2016Error, match="criterion IDs must be unique"):
        _run(problem)

    problem = _two_category_problem()
    problem["alternatives"][0]["values_by_criterion_id"]["cost"] = None
    with pytest.raises(TopsisSort2016Error, match="finite numeric value"):
        _run(problem)


def test_weights_profiles_and_category_order_reject_invalid_contracts():
    problem = _two_category_problem()
    problem["criteria"][0]["weight"] = 0.7
    with pytest.raises(TopsisSort2016Error, match="weights must sum to 1"):
        _run(problem)

    problem = _two_category_problem()
    problem["profiles"][0]["category_id"] = "missing-category"
    with pytest.raises(TopsisSort2016Error, match="each profile category_id"):
        _run(problem)

    problem = _two_category_problem()
    problem["categories"][1]["order"] = 2
    with pytest.raises(TopsisSort2016Error, match="consecutive integers"):
        _run(problem)


def test_positive_and_negative_values_work_when_eq7_has_positive_maxima():
    normalized, maxima = normalize_eq7(
        [[-2, -3], [4, 2]],
        ["benefit", "cost"],
    )
    np.testing.assert_allclose(maxima, [4, 2])
    np.testing.assert_allclose(normalized, [[-0.5, 2.5], [1.0, 0.0]])


def test_eq7_rejects_zero_or_negative_maximum_without_inventing_a_scale():
    with pytest.raises(UndefinedNormalizationError, match="positive maximum"):
        normalize_eq7([[0, 2], [0, 4]], ["benefit", "cost"])
    with pytest.raises(UndefinedNormalizationError, match="positive maximum"):
        normalize_eq7([[-4], [-1]], ["benefit"])


def test_zero_closeness_denominator_is_an_explicit_error():
    with pytest.raises(UndefinedClosenessError, match="both ideal distances are zero"):
        calculate_closeness_coefficients([0.0], [0.0])


def test_result_keeps_input_alternative_order_and_category_identity():
    problem = _two_category_problem()
    problem["alternatives"].reverse()
    problem["categories"].reverse()
    result = _run(problem)
    assert [assignment["alternative_id"] for assignment in result["assignments"]] == [
        "a-worst", "a-best"
    ]
    assert result["assignments"] == [
        {"alternative_id": "a-worst", "category_id": "low"},
        {"alternative_id": "a-best", "category_id": "high"},
    ]


def test_reordering_criteria_does_not_change_id_keyed_results():
    original = _two_category_problem()
    reordered = deepcopy(original)
    reordered["criteria"].reverse()
    original_result = _run(original)
    reordered_result = _run(reordered)
    assert reordered_result["assignments"] == original_result["assignments"]
    assert reordered_result["diagnostics"]["positive_ideal_by_criterion_id"] == pytest.approx(
        original_result["diagnostics"]["positive_ideal_by_criterion_id"]
    )


def test_alternative_and_profile_ids_use_separate_diagnostic_namespaces():
    problem = {
        "criteria": [{"criterion_id": "score", "direction": "benefit", "weight": 1.0}],
        "categories": [
            {"category_id": "low", "label": "Low", "order": 0},
            {"category_id": "high", "label": "High", "order": 1},
        ],
        "profiles": [
            {
                "profile_id": "shared-id",
                "category_id": "high",
                "values_by_criterion_id": {"score": 4},
            }
        ],
        "alternatives": [
            {"alternative_id": "shared-id", "values_by_criterion_id": {"score": 2}}
        ],
    }
    result = _run(problem)
    diagnostics = result["diagnostics"]
    assert set(diagnostics["closeness_by_alternative_id"]) == {"shared-id"}
    assert set(diagnostics["closeness_by_profile_id"]) == {"shared-id"}
    assert diagnostics["closeness_by_alternative_id"]["shared-id"] == 0.0
    assert diagnostics["closeness_by_profile_id"]["shared-id"] == 1.0
