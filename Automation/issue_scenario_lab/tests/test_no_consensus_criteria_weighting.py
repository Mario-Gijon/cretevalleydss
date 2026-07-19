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
    _select_main_model,
    _select_weighting_model,
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
                    "rankedAlternatives": [{"id": "balanced"}, {"id": "premium"}, {"id": "budget"}],
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
            "evaluationContext": {
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
            "evaluationContext": {
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
                "balanced": {"quality": {"value": ""}, "cost": {"value": ""}},
                "premium": {"quality": {"value": ""}, "cost": {"value": ""}},
                "budget": {"quality": {"value": ""}, "cost": {"value": ""}},
            },
        }

    def _finished(self) -> dict[str, Any]:
        return {
            "issue": {"id": "issue", "name": self.state["name"]},
            "lifecycle": {"currentStage": "finished", "active": False},
            "models": {"base": {"technical": {"apiModelKey": "topsis"}}, "criteriaWeighting": {"technical": {"apiModelKey": "manual_criteria_weights"}}},
            "configuration": {"criteriaWeighting": {"source": "expertCriteriaWeighting"}},
            "consensus": {"enabled": False, "rounds": []},
            "criteria": {
                "nodes": [{"id": "quality", "name": "Quality"}, {"id": "cost", "name": "Cost"}],
                "finalWeights": {
                    "source": {"kind": "criteriaWeightingStageResult", "stageResultId": "weights"},
                    "byCriterionId": {"quality": 0.6, "cost": 0.4},
                },
            },
            "phaseResults": [
                {"id": "weights", "stage": "criteriaWeighting", "phase": 0},
                {"id": "alternatives", "stage": "alternativeEvaluation", "phase": 0, "rankedAlternatives": [{}, {}, {}]},
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
