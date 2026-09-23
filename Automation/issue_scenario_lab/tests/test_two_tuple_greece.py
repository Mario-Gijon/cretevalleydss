import pytest

from issue_scenario_lab.errors import ScenarioLabError
from issue_scenario_lab.scenarios.two_tuple_greece import _matrix, _source_level, _tree, _validate_main_model, load_fixture

DOMAIN = {
    "definition": {
        "labels": [
            {"key": "level-1", "label": "Very Low"},
            {"key": "level-2", "label": "Low"},
            {"key": "level-3", "label": "Medium"},
            {"key": "level-4", "label": "High"},
            {"key": "level-5", "label": "Very High"},
        ]
    }
}


def _matrix_inputs(data):
    leaves = [child for parent in data["parents"] for child in parent["children"]]
    return {
        "context": {"leafCriteria": [{"expressionDomain": DOMAIN} for _ in leaves]},
        "alternatives": {alternative["name"]: alternative["key"] for alternative in data["alternatives"]},
        "criteria": {child["key"]: child["key"] for child in leaves},
    }


def _submitted_level(cell):
    return int(cell["labelKey"].removeprefix("level-"))


def test_greece_tree_persists_c6_as_an_all_cost_branch():
    data = load_fixture()
    tree = _tree(data)

    assert len(tree) == 7
    assert [parent["type"] for parent in tree if parent["id"] != "criterion-c6"] == ["benefit"] * 6
    c6 = next(parent for parent in tree if parent["id"] == "criterion-c6")
    assert c6["type"] == "cost"
    assert [child["type"] for child in c6["children"]] == ["cost"] * 4
    assert all(
        child["type"] == "benefit"
        for parent in tree
        if parent["id"] != "criterion-c6"
        for child in parent["children"]
    )


def test_greece_matrix_preserves_cost_sources_and_inverts_only_long_term_potential():
    data = load_fixture()
    inputs = _matrix_inputs(data)
    matrix = _matrix(data, **inputs)
    leaves = [child for parent in data["parents"] for child in parent["children"]]
    index_by_key = {child["key"]: index for index, child in enumerate(leaves)}

    assert len(matrix) == 5
    assert all(len(row) == 18 for row in matrix.values())
    for alternative in data["alternatives"]:
        source = data["sourceValues"][alternative["key"]]
        submitted = matrix[alternative["key"]]
        for key in ("c6_land_rent", "c6_installation_cost", "c6_maintenance_cost"):
            assert _submitted_level(submitted[key]) == source[index_by_key[key]]
        long_term_raw = source[index_by_key["c6_long_term_potential"]]
        assert _submitted_level(submitted["c6_long_term_potential"]) == 6 - long_term_raw
        clustering_raw = source[index_by_key["c3_clustering_possible"]]
        assert _submitted_level(submitted["c3_clustering_possible"]) == {"Yes": 5, "Unsure": 3, "No": 1}[clustering_raw]


@pytest.mark.parametrize("raw, expected", [(1, 5), (2, 4), (3, 3), (4, 2), (5, 1)])
def test_long_term_potential_uses_the_symmetric_five_label_inversion(raw, expected):
    assert _source_level("c6_long_term_potential", raw) == expected


@pytest.mark.parametrize("raw", [1, 2, 3, 4, 5])
def test_true_c6_cost_sources_are_not_inverted(raw):
    for criterion_key in ("c6_land_rent", "c6_installation_cost", "c6_maintenance_cost"):
        assert _source_level(criterion_key, raw) == raw


@pytest.mark.parametrize("raw, expected", [("Yes", 5), ("Unsure", 3), ("No", 1)])
def test_clustering_source_conversion_is_unchanged(raw, expected):
    assert _source_level("c3_clustering_possible", raw) == expected


def test_greece_requires_the_two_tuple_model_to_expose_criterion_types():
    model = {
        "apiModelKey": "two_tuple",
        "modelKind": "issue",
        "implementationStatus": "ready",
        "publicUsable": True,
        "evaluationStructureKey": "alternativeCriteriaMatrix",
        "requiresHomogeneousExpressionDomains": True,
        "usesCriterionTypes": True,
        "usesCriteriaWeights": True,
        "usesExpertWeights": True,
        "parameters": [
            {"key": "expertAggregation", "restrictions": {"methods": [{"key": "arithmetic_mean"}]}},
            {"key": "criteriaAggregation", "restrictions": {"methods": [{"key": "weighted_average"}]}},
        ],
    }

    _validate_main_model(model)
    model["usesCriterionTypes"] = False
    with pytest.raises(ScenarioLabError, match="usesCriterionTypes"):
        _validate_main_model(model)
