from copy import deepcopy

import pytest

from issue_scenario_lab.api.issues import IssuesApi
from issue_scenario_lab.errors import ScenarioLabError
from issue_scenario_lab.scenarios.topsis_2tuple_greece import load_fixture, removal_aliases, validate_fixture


def test_greece_fixture_loads_with_five_distinct_weighting_experts_and_complete_data():
    data = load_fixture()
    assert data["participants"]["criteriaWeightingExperts"] == ["expert1", "expert2", "expert3", "expert4", "expert5"]
    assert data["participants"]["remainingExpert"] == "expert1"
    assert set(data["criteriaWeighting"]["rankings"]) == set(data["participants"]["criteriaWeightingExperts"])
    assert removal_aliases(data) == ["expert2", "expert3", "expert4", "expert5"]


@pytest.mark.parametrize("mutate", [
    lambda data: data["participants"].update({"remainingExpert": "unknown"}),
    lambda data: data["criteriaWeighting"]["rankings"].__setitem__("expert1", ["accessibility", "accessibility", "cost", "resilience"]),
    lambda data: data["alternativeEvaluation"]["evaluations"]["crete"].pop("cost"),
])
def test_greece_fixture_rejects_invalid_remaining_expert_rankings_and_matrix(mutate):
    data = deepcopy(load_fixture())
    mutate(data)
    with pytest.raises(ScenarioLabError):
        validate_fixture(data)


def test_participant_removal_uses_the_real_frontend_owner_request_contract():
    calls = []

    class Client:
        def request(self, method, path, *, json):
            calls.append((method, path, json))
            return {"success": True}

    IssuesApi(Client()).edit_experts("issue-1", experts_to_add=[], experts_to_remove=["expert2@example.test", "expert3@example.test", "expert4@example.test", "expert5@example.test"])
    assert calls == [("PATCH", "/issues/issue-1/experts", {"expertsToAdd": [], "expertsToRemove": ["expert2@example.test", "expert3@example.test", "expert4@example.test", "expert5@example.test"]})]
