from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from issue_scenario_lab.config import UserCredentials
from issue_scenario_lab.errors import ScenarioLabError
from issue_scenario_lab.manifest.store import ManifestStore
from issue_scenario_lab.scenarios.no_consensus_basic import (
    SCENARIO_ID,
    _compatible_domain,
    _compatible_model,
    generate,
    supported_domain_type_keys,
)
from issue_scenario_lab.scenarios.numeric_values import numeric_levels


class FakeClient:
    def __init__(self, alias: str, calls: list[tuple[str, str, Any]]) -> None:
        self.alias = alias
        self.calls = calls

    def request(self, method: str, path: str, *, json: Any = None) -> Any:
        self.calls.append((self.alias, path, json))
        if self.alias == "owner" and path == "/issues/models":
            return {
                "models": [
                    {
                        "_id": "borda-id",
                        "apiModelKey": "borda",
                        "modelKind": "issue",
                        "visibleInIssueCreation": True,
                        "manifestSync": {"isStale": False},
                        "supportsConsensus": False,
                        "supportsConsensusSimulation": False,
                        "usesCriteriaWeights": False,
                        "usesExpertWeights": False,
                        "evaluationStructureKey": "alternativeCriteriaMatrix",
                        "supportedExpressionDomains": [{"typeKey": "numericContinuous"}, {"typeKey": "numericDiscrete"}],
                    }
                ]
            }
        if self.alias == "owner" and path == "/issues/users":
            return [
                {"name": "Expert A", "university": "Test University", "email": "a@example.test"},
                {"name": "Expert B", "university": "Test University", "email": "b@example.test"},
            ]
        if self.alias == "owner" and path == "/issues/expression-domains":
            return {
                "globals": [
                    {
                        "_id": "domain-id",
                        "name": "Discrete 0-10",
                        "isGlobal": True,
                        "typeKey": "numericDiscrete",
                        "definition": {"min": 0, "max": 10, "step": 1},
                    }
                ],
                "userDomains": [],
            }
        if self.alias == "owner" and path == "/issues":
            return {"issueName": json["issueInfo"]["issueName"]}
        if self.alias == "owner" and path == "/issues/active":
            return {
                "issues": [
                    {
                        "id": "issue-id",
                        "name": next(call[2]["issueInfo"]["issueName"] for call in self.calls if call[1] == "/issues"),
                        "currentStage": "alternativeEvaluation",
                        "isConsensus": False,
                        "isIssueOwner": True,
                        "evaluationStructureKey": "alternativeCriteriaMatrix",
                    }
                ]
            }
        if path.endswith("/evaluations/alternativeEvaluation") and method == "GET":
            return {
                "stage": "alternativeEvaluation",
                "structureKey": "alternativeCriteriaMatrix",
                "consensusPhase": 0,
                "completed": False,
                "payload": {
                    "context": {
                        "alternatives": [
                            {"id": "balanced", "name": "Balanced choice"},
                            {"id": "premium", "name": "Premium choice"},
                            {"id": "budget", "name": "Budget choice"},
                        ],
                        "criteria": [
                            {
                                "id": "quality",
                                "name": "Quality",
                                "expressionDomain": {"name": "Discrete 0-10", "typeKey": "numericDiscrete", "definition": {"min": 0, "max": 10, "step": 1}},
                            },
                            {
                                "id": "cost",
                                "name": "Cost",
                                "expressionDomain": {"name": "Discrete 0-10", "typeKey": "numericDiscrete", "definition": {"min": 0, "max": 10, "step": 1}},
                            },
                        ],
                    }
                },
            }
        if path.endswith("/submit"):
            return {"completed": True, "currentStage": "alternativeEvaluation"}
        if path.endswith("/compute"):
            return {
                "stage": "alternativeEvaluation",
                "currentStage": "finished",
                "result": {"rankedAlternatives": [{}, {}, {}], "consensusMeasure": None, "consensusLifecycle": None},
            }
        if path == "/issues/finished":
            return {"issues": [{"id": "issue-id"}]}
        if path == "/issues/finished/issue-id":
            return {
                "issue": {"id": "issue-id", "name": "generated"},
                "alternatives": [
                    {"id": "balanced", "name": "Balanced choice"},
                    {"id": "premium", "name": "Premium choice"},
                    {"id": "budget", "name": "Budget choice"},
                ],
                "criteria": {"nodes": [{"id": "quality", "name": "Quality"}, {"id": "cost", "name": "Cost"}]},
                "phaseResults": [{"stage": "alternativeEvaluation", "rankedAlternatives": [{}, {}, {}]}],
                "consensus": {"enabled": False, "rounds": []},
                "models": {"base": {"technical": {"apiModelKey": "borda"}}},
            }
        return {}


class FakeSessions:
    def __init__(self) -> None:
        self.users = {
            alias: UserCredentials(email=email, password="secret")
            for alias, email in {"owner": "owner@example.test", "expert_a": "a@example.test", "expert_b": "b@example.test"}.items()
        }
        self.calls: list[tuple[str, str, Any]] = []
        self.clients = {alias: FakeClient(alias, self.calls) for alias in self.users}

    def login(self, alias: str) -> dict[str, str]:
        return {"token": alias}

    def client_for(self, alias: str) -> FakeClient:
        return self.clients[alias]


def test_numeric_levels_are_valid_for_continuous_and_discrete_domains() -> None:
    assert numeric_levels({"typeKey": "numericContinuous", "definition": {"min": 0, "max": 8}}) == (2.0, 4.0, 6.0)
    assert numeric_levels({"typeKey": "numericDiscrete", "definition": {"min": 0.1, "max": 0.3, "step": 0.1}}) == (0.1, 0.2, 0.3)
    assert numeric_levels({"typeKey": "numericDiscrete", "definition": {"min": 1, "max": 2, "step": 1}}) == (1.0, 2.0, 2.0)


@pytest.mark.parametrize(
    ("domain", "message"),
    [
        ({"typeKey": "numericDiscrete", "definition": None}, "definition"),
        ({"typeKey": "numericContinuous", "definition": {"min": 3, "max": 3}}, "greater than min"),
        ({"typeKey": "numericDiscrete", "definition": {"min": 0, "max": 1, "step": 0}}, "step"),
        ({"typeKey": "numericDiscrete", "definition": {"min": 0, "max": 1, "step": 2}}, "two representable"),
    ],
)
def test_numeric_levels_reject_invalid_nested_definitions(domain: dict[str, Any], message: str) -> None:
    with pytest.raises(ScenarioLabError, match=message):
        numeric_levels(domain)


def test_borda_supported_domain_objects_are_extracted_and_validated() -> None:
    model = {"supportedExpressionDomains": [{"typeKey": "numericContinuous"}, {"typeKey": "numericDiscrete"}]}
    assert supported_domain_type_keys(model) == {"numericContinuous", "numericDiscrete"}
    with pytest.raises(ScenarioLabError, match="must be an array"):
        supported_domain_type_keys({})
    with pytest.raises(ScenarioLabError, match="malformed"):
        supported_domain_type_keys({"supportedExpressionDomains": ["numericDiscrete"]})
    with pytest.raises(ScenarioLabError, match="supportedExpressionDomains"):
        _compatible_model(
            {
                "models": [
                    {
                        "_id": "borda",
                        "apiModelKey": "borda",
                        "supportsConsensus": False,
                        "supportsConsensusSimulation": False,
                        "usesCriteriaWeights": False,
                        "usesExpertWeights": False,
                        "evaluationStructureKey": "alternativeCriteriaMatrix",
                        "supportedExpressionDomains": [{"typeKey": "linguistic"}],
                    }
                ]
            }
        )


def test_real_domain_selection_prioritizes_global_discrete_then_user_then_continuous() -> None:
    def domain(domain_id: str, type_key: str) -> dict[str, Any]:
        return {
            "_id": domain_id,
            "typeKey": type_key,
            "definition": {"min": 0, "max": 4, "step": 2} if type_key == "numericDiscrete" else {"min": 0, "max": 4},
        }

    supported = {"numericDiscrete", "numericContinuous"}
    assert (
        _compatible_domain(
            {
                "globals": [domain("global-continuous", "numericContinuous"), domain("global-discrete", "numericDiscrete")],
                "userDomains": [domain("user-discrete", "numericDiscrete")],
            },
            supported,
        )["_id"]
        == "global-discrete"
    )
    assert (
        _compatible_domain(
            {"globals": [domain("global-continuous", "numericContinuous")], "userDomains": [domain("user-discrete", "numericDiscrete")]}, supported
        )["_id"]
        == "user-discrete"
    )
    assert _compatible_domain({"globals": [], "userDomains": [domain("user-continuous", "numericContinuous")]}, supported)["_id"] == "user-continuous"
    with pytest.raises(ScenarioLabError, match="no compatible"):
        _compatible_domain({"globals": [], "userDomains": []}, supported)


def test_missing_required_alias_fails_before_http(tmp_path: Path) -> None:
    sessions = FakeSessions()
    del sessions.users["expert_b"]
    with pytest.raises(ScenarioLabError, match="requires distinct configured aliases"):
        generate(sessions, ManifestStore(tmp_path / "manifest.json"))
    assert sessions.calls == []


def test_complete_mocked_flow_writes_one_minimal_manifest_entry(tmp_path: Path) -> None:
    sessions = FakeSessions()
    store = ManifestStore(tmp_path / "manifest.json")
    result = generate(sessions, store)
    assert result.issue_id == "issue-id"
    assert store.list_entries()[0].scenario_id == SCENARIO_ID
    creation = next(call for call in sessions.calls if call[1] == "/issues")
    issue_info = creation[2]["issueInfo"]
    assert issue_info["selectedModelId"] == "borda-id"
    assert issue_info["addedExperts"] == ["a@example.test", "b@example.test"]
    assert "consensusThreshold" not in issue_info
    submitted = [call for call in sessions.calls if call[1].endswith("/submit")]
    assert submitted[0][2]["payload"]["balanced"]["quality"] == {"value": 5.0}
    assert submitted[0][2]["payload"] != submitted[1][2]["payload"]
    assert next(call for call in sessions.calls if call[1].endswith("/compute"))[0] == "owner"


def test_missing_catalogue_expert_stops_before_issue_creation(tmp_path: Path) -> None:
    sessions = FakeSessions()
    original_request = sessions.clients["owner"].request

    def missing_expert(method: str, path: str, *, json: Any = None) -> Any:
        if path == "/issues/users":
            return [{"email": "a@example.test"}]
        return original_request(method, path, json=json)

    sessions.clients["owner"].request = missing_expert  # type: ignore[method-assign]
    with pytest.raises(ScenarioLabError, match="absent from the Backend user catalogue"):
        generate(sessions, ManifestStore(tmp_path / "manifest.json"))
    assert not any(path == "/issues" for _, path, _ in sessions.calls)


def test_incomplete_finished_detail_is_rejected_without_manifest_entry(tmp_path: Path) -> None:
    sessions = FakeSessions()
    original_request = sessions.clients["owner"].request

    def incomplete_detail(method: str, path: str, *, json: Any = None) -> Any:
        if path == "/issues/finished/issue-id":
            return {"issue": {"id": "issue-id"}}
        return original_request(method, path, json=json)

    sessions.clients["owner"].request = incomplete_detail  # type: ignore[method-assign]
    store = ManifestStore(tmp_path / "manifest.json")
    with pytest.raises(ScenarioLabError, match="after issue creation"):
        generate(sessions, store)
    assert store.list_entries() == []
