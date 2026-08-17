from copy import deepcopy

import pytest

from issue_scenario_lab.errors import ScenarioLabError
from issue_scenario_lab.scenarios.topsis_2tuple_greece import build_linguistic_matrix, load_fixture, removal_aliases, resolve_linguistic_label_keys, validate_fixture


EXPECTED_RANKINGS = {
    "expert_a": ["c5", "c6", "c4", "c7", "c1", "c2", "c3"],
    "expert_b": ["c5", "c4", "c2", "c7", "c1", "c3", "c6"],
    "expert_c": ["c2", "c1", "c5", "c4", "c6", "c7", "c3"],
    "expert_d": ["c1", "c5", "c4", "c7", "c6", "c3", "c2"],
    "expert_e": ["c6", "c5", "c3", "c7", "c4", "c2", "c1"],
}
DOMAIN = {"definition": {"labels": [
    {"key": "low", "label": "Very low", "index": 0},
    {"key": "medium", "label": "low", "index": 1},
    {"key": "high", "label": "Medium", "index": 2},
    {"key": "label_4", "label": "High", "index": 3},
    {"key": "label_5", "label": "Very high", "index": 4},
]}}


def context():
    return {"leafCriteria": [{"expressionDomain": DOMAIN} for _ in range(7)]}


def test_greece_fixture_preserves_real_questionnaire_criteria_rankings_and_sites():
    data = load_fixture()
    assert [criterion["key"] for criterion in data["criteria"]] == ["c1", "c2", "c3", "c4", "c5", "c6", "c7"]
    assert data["participants"]["criteriaWeightingExperts"] == list(EXPECTED_RANKINGS)
    assert data["participants"]["questionnaireByAlias"] == {"expert_a": 1, "expert_b": 2, "expert_c": 4, "expert_d": 5, "expert_e": 6}
    assert 3 not in data["participants"]["questionnaireByAlias"].values()
    assert data["participants"]["remainingExpert"] == "expert_a"
    assert data["criteriaWeighting"]["rankings"] == EXPECTED_RANKINGS
    assert removal_aliases(data) == ["expert_b", "expert_c", "expert_d", "expert_e"]
    assert [alternative["key"] for alternative in data["alternatives"]] == ["saint_george", "plati", "kaminaki", "tzermiado"]
    assert all(set(row) == {"c1", "c2", "c3", "c4", "c5", "c6", "c7"} for row in data["alternativeEvaluation"]["evaluations"].values())
    assert all("labelKey" not in value and value["label"] in {"Very low", "Low", "Medium", "High", "Very high"} for row in data["alternativeEvaluation"]["evaluations"].values() for value in row.values())


def test_real_domain_labels_resolve_to_the_exact_backend_label_key_payload():
    data = load_fixture()
    assert resolve_linguistic_label_keys(context()) == {"Very low": "low", "Low": "medium", "Medium": "high", "High": "label_4", "Very high": "label_5"}
    criteria = {criterion["name"]: criterion["key"] for criterion in data["criteria"]}
    alternatives = {alternative["name"]: alternative["key"] for alternative in data["alternatives"]}
    matrix = build_linguistic_matrix(data, criteria=criteria, alternatives=alternatives, context=context())
    assert matrix["saint_george"]["c1"] == {"labelKey": "high", "alpha": 0.1}
    assert len(matrix) == 4 and all(len(row) == 7 for row in matrix.values())
    assert matrix["tzermiado"]["c7"]["alpha"] == data["alternativeEvaluation"]["evaluations"]["tzermiado"]["c7"]["alpha"]


def test_unknown_or_missing_configured_semantic_labels_fail_clearly():
    unknown = deepcopy(context())
    unknown["leafCriteria"][0]["expressionDomain"]["definition"]["labels"][0]["label"] = "Unknown"
    with pytest.raises(ScenarioLabError, match="missing or duplicate semantic labels"):
        resolve_linguistic_label_keys(unknown)
    missing = deepcopy(context())
    missing["leafCriteria"][0]["expressionDomain"]["definition"]["labels"].pop()
    with pytest.raises(ScenarioLabError, match="exactly five labels"):
        resolve_linguistic_label_keys(missing)


@pytest.mark.parametrize("mutate", [
    lambda data: data["participants"].update({"remainingExpert": "unknown"}),
    lambda data: data["criteriaWeighting"]["rankings"].__setitem__("expert_a", ["c1"] * 7),
    lambda data: data["alternativeEvaluation"]["evaluations"]["saint_george"].pop("c7"),
])
def test_greece_fixture_rejects_invalid_remaining_expert_rankings_and_matrix(mutate):
    data = deepcopy(load_fixture())
    mutate(data)
    with pytest.raises(ScenarioLabError):
        validate_fixture(data)
