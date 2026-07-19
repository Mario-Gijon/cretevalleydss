from __future__ import annotations

from copy import deepcopy
from pathlib import Path
from typing import Any

import pytest

from issue_scenario_lab.config import UserCredentials
from issue_scenario_lab.errors import ScenarioLabError
from issue_scenario_lab.manifest.store import ManifestStore
from issue_scenario_lab.scenarios.consensus_first_round import (
    PARAMETERS,
    SCENARIO_ID,
    _collective,
    _context,
    _domain,
    _pairwise,
    _payload,
    _select_model,
    _validate_active,
    _validate_collective,
    _validate_finished,
    _validate_pairwise,
    generate,
)


def _model() -> dict[str, Any]:
    return {
        "id": "hv",
        "apiModelKey": "herrera_viedma_crp",
        "modelKind": "issue",
        "visibleInIssueCreation": True,
        "manifestSync": {"isStale": False},
        "implementationStatus": "ready",
        "publicUsable": True,
        "supportsConsensus": True,
        "supportsConsensusSimulation": True,
        "usesCriteriaWeights": True,
        "usesExpertWeights": False,
        "usesFuzzyCriteriaWeights": False,
        "usesCriterionTypes": False,
        "evaluationStructureKey": "alternativePairwiseByCriterion",
        "supportedExpressionDomains": [{"typeKey": "numericContinuous", "constraints": {"min": 0, "max": 1}}],
        "parameters": [
            {"key": "ag_lq", "scope": "global", "parameterStructureKey": "intervalGlobal", "required": True, "restrictions": {"ordered": "strictIncreasing"}},
            {"key": "ex_lq", "scope": "global", "parameterStructureKey": "intervalGlobal", "required": True, "restrictions": {"ordered": "strictIncreasing"}},
            {"key": "b", "scope": "global", "parameterStructureKey": "selectGlobal", "required": True, "restrictions": {"allowed": [0.5, 0.7, 0.9, 1]}},
            {"key": "beta", "scope": "global", "parameterStructureKey": "numberGlobal", "required": True, "restrictions": {"min": 0, "max": 1}},
        ],
    }


def _context_payload() -> dict[str, Any]:
    ids = {"Balanced choice": "balanced", "Premium choice": "premium", "Budget choice": "budget"}
    criteria = {"Quality": "quality", "Cost": "cost"}
    empty = {
        criterion_id: {row: {column: {"value": ""} for column in ids.values() if column != row} for row in ids.values()} for criterion_id in criteria.values()
    }
    return {
        "stage": "alternativeEvaluation",
        "structureKey": "alternativePairwiseByCriterion",
        "consensusPhase": 0,
        "completed": False,
        "evaluationContext": {
            "issue": {"id": "issue", "currentStage": "alternativeEvaluation", "isConsensus": True},
            "model": {"apiModelKey": "herrera_viedma_crp"},
            "alternatives": [{"id": value, "name": name} for name, value in ids.items()],
            "leafCriteria": [
                {"id": value, "name": name, "type": "benefit", "expressionDomain": {"typeKey": "numericContinuous", "definition": {"min": 0, "max": 1}}}
                for name, value in criteria.items()
            ],
        },
        "payload": empty,
    }


def test_herrera_viedma_catalogue_and_explicit_parameters_succeed() -> None:
    assert _select_model({"models": [_model()]})["id"] == "hv"
    assert PARAMETERS == {"ag_lq": [0.3, 0.8], "ex_lq": [0.5, 1.0], "b": 1, "beta": 0.8}


@pytest.mark.parametrize(
    "field,value", [("supportsConsensus", False), ("supportsConsensusSimulation", False), ("usesExpertWeights", True), ("evaluationStructureKey", "wrong")]
)
def test_herrera_viedma_catalogue_rejects_incompatible_contract(field: str, value: Any) -> None:
    model = _model()
    model[field] = value
    with pytest.raises(ScenarioLabError, match="incompatible"):
        _select_model({"models": [model]})


def test_exact_continuous_domain_and_creation_payload() -> None:
    domain = _domain(
        {
            "globals": [
                {"id": "narrow", "typeKey": "numericContinuous", "definition": {"min": 0.1, "max": 0.9}},
                {"id": "full", "typeKey": "numericContinuous", "definition": {"min": 0, "max": 1}},
            ],
            "userDomains": [],
        }
    )
    assert domain["id"] == "full"
    payload = _payload("name", "hv", ["a@example.test", "b@example.test"], "full")
    assert payload["isConsensus"] is True and payload["simulateConsensus"] is False
    assert payload["criteriaWeightingConfig"]["payload"] == {"weightsByCriterion": {"criterion-quality": 0.60, "criterion-cost": 0.40}}


def test_empty_pairwise_and_distinct_reciprocal_payloads() -> None:
    response = _context_payload()
    context = _context(response, "issue")
    first, second = _pairwise(context, expert_b=False), _pairwise(context, expert_b=True)
    assert first != second
    _validate_pairwise(first, {"quality", "cost"}, {"balanced", "premium", "budget"})
    broken = deepcopy(first)
    broken["quality"]["balanced"]["premium"]["value"] = 0.5
    with pytest.raises(ScenarioLabError, match="reciprocal"):
        _validate_pairwise(broken, {"quality", "cost"}, {"balanced", "premium", "budget"})


def test_collective_uses_only_first_persisted_criterion() -> None:
    expected = _collective(_context(_context_payload(), "issue"))
    _validate_collective(deepcopy(expected), expected)
    with pytest.raises(ScenarioLabError, match="aggregated first criterion"):
        _validate_collective({"quality": expected["quality"], "cost": {}}, expected)


def test_active_contract_requires_consensus_current_phase() -> None:
    active = {
        "currentStage": "alternativeEvaluation",
        "isConsensus": True,
        "simulateConsensus": False,
        "consensusCurrentPhase": 0,
        "consensusThreshold": 0.9,
        "consensusMaxPhases": 3,
        "isIssueOwner": True,
        "evaluationStructureKey": "alternativePairwiseByCriterion",
        "criteriaWeightsStructureKey": "manualCriteriaWeights",
    }
    _validate_active(active)
    active.pop("consensusCurrentPhase")
    with pytest.raises(ScenarioLabError, match="phase-zero"):
        _validate_active(active)
    active["consensusPhase"] = 0
    with pytest.raises(ScenarioLabError, match="phase-zero"):
        _validate_active(active)


class ConsensusClient:
    def __init__(self, alias: str, state: dict[str, Any]) -> None:
        self.alias, self.state = alias, state

    def request(self, method: str, path: str, *, json: Any = None) -> Any:
        self.state["calls"].append((self.alias, method, path, json))
        if self.alias == "owner" and path == "/issues/models":
            return {"models": [_model()]}
        if self.alias == "owner" and path == "/issues/users":
            return {"users": [{"email": "a@example.test"}, {"email": "b@example.test"}]}
        if self.alias == "owner" and path == "/issues/expression-domains":
            return {"globals": [{"id": "domain", "typeKey": "numericContinuous", "definition": {"min": 0, "max": 1}}], "userDomains": []}
        if self.alias == "owner" and path == "/issues":
            self.state["creation"] = json["issueInfo"]
            return {"issueName": self.state["creation"]["issueName"]}
        if self.alias == "owner" and path == "/issues/active":
            return {"issues": [self._active()]}
        if path.endswith("/invitation-response"):
            return {"invitationStatus": "accepted"}
        if method == "GET" and path.endswith("/evaluations/alternativeEvaluation"):
            return _context_payload()
        if path.endswith("/submit"):
            return {
                "completed": True,
                "stage": "alternativeEvaluation",
                "structureKey": "alternativePairwiseByCriterion",
                "consensusPhase": 0,
                "currentStage": "alternativeEvaluation",
            }
        if path.endswith("/compute"):
            return self._compute()
        if self.alias == "owner" and path == "/issues/finished":
            return {"issues": [{"id": "issue", "name": self.state["creation"]["issueName"]}]}
        if self.alias == "owner" and path == "/issues/finished/issue":
            return self._finished()
        raise AssertionError(f"unexpected request: {self.alias} {method} {path}")

    def _active(self) -> dict[str, Any]:
        return {
            "id": "issue", "name": self.state["creation"]["issueName"], "currentStage": "alternativeEvaluation", "isConsensus": True,
            "simulateConsensus": False, "consensusCurrentPhase": 0, "consensusThreshold": 0.9, "consensusMaxPhases": 3,
            "isIssueOwner": True, "evaluationStructureKey": "alternativePairwiseByCriterion", "criteriaWeightsStructureKey": "manualCriteriaWeights",
        }

    def _compute(self) -> dict[str, Any]:
        expected = _collective(_context(_context_payload(), "issue"))
        ranking = [
            {"alternativeId": "balanced", "name": "Balanced choice", "score": 0.52904, "rank": 1},
            {"alternativeId": "premium", "name": "Premium choice", "score": 0.43836, "rank": 2},
            {"alternativeId": "budget", "name": "Budget choice", "score": 0.261, "rank": 3},
        ]
        lifecycle = {
            "consensusReached": True, "maxPhasesReached": False, "finalizationReason": "consensusReached",
            "currentConsensusPhase": 0, "nextConsensusPhase": 0, "threshold": 0.9, "maxPhases": 3, "consensusMeasure": 1.0,
        }
        return {
            "stage": "alternativeEvaluation", "structureKey": "alternativePairwiseByCriterion", "consensusPhase": 0, "currentStage": "finished",
            "result": {
                "consensusMeasure": 1.0, "rankedAlternatives": ranking, "collectiveEvaluations": expected, "consensusLifecycle": lifecycle,
                "rawOutput": {"cm": 1.0, "collective_scores": [0.52904, 0.43836, 0.261], "suggested_next_evaluations": {}, "collective_evaluations": expected},
            },
        }

    def _finished(self) -> dict[str, Any]:
        result = self._compute()["result"]
        weights = {"quality": 0.6, "cost": 0.4}
        return {
            "issue": {"id": "issue", "name": self.state["creation"]["issueName"]}, "lifecycle": {"currentStage": "finished", "active": False},
            "models": {
                "base": {
                    "technical": {"apiModelKey": "herrera_viedma_crp"},
                    "capabilities": {"supportsConsensus": True, "supportsConsensusSimulation": True, "usesCriteriaWeights": True, "usesExpertWeights": False},
                    "evaluationStructureKey": "alternativePairwiseByCriterion", "effectiveParameters": {**PARAMETERS, "weights": weights},
                },
                "criteriaWeighting": None,
            },
            "configuration": {"criteriaWeighting": {"source": "directModelParameters", "structureKey": "manualCriteriaWeights", "modelId": None}},
            "consensus": {
                "enabled": True, "simulated": False, "threshold": 0.9, "maxPhases": 3, "finalPhase": 0,
                "reachedPhase": 0, "finalizationReason": "consensusReached", "rounds": [{"phase": 0}],
            },
            "criteria": {
                "nodes": [{"id": "quality", "name": "Quality"}, {"id": "cost", "name": "Cost"}],
                "finalWeights": {"source": {"kind": "directModelParameters", "stageResultId": None}, "byCriterionId": weights},
            },
            "participants": [
                {"invitationStatus": "accepted", "evaluationCompleted": True, "expert": {"email": "a@example.test"}},
                {"invitationStatus": "accepted", "evaluationCompleted": True, "expert": {"email": "b@example.test"}},
            ],
            "participantHistory": {
                "summary": {"total": 2, "participated": 2, "notParticipated": 0, "participatedPercentage": 100},
                "records": [{"participated": True, "participationKey": "participated", "weight": None}] * 2,
            },
            "evaluations": {
                "individual": [
                    {
                        "stage": "alternativeEvaluation", "phase": 0, "completed": True,
                        "structureKey": "alternativePairwiseByCriterion", "submittedAt": "2026-01-01",
                    },
                ] * 2,
                "contexts": [{"stage": "alternativeEvaluation", "phase": 0}],
                "collective": [{"stage": "alternativeEvaluation", "phase": 0, "phaseResultId": "phase", "rawPayload": result["collectiveEvaluations"]}],
            },
            "phaseResults": [
                {
                    "id": "phase", "stage": "alternativeEvaluation", "phase": 0,
                    "rankedAlternatives": result["rankedAlternatives"],
                    "modelSpecificOutput": {"consensusLifecycle": result["consensusLifecycle"]},
                },
            ],
        }


class ConsensusSessions:
    def __init__(self) -> None:
        emails = {"owner": "owner@example.test", "expert_a": "a@example.test", "expert_b": "b@example.test"}
        self.users = {alias: UserCredentials(email=email, password="secret") for alias, email in emails.items()}
        self.state: dict[str, Any] = {"calls": []}
        self.clients = {alias: ConsensusClient(alias, self.state) for alias in self.users}

    def login(self, alias: str) -> dict[str, str]:
        self.state["calls"].append((alias, "LOGIN", "", None))
        return {"token": alias}

    def client_for(self, alias: str) -> ConsensusClient:
        return self.clients[alias]


class TrackingManifestStore(ManifestStore):
    def __init__(self, path: Path) -> None:
        super().__init__(path)
        self.add_calls = 0

    def add(self, entry: Any) -> None:
        self.add_calls += 1
        super().add(entry)


def test_complete_fake_http_flow_validates_finished_weights_before_one_manifest_write(tmp_path: Path) -> None:
    sessions, store = ConsensusSessions(), TrackingManifestStore(tmp_path / "manifest.json")
    result = generate(sessions, store)
    assert result.issue_id == "issue" and store.add_calls == 1 and store.list_entries()[0].scenario_id == SCENARIO_ID
    calls = sessions.state["calls"]
    assert [call[0] for call in calls if call[1] == "LOGIN"] == ["owner", "expert_a", "expert_b"]
    assert sessions.state["creation"] == _payload(result.issue_name, "hv", ["a@example.test", "b@example.test"], "domain")
    assert len([call for call in calls if call[2].endswith("/evaluations/alternativeEvaluation")]) == 2
    assert not any("/evaluations/alternativeEvaluation/1" in call[2] for call in calls)
    assert not any(call[1] == "DELETE" for call in calls)


@pytest.mark.parametrize(
    "mutation, message",
    [
        (lambda detail: detail["models"]["base"]["effectiveParameters"].pop("beta"), "model and lifecycle"),
        (lambda detail: detail["criteria"]["finalWeights"]["byCriterionId"].update({"quality": 0.5}), "criteria weights"),
        (lambda detail: detail["criteria"]["finalWeights"]["byCriterionId"].update({"cost": 0.5}), "criteria weights"),
        (lambda detail: detail["criteria"]["finalWeights"]["source"].update({"kind": "wrong"}), "criteria weights"),
    ],
)
def test_finished_weight_contract_rejects_mismatches(mutation: Any, message: str) -> None:
    sessions = ConsensusSessions()
    sessions.state["creation"] = {"issueName": "[AUTO:test] Consensus · first round"}
    detail = sessions.clients["owner"]._finished()
    mutation(detail)
    with pytest.raises(ScenarioLabError, match=message):
        _validate_finished(
            detail, "issue", "[AUTO:test] Consensus · first round", _collective(_context(_context_payload(), "issue")), {"a@example.test", "b@example.test"}
        )


def test_failed_finished_weight_validation_does_not_write_manifest(tmp_path: Path) -> None:
    sessions, store = ConsensusSessions(), ManifestStore(tmp_path / "manifest.json")
    original = sessions.clients["owner"]._finished

    def invalid_finished() -> dict[str, Any]:
        detail = original()
        detail["criteria"]["finalWeights"]["byCriterionId"]["quality"] = 0.5
        return detail

    sessions.clients["owner"]._finished = invalid_finished  # type: ignore[method-assign]
    with pytest.raises(ScenarioLabError, match="after issue creation"):
        generate(sessions, store)
    assert store.list_entries() == []
