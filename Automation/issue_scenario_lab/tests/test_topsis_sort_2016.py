from __future__ import annotations

from copy import deepcopy
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest
from typer.testing import CliRunner

from issue_scenario_lab import cli
from issue_scenario_lab.config import UserCredentials
from issue_scenario_lab.errors import ScenarioLabError
from issue_scenario_lab.manifest.store import ManifestStore
from issue_scenario_lab.scenarios import topsis_sort_2016 as scenario

FIXTURE = scenario.load_fixture()
MODEL = {
    "id": "model-id",
    "apiModelKey": "topsis_sort_2016",
    "modelKind": "issue",
    "implementationStatus": "ready",
    "publicUsable": True,
    "issueExecutionAuthorized": True,
    "resultStructureKey": "sorting",
    "resultStructureVersion": 1,
    "apiEndpoint": {"method": "POST", "path": "/topsis_sort_2016"},
    "visibleInIssueCreation": True,
    "manifestSync": {"isStale": False},
    "supportsConsensus": False,
    "supportsConsensusSimulation": False,
    "usesCriteriaWeights": True,
    "usesExpertWeights": False,
    "evaluationStructureKey": "alternativeCriteriaMatrix",
    "supportedExpressionDomains": [{"typeKey": "numericDiscrete"}, {"typeKey": "numericContinuous"}],
}
CRITERION_IDS = {"Quality": "mongo-quality", "Cost": "mongo-cost"}
ALTERNATIVE_IDS = {"Budget option": "mongo-budget", "Balanced option": "mongo-balanced", "Premium option": "mongo-premium"}
EXPECTED_BY_ID = {
    ALTERNATIVE_IDS["Budget option"]: "low",
    ALTERNATIVE_IDS["Balanced option"]: "medium",
    ALTERNATIVE_IDS["Premium option"]: "high",
}


class FakeClient:
    def __init__(self, alias: str, state: dict[str, Any]) -> None:
        self.alias = alias
        self.state = state

    def request(self, method: str, path: str, *, json: Any = None) -> Any:
        self.state["calls"].append((self.alias, method, path, json))
        if self.alias == "owner" and path == "/issues/models":
            return {"models": [deepcopy(self.state["model"])]}
        if self.alias == "owner" and path == "/issues/users":
            return [{"email": "expert.a@example.test"}, {"email": "expert.b@example.test"}]
        if self.alias == "owner" and path == "/issues/expression-domains":
            return {
                "globals": [{"id": "domain-id", "typeKey": "numericDiscrete", "definition": {"min": 0, "max": 10, "step": 1}}],
                "userDomains": [],
            }
        if self.alias == "owner" and path == "/issues" and method == "POST":
            self.state["name"] = json["issueInfo"]["issueName"]
            self.state["creation"] = json["issueInfo"]
            return {"id": "issue-id", "name": self.state["name"]}
        if self.alias == "owner" and path == "/issues/active":
            return {"issues": [self._active_issue()]}
        if path.endswith("/invitation-response"):
            return {}
        if path.endswith("/evaluations/alternativeEvaluation") and method == "GET":
            return self._evaluation_context()
        if path.endswith("/evaluations/alternativeEvaluation/submit"):
            self.state["submissions"].append((self.alias, deepcopy(json["payload"])))
            return {"completed": True, "currentStage": "alternativeEvaluation"}
        if path.endswith("/evaluations/alternativeEvaluation/compute"):
            return {
                "stage": "alternativeEvaluation",
                "currentStage": "finished",
                "result": deepcopy(self.state["compute_result"]),
            }
        if self.alias == "owner" and path == "/issues/finished":
            return {"issues": [{"id": "issue-id", "name": self.state["name"]}]}
        if self.alias == "owner" and path == "/issues/finished/issue-id":
            return self._finished()
        raise AssertionError(f"unexpected {self.alias} {method} {path}")

    def _active_issue(self) -> dict[str, Any]:
        fixture = self.state["fixture"]
        return {
            "id": "issue-id",
            "name": self.state["name"],
            "currentStage": "alternativeEvaluation",
            "isConsensus": False,
            "isIssueOwner": True,
            "evaluationStructureKey": "alternativeCriteriaMatrix",
            "resultStructureKey": "sorting",
            "resultStructureVersion": 1,
            "modelParameters": {
                "orderedCategories": deepcopy(fixture["orderedCategories"]),
                "boundaryProfiles": {
                    "profiles": [
                        {
                            "profileId": profile["profileId"],
                            "categoryId": profile["categoryId"],
                            "valuesByCriterionId": {
                                CRITERION_IDS["Quality"]: profile["valuesByCriterionId"]["quality"],
                                CRITERION_IDS["Cost"]: profile["valuesByCriterionId"]["cost"],
                            },
                        }
                        for profile in fixture["boundaryProfiles"]["profiles"]
                    ]
                },
            },
            "finalWeights": {"Quality": 0.6, "Cost": 0.4},
        }

    def _evaluation_context(self) -> dict[str, Any]:
        alternatives = [{"id": alternative_id, "name": name} for name, alternative_id in ALTERNATIVE_IDS.items()]
        criteria = [
            {
                "id": CRITERION_IDS[name],
                "name": name,
                "type": "benefit" if name == "Quality" else "cost",
                "expressionDomain": {"typeKey": "numericDiscrete", "definition": {"min": 0, "max": 10, "step": 1}},
            }
            for name in ("Quality", "Cost")
        ]
        return {
            "stage": "alternativeEvaluation",
            "structureKey": "alternativeCriteriaMatrix",
            "consensusPhase": 0,
            "completed": False,
            "decisionContext": {
                "issue": {"id": "issue-id", "currentStage": "alternativeEvaluation", "isConsensus": False},
                "structure": {"key": "alternativeCriteriaMatrix", "stage": "alternativeEvaluation"},
                "model": {"id": "model-id", "apiModelKey": "topsis_sort_2016"},
                "alternatives": alternatives,
                "leafCriteria": criteria,
            },
            "payload": {alternative["id"]: {criterion["id"]: "" for criterion in criteria} for alternative in alternatives},
        }

    def _finished(self) -> dict[str, Any]:
        result = deepcopy(self.state["compute_result"])
        return {
            "issue": {"id": "issue-id", "name": self.state["name"]},
            "lifecycle": {"currentStage": "finished", "active": False},
            "models": {"base": {"technical": {"apiModelKey": "topsis_sort_2016"}}},
            "consensus": {"enabled": False, "rounds": []},
            "criteria": {
                "nodes": [
                    {"id": CRITERION_IDS["Quality"], "name": "Quality", "isLeaf": True},
                    {"id": CRITERION_IDS["Cost"], "name": "Cost", "isLeaf": True},
                ],
                "finalWeights": {
                    "byCriterionId": {
                        CRITERION_IDS["Quality"]: 0.6,
                        CRITERION_IDS["Cost"]: 0.4,
                    }
                },
            },
            "participants": [
                {"invitationStatus": "accepted", "evaluationCompleted": True},
                {"invitationStatus": "accepted", "evaluationCompleted": True},
            ],
            "phaseResults": [
                {
                    "stage": "alternativeEvaluation",
                    "phase": 0,
                    "resultStructureKey": "sorting",
                    "resultStructureVersion": 1,
                    "standardizedOutput": result,
                    "rawOutput": {"diagnostics": result["diagnostics"]},
                    "modelSpecificOutput": {"apiModelKey": "topsis_sort_2016"},
                }
            ],
        }


class FakeSessions:
    def __init__(self, state: dict[str, Any]) -> None:
        self.users = {
            "owner": UserCredentials(email="owner@example.test", password="test-only"),
            "expert_a": UserCredentials(email="expert.a@example.test", password="test-only"),
            "expert_b": UserCredentials(email="expert.b@example.test", password="test-only"),
        }
        self.clients = {alias: FakeClient(alias, state) for alias in self.users}
        self.logins: list[str] = []

    def login(self, alias: str) -> None:
        self.logins.append(alias)

    def client_for(self, alias: str) -> FakeClient:
        return self.clients[alias]


def _valid_result() -> dict[str, Any]:
    return {
        "categories": deepcopy(FIXTURE["orderedCategories"]),
        "categoryOrderSemantics": "lower-order-is-less-preferred",
        "assignments": [{"alternativeId": alternative_id, "categoryId": category_id} for alternative_id, category_id in EXPECTED_BY_ID.items()],
        "diagnostics": {"closeness_by_profile_id": {"medium-boundary": 1 / 3, "high-boundary": 5 / 6}},
    }


def _state(model: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        "calls": [],
        "model": deepcopy(model or MODEL),
        "fixture": deepcopy(FIXTURE),
        "submissions": [],
        "compute_result": _valid_result(),
    }


def test_fixture_has_expected_values_weights_categories_profiles_and_assignments():
    fixture = scenario.load_fixture()
    assert fixture["criteriaWeights"] == {"quality": 0.6, "cost": 0.4}
    assert len(fixture["alternatives"]) == 3
    assert len(fixture["orderedCategories"]) == 3
    assert len(fixture["boundaryProfiles"]["profiles"]) == 2
    assert fixture["expectedAssignments"] == {"budget": "low", "balanced": "medium", "premium": "high"}


def test_fixture_rejects_non_adjacent_profile_category_id_and_incomplete_evaluations():
    invalid = deepcopy(FIXTURE)
    invalid["boundaryProfiles"]["profiles"][0]["categoryId"] = "low"
    with pytest.raises(ScenarioLabError, match="boundaryProfiles contract"):
        scenario.validate_fixture(invalid)
    invalid = deepcopy(FIXTURE)
    invalid["evaluations"]["premium"].pop("cost")
    with pytest.raises(ScenarioLabError, match="finite numeric values"):
        scenario.validate_fixture(invalid)


def test_model_selection_matches_the_backend_catalog_and_requires_authorization():
    assert scenario._compatible_model({"models": [MODEL]})["apiModelKey"] == "topsis_sort_2016"
    with pytest.raises(ScenarioLabError, match="unavailable"):
        scenario._compatible_model({"models": []})
    unauthorized = deepcopy(MODEL)
    unauthorized["issueExecutionAuthorized"] = False
    with pytest.raises(ScenarioLabError, match="not authorized"):
        scenario._compatible_model({"models": [unauthorized]})


def test_numeric_domain_selection_requires_all_fixture_values_to_be_representable():
    fixture = scenario.load_fixture()
    domain = {"id": "valid", "typeKey": "numericDiscrete", "definition": {"min": 0, "max": 10, "step": 1}}
    selected = scenario._compatible_domain({"globals": [domain], "userDomains": []}, {"numericDiscrete"}, fixture)
    assert selected["id"] == "valid"
    invalid = {"id": "invalid", "typeKey": "numericDiscrete", "definition": {"min": 1, "max": 9, "step": 2}}
    with pytest.raises(ScenarioLabError, match="represent every fixture value"):
        scenario._compatible_domain({"globals": [invalid], "userDomains": []}, {"numericDiscrete"}, fixture)


def test_issue_payload_uses_current_category_profile_and_creator_weight_contracts():
    payload = scenario._issue_payload("[AUTO:test]", "model-id", ["a@example.test", "b@example.test"], "domain", FIXTURE)
    assert payload["paramValues"]["orderedCategories"] == FIXTURE["orderedCategories"]
    assert payload["paramValues"]["boundaryProfiles"] == FIXTURE["boundaryProfiles"] | {
        "profiles": [
            {
                **profile,
                "valuesByCriterionId": {f"criterion-{key}": value for key, value in profile["valuesByCriterionId"].items()},
            }
            for profile in FIXTURE["boundaryProfiles"]["profiles"]
        ]
    }
    assert payload["criteriaWeightingConfig"]["payload"]["weightsByCriterion"] == {"criterion-quality": 0.6, "criterion-cost": 0.4}
    assert payload["isConsensus"] is False and payload["simulateConsensus"] is False


def test_generation_uses_http_flow_validates_sorting_output_and_records_manifest(tmp_path: Path):
    state = _state()
    sessions = FakeSessions(state)
    store = ManifestStore(tmp_path / "manifest.json")

    result = scenario.generate(sessions, store)

    assert sessions.logins == ["owner", "expert_a", "expert_b"]
    assert result.issue_id == "issue-id"
    assert result.assignments_by_alternative_name == {
        "Budget option": "low",
        "Balanced option": "medium",
        "Premium option": "high",
    }
    assert len(state["submissions"]) == 2
    assert state["submissions"][0][1] == state["submissions"][1][1]
    creation = state["creation"]
    assert creation["paramValues"]["boundaryProfiles"]["profiles"][0]["valuesByCriterionId"] == {
        "criterion-quality": 4,
        "criterion-cost": 6,
    }
    assert [call[2] for call in state["calls"] if call[2].endswith("invitation-response")] == [
        "/issues/issue-id/invitation-response",
        "/issues/issue-id/invitation-response",
    ]
    entry = store.find(result.generation_id)
    assert entry is not None and entry.issue_id == "issue-id" and entry.scenario_id == scenario.SCENARIO_ID


def test_generation_reports_issue_id_after_post_creation_validation_failure(tmp_path: Path):
    state = _state()
    state["compute_result"]["assignments"][0]["categoryId"] = "unknown"
    sessions = FakeSessions(state)
    store = ManifestStore(tmp_path / "manifest.json")

    with pytest.raises(ScenarioLabError, match=r"issueId=issue-id"):
        scenario.generate(sessions, store)
    assert store.list_entries() == []


def test_sorting_validator_rejects_ranking_fields():
    result = _valid_result()
    result["rankedAlternatives"] = []
    with pytest.raises(ScenarioLabError, match="ranking fields"):
        scenario._validate_sorting_result(result, categories=FIXTURE["orderedCategories"], expected_by_alternative_id=EXPECTED_BY_ID)


def test_cli_registers_the_topsis_sort_scenario(tmp_path: Path, monkeypatch):
    settings = SimpleNamespace(manifest_file=tmp_path / "manifest.json")
    result = scenario.GenerationResult(
        generation_id="gen-1",
        issue_id="issue-1",
        issue_name="[AUTO:gen-1] TOPSIS-Sort 2016 synthetic classification",
        owner_alias="owner",
        expert_aliases=("expert_a", "expert_b"),
        manifest_path=str(settings.manifest_file),
        assignments_by_alternative_name={"Budget option": "Low"},
    )

    class ContextSessions:
        def __enter__(self):
            return self

        def __exit__(self, *_):
            return None

    monkeypatch.setattr(cli, "_settings", lambda: settings)
    monkeypatch.setattr(cli.SessionPool, "from_settings", lambda _: ContextSessions())
    monkeypatch.setattr(cli, "generate_topsis_sort_2016", lambda *_args, **_kwargs: result)

    output = CliRunner().invoke(cli.app, ["generate", "topsis-sort-2016"])

    assert output.exit_code == 0, output.output
    assert "TOPSIS-Sort 2016" in output.output
    assert "assignments" in output.output
