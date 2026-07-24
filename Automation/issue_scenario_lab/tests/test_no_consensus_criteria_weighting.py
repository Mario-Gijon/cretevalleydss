from __future__ import annotations

from copy import deepcopy
from pathlib import Path
from typing import Any

import pytest

from issue_scenario_lab.config import UserCredentials
from issue_scenario_lab.errors import ScenarioLabError
from issue_scenario_lab.manifest.store import ManifestStore
from issue_scenario_lab.scenarios.no_consensus_criteria_weighting import (
    SCENARIO_ID,
    _required_parameters,
    _select_main_model,
    _select_weighting_model,
    _validate_finished,
    _validate_ranking,
    generate,
)


class CriteriaClient:
    def __init__(self, alias: str, state: dict[str, Any]) -> None:
        self.alias, self.state = alias, state

    def request(self, method: str, path: str, *, json: Any = None) -> Any:
        self.state["calls"].append((self.alias, method, path, json))
        if self.alias == "owner" and path == "/issues/models":
            return deepcopy(self.state["models"])
        if self.alias == "owner" and path == "/issues/users":
            return [{"email": "a@example.test"}, {"email": "b@example.test"}]
        if self.alias == "owner" and path == "/issues/expression-domains":
            return {"globals": [{"id": "domain", "typeKey": "numericDiscrete", "definition": {"min": 0, "max": 10, "step": 1}}], "userDomains": []}
        if self.alias == "owner" and path == "/issues" and method == "POST":
            self.state["name"] = json["issueInfo"]["issueName"]
            self.state["creation"] = json["issueInfo"]
            return {"issueName": self.state["name"]}
        if self.alias == "owner" and path == "/issues/active":
            return {
                "issues": [
                    {
                        "id": "issue",
                        "name": self.state["name"],
                        "currentStage": self.state["stage"],
                        "isConsensus": False,
                        "isIssueOwner": True,
                        "evaluationStructureKey": "alternativeCriteriaMatrix",
                        "criteriaWeightsStructureKey": "manualCriteriaWeights",
                    }
                ]
            }
        if path.endswith("/invitation-response"):
            return {}
        if path.endswith("/evaluations/criteriaWeighting") and method == "GET":
            return self._weight_context()
        if path.endswith("/evaluations/criteriaWeighting/submit"):
            self.state["weight_submissions"] += 1
            if self.state["weight_submissions"] == 2:
                self.state["stage"] = "weightsFinished"
            return {
                "completed": True,
                "stage": "criteriaWeighting",
                "structureKey": "manualCriteriaWeights",
                "consensusPhase": 0,
                "currentStage": self.state["stage"],
            }
        if path.endswith("/evaluations/criteriaWeighting/compute"):
            self.state["stage"] = "alternativeEvaluation"
            return {
                "stage": "criteriaWeighting",
                "structureKey": "manualCriteriaWeights",
                "consensusPhase": 0,
                "currentStage": "alternativeEvaluation",
                "result": {
                    "weightsByCriterion": {"quality": 0.6, "cost": 0.4},
                    "collectiveEvaluations": {"weightsByCriterion": {"quality": 0.6, "cost": 0.4}},
                    "consensusMeasure": None,
                    "rawOutput": {"useMcc": True},
                },
            }
        if path.endswith("/evaluations/alternativeEvaluation") and method == "GET":
            return self._alternative_context()
        if path.endswith("/evaluations/alternativeEvaluation/submit"):
            return {"completed": True, "currentStage": "alternativeEvaluation"}
        if path.endswith("/evaluations/alternativeEvaluation/compute"):
            self.state["stage"] = "finished"
            return {
                "stage": "alternativeEvaluation",
                "currentStage": "finished",
                "result": {
                    "rankedAlternatives": [
                        {"alternativeId": "balanced", "name": "Balanced choice", "score": 0.8, "rank": 1},
                        {"alternativeId": "premium", "name": "Premium choice", "score": 0.6, "rank": 2},
                        {"alternativeId": "budget", "name": "Budget choice", "score": 0.4, "rank": 3},
                    ],
                    "consensusMeasure": None,
                    "consensusLifecycle": None,
                },
            }
        if self.alias == "owner" and path == "/issues/finished":
            return {"issues": [{"id": "issue", "name": self.state["name"]}]}
        if self.alias == "owner" and path == "/issues/finished/issue":
            return self._finished()
        raise AssertionError(f"unexpected {self.alias} {method} {path}")

    def _weight_context(self) -> dict[str, Any]:
        return {
            "stage": "criteriaWeighting",
            "structureKey": "manualCriteriaWeights",
            "consensusPhase": 0,
            "completed": False,
            "decisionContext": {
                "issue": {"id": "issue", "currentStage": "criteriaWeighting", "isConsensus": False},
                "structure": {"key": "manualCriteriaWeights", "stage": "criteriaWeighting"},
                "model": {"apiModelKey": "topsis"},
                "criteriaTree": [{"id": "group"}],
                "leafCriteria": [{"id": "quality", "name": "Quality"}, {"id": "cost", "name": "Cost"}],
            },
            "payload": {"weightsByCriterion": {"quality": "", "cost": ""}},
        }

    def _alternative_context(self) -> dict[str, Any]:
        return {
            "stage": "alternativeEvaluation",
            "structureKey": "alternativeCriteriaMatrix",
            "consensusPhase": 0,
            "completed": False,
            "decisionContext": {
                "issue": {"id": "issue", "currentStage": "alternativeEvaluation", "isConsensus": False},
                "structure": {"key": "alternativeCriteriaMatrix", "stage": "alternativeEvaluation"},
                "model": {"apiModelKey": "topsis"},
                "alternatives": [
                    {"id": "balanced", "name": "Balanced choice"},
                    {"id": "premium", "name": "Premium choice"},
                    {"id": "budget", "name": "Budget choice"},
                ],
                "leafCriteria": [
                    {
                        "id": "quality",
                        "name": "Quality",
                        "type": "benefit",
                        "expressionDomain": {"typeKey": "numericDiscrete", "definition": {"min": 0, "max": 10, "step": 1}},
                    },
                    {
                        "id": "cost",
                        "name": "Cost",
                        "type": "cost",
                        "expressionDomain": {"typeKey": "numericDiscrete", "definition": {"min": 0, "max": 10, "step": 1}},
                    },
                ],
            },
            "payload": {
                "balanced": {"quality": "", "cost": ""},
                "premium": {"quality": "", "cost": ""},
                "budget": {"quality": "", "cost": ""},
            },
        }

    def _finished(self) -> dict[str, Any]:
        return {
            "issue": {"id": "issue", "name": self.state["name"]},
            "lifecycle": {"currentStage": "finished", "active": False},
            "models": {"base": {"technical": {"apiModelKey": "topsis"}}, "criteriaWeighting": {"technical": {"apiModelKey": "manual_criteria_weights"}}},
            "configuration": {
                "criteriaWeighting": {"required": True, "source": "expertCriteriaWeighting", "structureKey": "manualCriteriaWeights"},
                "alternativeEvaluation": {"structureKey": "alternativeCriteriaMatrix"},
            },
            "consensus": {"enabled": False, "rounds": []},
            "participants": [
                {
                    "expert": {"id": "expert-a", "email": "a@example.test"},
                    "invitationStatus": "accepted",
                    "weightsCompleted": True,
                    "evaluationCompleted": True,
                },
                {
                    "expert": {"id": "expert-b", "email": "b@example.test"},
                    "invitationStatus": "accepted",
                    "weightsCompleted": True,
                    "evaluationCompleted": True,
                },
            ],
            "evaluations": {
                "individual": [
                    {
                        "stage": "criteriaWeighting",
                        "phase": 0,
                        "structureKey": "manualCriteriaWeights",
                        "completed": True,
                        "expertId": "expert-a",
                        "submittedAt": "2026-01-01T00:00:00Z",
                    },
                    {
                        "stage": "criteriaWeighting",
                        "phase": 0,
                        "structureKey": "manualCriteriaWeights",
                        "completed": True,
                        "expertId": "expert-b",
                        "submittedAt": "2026-01-01T00:00:00Z",
                    },
                    {
                        "stage": "alternativeEvaluation",
                        "phase": 0,
                        "structureKey": "alternativeCriteriaMatrix",
                        "completed": True,
                        "expertId": "expert-a",
                        "submittedAt": "2026-01-01T00:00:00Z",
                    },
                    {
                        "stage": "alternativeEvaluation",
                        "phase": 0,
                        "structureKey": "alternativeCriteriaMatrix",
                        "completed": True,
                        "expertId": "expert-b",
                        "submittedAt": "2026-01-01T00:00:00Z",
                    },
                ],
                "contexts": [
                    {
                        "id": "criteriaWeighting:0",
                        "stage": "criteriaWeighting",
                        "phase": 0,
                        "structureKey": "manualCriteriaWeights",
                        "modelId": "topsis",
                        "activeModelId": "manual",
                        "decisionContext": {"issue": {"id": "issue"}, "model": {"apiModelKey": "manual_criteria_weights"}},
                    },
                    {
                        "id": "alternativeEvaluation:0",
                        "stage": "alternativeEvaluation",
                        "phase": 0,
                        "structureKey": "alternativeCriteriaMatrix",
                        "modelId": "topsis",
                        "activeModelId": "topsis",
                        "decisionContext": {"issue": {"id": "issue"}, "model": {"apiModelKey": "topsis"}},
                    },
                ],
                "collective": [
                    {
                        "phaseResultId": "weights",
                        "stage": "criteriaWeighting",
                        "phase": 0,
                        "rawPayload": {"weightsByCriterion": {"quality": 0.6, "cost": 0.4}},
                        "displayPayload": None,
                    },
                    {"phaseResultId": "alternatives", "stage": "alternativeEvaluation", "phase": 0, "rawPayload": {}, "displayPayload": None},
                ],
            },
            "alternatives": [
                {"id": "balanced", "name": "Balanced choice"},
                {"id": "premium", "name": "Premium choice"},
                {"id": "budget", "name": "Budget choice"},
            ],
            "criteria": {
                "nodes": [{"id": "quality", "name": "Quality"}, {"id": "cost", "name": "Cost"}],
                "finalWeights": {
                    "source": {"kind": "criteriaWeightingStageResult", "stageResultId": "weights", "stage": "criteriaWeighting", "phase": 0},
                    "byCriterionId": {"quality": 0.6, "cost": 0.4},
                },
            },
            "phaseResults": [
                {
                    "id": "weights",
                    "stage": "criteriaWeighting",
                    "phase": 0,
                    "consensusMeasure": None,
                },
                {
                    "id": "alternatives",
                    "stage": "alternativeEvaluation",
                    "phase": 0,
                    "rankedAlternatives": [
                        {"alternativeId": "balanced", "name": "Balanced choice", "score": 0.8, "rank": 1},
                        {"alternativeId": "premium", "name": "Premium choice", "score": 0.6, "rank": 2},
                        {"alternativeId": "budget", "name": "Budget choice", "score": 0.4, "rank": 3},
                    ],
                },
            ],
        }


class CriteriaSessions:
    def __init__(self) -> None:
        self.state: dict[str, Any] = {
            "calls": [],
            "stage": "criteriaWeighting",
            "name": "",
            "weight_submissions": 0,
            "models": {
                "models": [
                    {
                        "id": "topsis",
                        "apiModelKey": "topsis",
                        "modelKind": "issue",
                        "visibleInIssueCreation": True,
                        "manifestSync": {"isStale": False},
                        "implementationStatus": "ready",
                        "publicUsable": True,
                        "supportsConsensus": False,
                        "supportsConsensusSimulation": False,
                        "usesCriteriaWeights": True,
                        "usesCriterionTypes": True,
                        "usesExpertWeights": False,
                        "evaluationStructureKey": "alternativeCriteriaMatrix",
                        "supportedExpressionDomains": [{"typeKey": "numericDiscrete"}],
                        "parameters": [],
                    }
                ],
                "criteriaWeightingModels": [
                    {
                        "id": "manual",
                        "apiModelKey": "manual_criteria_weights",
                        "modelKind": "criteriaWeighting",
                        "visibleInCriteriaWeighting": True,
                        "manifestSync": {"isStale": False},
                        "implementationStatus": "ready",
                        "publicUsable": True,
                        "supportsExpertCriteriaWeighting": True,
                        "evaluationStructureKey": "manualCriteriaWeights",
                        "supportsConsensus": False,
                        "parameters": [],
                    }
                ],
            },
        }
        self.users = {
            alias: UserCredentials(email=email, password="secret")
            for alias, email in {"owner": "owner@example.test", "expert_a": "a@example.test", "expert_b": "b@example.test"}.items()
        }
        self.clients = {alias: CriteriaClient(alias, self.state) for alias in self.users}

    def login(self, alias: str) -> dict[str, str]:
        return {"token": alias}

    def client_for(self, alias: str) -> CriteriaClient:
        return self.clients[alias]


def test_complete_topsis_manual_weighting_flow_writes_minimal_manifest(tmp_path: Path) -> None:
    sessions = CriteriaSessions()
    store = ManifestStore(tmp_path / "manifest.json")
    result = generate(sessions, store)
    assert result.issue_id == "issue"
    assert store.list_entries()[0].scenario_id == SCENARIO_ID
    creation = sessions.state["creation"]
    assert creation["selectedModelId"] == "topsis"
    assert creation["criteriaWeightingConfig"] == {
        "mode": "expertManual",
        "source": "experts",
        "method": "manual",
        "structureKey": "manualCriteriaWeights",
        "payload": {},
    }
    assert "criteriaWeightingModelId" not in creation and "criteriaWeightingModelKey" not in creation
    submissions = [call for call in sessions.state["calls"] if call[2].endswith("criteriaWeighting/submit")]
    assert submissions[0][3]["payload"]["weightsByCriterion"] == {"quality": 0.7, "cost": 0.3}
    assert submissions[0][3] != submissions[1][3]


@pytest.mark.parametrize(("field", "value"), [("usesCriteriaWeights", False), ("usesCriterionTypes", False), ("evaluationStructureKey", "wrong")])
def test_incompatible_topsis_is_rejected_before_creation(field: str, value: Any) -> None:
    sessions = CriteriaSessions()
    sessions.state["models"]["models"][0][field] = value
    with pytest.raises(ScenarioLabError, match="TOPSIS model is incompatible"):
        _select_main_model(sessions.state["models"])


def test_manual_catalogue_contract_is_required() -> None:
    models = CriteriaSessions().state["models"]
    models["criteriaWeightingModels"][0]["supportsExpertCriteriaWeighting"] = False
    with pytest.raises(ScenarioLabError, match="Manual Criteria Weights model is incompatible"):
        _select_weighting_model(models)


def test_topsis_ranking_requires_real_alternative_id_contract() -> None:
    ranking = [
        {"alternativeId": "balanced", "name": "Balanced choice", "score": 0.8, "rank": 1},
        {"alternativeId": "premium", "name": "Premium choice", "score": 0.6, "rank": 2},
        {"alternativeId": "budget", "name": "Budget choice", "score": 0.4, "rank": 3},
    ]
    _validate_ranking(ranking, {"balanced", "premium", "budget"})
    ranking[0] = {"id": "balanced", "name": "Balanced choice", "score": 0.8, "rank": 1}
    with pytest.raises(ScenarioLabError, match="canonical alternativeId"):
        _validate_ranking(ranking, {"balanced", "premium", "budget"})


@pytest.mark.parametrize(
    "replacement",
    [
        {"name": "Balanced choice", "score": 0.8, "rank": 1},
        {"alternativeId": "premium", "name": "Balanced choice", "score": 0.8, "rank": 1},
        {"alternativeId": "unknown", "name": "Balanced choice", "score": 0.8, "rank": 1},
        {"alternativeId": "balanced", "name": "Balanced choice", "rank": 1},
        {"alternativeId": "balanced", "name": "Balanced choice", "score": float("nan"), "rank": 1},
        {"alternativeId": "balanced", "name": "Balanced choice", "score": 0.8, "rank": 2},
    ],
)
def test_topsis_ranking_rejects_invalid_canonical_entries(replacement: dict[str, Any]) -> None:
    ranking = [
        replacement,
        {"alternativeId": "premium", "name": "Premium choice", "score": 0.6, "rank": 2},
        {"alternativeId": "budget", "name": "Budget choice", "score": 0.4, "rank": 3},
    ]
    with pytest.raises(ScenarioLabError, match="canonical alternativeId"):
        _validate_ranking(ranking, {"balanced", "premium", "budget"})


@pytest.mark.parametrize(
    ("parameters", "expected"),
    [
        ([{"key": "required", "required": True, "default": None}], True),
        ([{"key": "required", "required": True, "default": 0}], False),
        ([{"key": "optional", "required": False, "default": None}], False),
        ([], False),
    ],
)
def test_required_parameter_detection_uses_null_normalized_default(parameters: list[dict[str, Any]], expected: bool) -> None:
    assert _required_parameters({"parameters": parameters}) is expected


def test_manual_model_rejects_required_null_default() -> None:
    models = CriteriaSessions().state["models"]
    models["criteriaWeightingModels"][0]["parameters"] = [{"key": "precision", "required": True, "default": None}]
    with pytest.raises(ScenarioLabError, match="requiredParameters"):
        _select_weighting_model(models)


def _finished_detail() -> dict[str, Any]:
    sessions = CriteriaSessions()
    sessions.state["name"] = "[AUTO:test] No consensus · criteria weighting"
    return sessions.clients["owner"]._finished()


def _validate_real_finished(detail: dict[str, Any]) -> None:
    _validate_finished(detail, "issue", "[AUTO:test] No consensus · criteria weighting", {"quality", "cost"}, {"a@example.test", "b@example.test"})


def test_finished_collective_payload_is_separate_from_phase_results() -> None:
    detail = _finished_detail()
    _validate_real_finished(detail)
    assert "collectiveEvaluations" not in detail["phaseResults"][0]


@pytest.mark.parametrize(
    "mutation",
    [
        lambda detail: detail["evaluations"].pop("collective"),
        lambda detail: detail["evaluations"]["collective"].pop(),
        lambda detail: detail["evaluations"]["collective"][0].update({"phaseResultId": "wrong"}),
        lambda detail: detail["evaluations"]["collective"][0]["rawPayload"].update({"weightsByCriterion": {"quality": 1.0}}),
        lambda detail: detail["evaluations"]["collective"][0]["rawPayload"].update({"weightsByCriterion": {"quality": 0.2, "cost": 0.8}}),
        lambda detail: detail["evaluations"]["contexts"][0]["decisionContext"]["model"].update({"apiModelKey": "topsis"}),
    ],
)
def test_finished_collective_and_context_contract_rejects_mismatches(mutation: Any) -> None:
    detail = _finished_detail()
    mutation(detail)
    with pytest.raises(ScenarioLabError):
        _validate_real_finished(detail)
