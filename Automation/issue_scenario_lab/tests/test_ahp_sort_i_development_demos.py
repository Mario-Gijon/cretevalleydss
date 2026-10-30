from __future__ import annotations

import base64
import json
from copy import deepcopy

import pytest

from issue_scenario_lab.errors import ScenarioLabError
from issue_scenario_lab.manifest.store import ManifestStore
from issue_scenario_lab.scenarios import ahp_sort_i_development_demos as scenario
from issue_scenario_lab.scenarios import ahp_sort_i_sustainable_multicriteria_v3 as multicriteria_v3

FIXTURE = scenario.load_fixture()


def test_fixtures_preserve_published_supplier_inputs_and_expected_assignments() -> None:
    supplier = FIXTURE["supplierPrequalification"]
    assert supplier["criterionPairwiseJudgments"] == [7, 4, 7, 8, 0.25, 1, 3, 4, 5, 3]
    assert supplier["alternatives"] == [f"Supplier {letter}" for letter in "ABCDEFGHIJKL"]
    assert supplier["expectedAssignments"] == {
        **{f"Supplier {letter}": "Accepted" for letter in "ABCDEFG"},
        **{f"Supplier {letter}": "Rejected" for letter in "HIJKL"},
    }
    assert supplier["alternativeToProfileByAlternative"]["Supplier J"] == [1 / 9, 1 / 9, 1, 1, 1]
    assert sum(supplier["expectedAHPWeights"]) == pytest.approx(1)


def test_sustainable_fixture_is_explicitly_synthetic_and_freezes_each_vote() -> None:
    sustainable = FIXTURE["sustainableDevelopment"]
    assert "synthetic" in sustainable["description"].casefold()
    assert len(sustainable["criteria"]) == 6
    assert all(len(criterion["name"]) <= 60 for criterion in sustainable["criteria"])
    assert len(sustainable["expertPairwiseOverrides"]) == 3
    assert sustainable["categoryVotesByAlternative"]["Croatia"] == ["Bad", "Moderate", "Good"]
    assert sustainable["expectedVotes"]["Croatia"] == {
        "status": "tied_plurality",
        "categoryCounts": [1, 1, 1],
    }
    assert sum(sustainable["expectedMCCWeights"]) == pytest.approx(1)


def test_supplier_uses_creator_side_real_ahp_comparisons_not_precomputed_weights() -> None:
    supplier = FIXTURE["supplierPrequalification"]
    config = scenario._criterion_pairwise_weights_payload(supplier, "weighting-id", group=False)
    assert config["mode"] == "creatorApiModel"
    assert config["criteriaWeightingModelKey"] == "ahp_criteria_weights"
    assert len(config["payload"]["comparisons"]) == 10
    assert [item["value"] for item in config["payload"]["comparisons"]] == supplier["criterionPairwiseJudgments"]
    assert "weightsByCriterion" not in config["payload"]


def test_group_uses_three_individual_ahp_matrices_then_ahp_sort_group_votes() -> None:
    sustainable = FIXTURE["sustainableDevelopment"]
    config = scenario._criterion_pairwise_weights_payload(sustainable, "weighting-id", group=True)
    assert config["mode"] == "expertApiModel"
    assert config["source"] == "experts"
    assert config["payload"] == {}
    for _alias, overrides in sustainable["expertPairwiseOverrides"].items():
        comparisons = scenario._saaty_comparisons(
            [{"id": item["key"]} for item in sustainable["criteria"]],
            overrides=overrides,
        )
        assert len(comparisons) == 15
        assert [item["value"] for item in comparisons].count(1) == 14
        assert comparisons[[item["value"] for item in comparisons].index(overrides[0]["value"])]["value"] == overrides[0]["value"]
        assert scenario._same_saaty_payload({"comparisons": comparisons}, comparisons)
        altered = [*comparisons]
        altered[0] = {**altered[0], "value": 2}
        assert not scenario._same_saaty_payload({"comparisons": comparisons}, altered)
    payload = scenario._issue_payload(
        fixture=sustainable,
        model_id="ahpsort-id",
        weighting_model_id="ahp-weight-id",
        expert_emails=["a@example.test", "b@example.test", "c@example.test"],
        domain_id="numeric-domain",
        group=True,
    )
    assert payload["isConsensus"] is False
    assert payload["simulateConsensus"] is False
    assert payload["paramValues"]["ahpSortGroup"] == {"tiePolicy": "optimistic"}
    assert payload["criteriaWeightingConfig"]["mode"] == "expertApiModel"


def test_group_alternative_payload_contains_complete_matrix_and_profile_order() -> None:
    sustainable = FIXTURE["sustainableDevelopment"]
    alternatives = [{"id": f"alternative-{name}", "name": name} for name in sustainable["alternatives"]]
    criteria = [{"id": f"criterion-{item['key']}", "name": item["name"]} for item in sustainable["criteria"]]
    profiles = {
        "mode": "limiting",
        "profiles": deepcopy(sustainable["profiles"]),
    }
    payload = scenario._alternative_evaluation_payload(
        context={"modelParameters": {"ahpSortProfiles": profiles}},
        alternatives=alternatives,
        criteria=criteria,
        fixture=sustainable,
        expert_alias="expert_b",
        group=True,
    )
    assert len(payload["alternativeProfileComparisons"]) == 5 * 6 * 2
    assert len(payload["profileComparisons"]) == 6
    uk_bad = next(
        row for row in payload["alternativeProfileComparisons"]
        if row["alternativeId"] == "alternative-United Kingdom"
        and row["criterionId"] == "criterion-poverty"
        and row["profileId"] == "bad-moderate-boundary"
    )
    assert uk_bad["alternativeToProfile"] == 1
    assert payload["profileComparisons"][0]["firstToSecond"] == 1 / 3


def test_supplier_alternative_payload_contains_exactly_sixty_original_judgments() -> None:
    supplier = FIXTURE["supplierPrequalification"]
    alternatives = [{"id": f"alternative-{name}", "name": name} for name in supplier["alternatives"]]
    criteria = [{"id": f"criterion-{item['key']}", "name": item["name"]} for item in supplier["criteria"]]
    payload = scenario._alternative_evaluation_payload(
        context={"modelParameters": {"ahpSortProfiles": {"mode": "limiting", "profiles": deepcopy(supplier["profiles"])} }},
        alternatives=alternatives,
        criteria=criteria,
        fixture=supplier,
        expert_alias=None,
        group=False,
    )
    assert len(payload["alternativeProfileComparisons"]) == 12 * 5
    assert payload["profileComparisons"] == []
    j_flexibility = next(
        item for item in payload["alternativeProfileComparisons"]
        if item["alternativeId"] == "alternative-Supplier J" and item["criterionId"] == "criterion-flexibility"
    )
    assert j_flexibility["alternativeToProfile"] == 1 / 9


def test_manifest_recording_is_idempotent_for_the_same_finished_issue(tmp_path) -> None:
    store = ManifestStore(tmp_path / "manifest.json")
    first = scenario._ensure_manifest_entry(
        store,
        issue_id="finished-id",
        issue_name=scenario.SUPPLIER_ISSUE_NAME,
        aliases=("owner", "expert_a"),
    )
    second = scenario._ensure_manifest_entry(
        store,
        issue_id="finished-id",
        issue_name=scenario.SUPPLIER_ISSUE_NAME,
        aliases=("owner", "expert_a"),
    )
    assert second == first
    assert len(store.list_entries()) == 1


def test_model_preflight_requires_a_unique_authorized_ahpsort_plugin() -> None:
    response = {
        "models": [{
            "id": "ahpsort-id",
            "apiModelKey": "ahp_sort_i",
            "modelKind": "issue",
            "implementationStatus": "ready",
            "publicUsable": True,
            "issueExecutionAuthorized": True,
            "visibleInIssueCreation": True,
            "resultStructureKey": "sorting",
            "resultStructureVersion": 1,
            "evaluationStructureKey": "ahpSortAlternativeProfiles",
            "supportsConsensus": False,
            "supportsConsensusSimulation": False,
            "usesCriteriaWeights": True,
            "supportedExpressionDomains": [
                {
                    "typeKey": "numericSaaty",
                    "constraints": {"scale": "saaty-fundamental-1-9"},
                }
            ],
        }],
        "criteriaWeightingModels": [{
            "id": "weighting-id",
            "apiModelKey": "ahp_criteria_weights",
            "implementationStatus": "ready",
            "supportsCreatorCriteriaWeighting": True,
            "supportsExpertCriteriaWeighting": True,
            "evaluationStructureKey": "criteriaPairwiseAHP",
        }],
    }
    assert scenario._compatible_models(response)[0]["id"] == "ahpsort-id"
    with pytest.raises(ScenarioLabError, match="issueExecutionAuthorized"):
        scenario._compatible_models({**response, "models": [{**response["models"][0], "issueExecutionAuthorized": False}]})


def test_domain_selection_requires_the_single_global_saaty_scale() -> None:
    model = {
        "supportedExpressionDomains": [
            {
                "typeKey": "numericSaaty",
                "constraints": {"scale": "saaty-fundamental-1-9"},
            }
        ]
    }
    domains = {
        "globals": [
            {
                "id": "zero-one",
                "name": "Continuous 0-1",
                "typeKey": "numericContinuous",
                "definition": {"min": 0, "max": 1},
            },
            {
                "id": "ahp-saaty",
                "name": "AHP Saaty Scale",
                "typeKey": "numericSaaty",
                "definition": {"scale": "saaty-fundamental-1-9"},
            },
        ],
        "userDomains": [
            {
                "id": "private-saaty",
                "name": "AHP Saaty Scale copy",
                "typeKey": "numericSaaty",
                "definition": {"scale": "saaty-fundamental-1-9"},
            },
        ],
    }

    assert scenario._select_existing_saaty_domain(domains, model)["id"] == "ahp-saaty"

    with pytest.raises(ScenarioLabError, match="exactly one global AHP Saaty Scale"):
        scenario._select_existing_saaty_domain(
            {"globals": [domains["globals"][0]], "userDomains": []},
            model,
        )


def test_authenticated_user_id_comes_from_existing_session_token() -> None:
    payload = base64.urlsafe_b64encode(json.dumps({"uid": "expert-object-id"}).encode()).decode().rstrip("=")
    assert scenario._user_id_from_token(f"header.{payload}.signature") == "expert-object-id"

    with pytest.raises(ScenarioLabError, match="stable ID"):
        scenario._user_id_from_token("header.e30.signature")


def test_evaluation_context_projects_leaf_criteria_and_alternatives() -> None:
    leaf_criteria = [{"id": f"criterion-{index}", "name": f"Criterion {index}", "isLeaf": True} for index in range(5)]
    response = {
        "stage": "criteriaWeighting",
        "consensusPhase": 0,
        "decisionContext": {
            "issue": {"id": "issue-id", "currentStage": "criteriaWeighting", "isConsensus": False},
            "criteriaWeightingCriteria": [{"id": "root", "name": "Supplier", "isLeaf": False}, *leaf_criteria],
            "alternatives": [{"id": "alternative-id", "name": "Supplier A"}],
        },
    }

    _, criteria, alternatives = scenario._resolve_context_entities(response, "criteriaWeighting", "issue-id")

    assert criteria == leaf_criteria
    assert alternatives == [{"id": "alternative-id", "name": "Supplier A"}]


def test_multicriteria_v3_fixture_has_explicit_synthetic_judgments_for_each_expert_and_criterion() -> None:
    fixture = multicriteria_v3.load_fixture()
    assert fixture["issueName"] == "DEMO — GAHPSort — Sustainable Development — Multicriteria V3"
    assert "synthetic" in fixture["description"].casefold()
    assert "not empirical" in fixture["description"].casefold()
    assert "categoryVotesByAlternative" not in fixture
    assert set(fixture["alternativeToProfileByExpert"]) == {"expert_a", "expert_b", "expert_c"}

    expected_scale = {1 / 9, 1 / 8, 1 / 7, 1 / 6, 1 / 5, 1 / 4, 1 / 3, 1 / 2, 1, 2, 3, 4, 5, 6, 7, 8, 9}
    values_used = set(fixture["profileComparisonsByCriterion"].values())
    for expert in fixture["alternativeToProfileByExpert"].values():
        assert set(expert) == set(fixture["alternatives"])
        for by_criterion in expert.values():
            assert set(by_criterion) == {criterion["key"] for criterion in fixture["criteria"]}
            for by_profile in by_criterion.values():
                assert set(by_profile) == {profile["profileId"] for profile in fixture["profiles"]}
                values_used.update(by_profile.values())
    for overrides in fixture["expertPairwiseOverrides"].values():
        values_used.update(item["value"] for item in overrides)
    assert values_used == expected_scale

    assert fixture["profileComparisonsByCriterion"] == {
        "poverty": 1 / 3,
        "obesity": 1 / 4,
        "life_expectancy": 1 / 2,
        "neet": 1 / 3,
        "gender_gap": 1 / 4,
        "homicide": 1 / 2,
    }
    assert fixture["expectedVotes"]["Spain"] == {"status": "unanimous", "categoryCounts": [3, 0, 0]}
    assert fixture["expectedVotes"]["United Kingdom"] == {"status": "tied_plurality", "categoryCounts": [1, 1, 1]}
    assert fixture["expectedVotes"]["Croatia"] == {"status": "unanimous", "categoryCounts": [0, 0, 3]}
    assert fixture["expectedVotes"]["Norway"] == {"status": "unique_plurality", "categoryCounts": [0, 2, 1]}
    assert fixture["expectedAssignments"]["United Kingdom"] == "Good"


def test_multicriteria_v3_builds_id_scoped_matrices_independently_by_expert_and_criterion() -> None:
    fixture = multicriteria_v3.load_fixture()
    alternatives = [{"id": f"alt-{name}", "name": name} for name in fixture["alternatives"]]
    criteria = [{"id": f"crit-{item['key']}", "name": item["name"]} for item in fixture["criteria"]]
    profiles = {"mode": "limiting", "profiles": deepcopy(fixture["profiles"])}
    payload_a = scenario._alternative_evaluation_payload(
        context={"modelParameters": {"ahpSortProfiles": profiles}},
        alternatives=alternatives,
        criteria=criteria,
        fixture=fixture,
        expert_alias="expert_a",
        group=True,
    )
    payload_b = scenario._alternative_evaluation_payload(
        context={"modelParameters": {"ahpSortProfiles": profiles}},
        alternatives=alternatives,
        criteria=criteria,
        fixture=fixture,
        expert_alias="expert_b",
        group=True,
    )
    assert len(payload_a["alternativeProfileComparisons"]) == 5 * 6 * 2
    assert len(payload_a["profileComparisons"]) == 6
    by_key_a = {
        (row["alternativeId"], row["criterionId"], row["profileId"]): row["alternativeToProfile"]
        for row in payload_a["alternativeProfileComparisons"]
    }
    by_key_b = {
        (row["alternativeId"], row["criterionId"], row["profileId"]): row["alternativeToProfile"]
        for row in payload_b["alternativeProfileComparisons"]
    }
    spain_poverty = ("alt-Spain", "crit-poverty", "bad-moderate-boundary")
    uk_obesity = ("alt-United Kingdom", "crit-obesity", "moderate-good-boundary")
    assert by_key_a[spain_poverty] == fixture["alternativeToProfileByExpert"]["expert_a"]["Spain"]["poverty"]["bad-moderate-boundary"]
    croatia_life = ("alt-Croatia", "crit-life_expectancy", "bad-moderate-boundary")
    assert by_key_a[croatia_life] != by_key_b[croatia_life]
    assert by_key_a[("alt-Spain", "crit-poverty", "bad-moderate-boundary")] != by_key_a[
        ("alt-Spain", "crit-life_expectancy", "bad-moderate-boundary")
    ]
    assert by_key_a[uk_obesity] != by_key_a[("alt-United Kingdom", "crit-life_expectancy", "moderate-good-boundary")]
    assert {row["criterionId"]: row["firstToSecond"] for row in payload_a["profileComparisons"]} == {
        f"crit-{key}": value for key, value in fixture["profileComparisonsByCriterion"].items()
    }


def test_multicriteria_v3_ahp_matrices_are_distinct_normalized_and_consistent() -> None:
    fixture = multicriteria_v3.load_fixture()
    matrices = []
    for alias, overrides in fixture["expertPairwiseOverrides"].items():
        comparisons = scenario._saaty_comparisons(
            [{"id": criterion["key"]} for criterion in fixture["criteria"]],
            overrides=overrides,
        )
        assert len(comparisons) == 15
        assert all(scenario._is_saaty(item["value"]) for item in comparisons)
        matrices.append(tuple(item["value"] for item in comparisons))
        assert sum(fixture["expectedAHPWeightsByExpert"][alias]) == pytest.approx(1)
        assert fixture["expectedConsistencyByExpert"][alias]["consistencyStatus"] == "consistent"
        assert fixture["expectedConsistencyByExpert"][alias]["consistencyRatio"] <= 0.10
    assert len(set(matrices)) == 3


def test_multicriteria_v3_manifest_uses_a_separate_versioned_scenario_id(tmp_path) -> None:
    store = ManifestStore(tmp_path / "manifest.json")
    generation_id = scenario._ensure_manifest_entry(
        store,
        issue_id="v3-finished-id",
        issue_name=multicriteria_v3.ISSUE_NAME,
        aliases=("owner", "expert_a", "expert_b", "expert_c"),
        scenario_id=multicriteria_v3.SCENARIO_ID,
    )
    entry = store.list_entries()[0]
    assert entry.generation_id == generation_id
    assert entry.scenario_id == "ahp-sort-i-sustainable-multicriteria-v3"
