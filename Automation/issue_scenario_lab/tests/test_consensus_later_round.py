from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from issue_scenario_lab.config import UserCredentials
from issue_scenario_lab.errors import ScenarioLabError
from issue_scenario_lab.manifest.store import ManifestStore
from issue_scenario_lab.scenarios.consensus_first_round import PARAMETERS
from issue_scenario_lab.scenarios.consensus_later_round import (
    PHASE_ONE_FORWARD,
    PHASE_ONE_SCORES,
    PHASE_ZERO_FORWARD,
    SCENARIO_ID,
    _context,
    _matrix,
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
        "isMultiCriteria": False,
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


def _empty(phase: int, collective: dict[str, Any] | None = None) -> dict[str, Any]:
    alternatives = {"Balanced choice": "balanced", "Premium choice": "premium", "Budget choice": "budget"}
    matrix = {row: {column: {"value": ""} for column in alternatives.values() if column != row} for row in alternatives.values()}
    context = {
        "issue": {"id": "issue", "currentStage": "alternativeEvaluation", "isConsensus": True},
        "model": {"apiModelKey": "herrera_viedma_crp"},
        "alternatives": [{"id": value, "name": name} for name, value in alternatives.items()],
        "leafCriteria": [
            {
                "id": "overall",
                "name": "Overall preference",
                "type": "benefit",
                "expressionDomain": {"typeKey": "numericContinuous", "definition": {"min": 0, "max": 1}},
            }
        ],
        "consensus": {"phase": phase, "currentCollectiveEvaluations": {}, "previousCollectiveEvaluations": collective or {}},
    }
    return {
        "stage": "alternativeEvaluation",
        "structureKey": "alternativePairwiseByCriterion",
        "consensusPhase": phase,
        "completed": False,
        "submittedAt": None,
        "evaluationContext": context,
        "payload": {"overall": matrix},
        "collectiveReference": None if phase == 0 else {"consensusPhase": 0, "collectiveEvaluations": collective},
    }


class FakeClient:
    def __init__(self, alias: str, state: dict[str, Any]) -> None:
        self.alias, self.state = alias, state

    def request(self, method: str, path: str, *, json: Any = None) -> Any:
        self.state["calls"].append((self.alias, method, path, json))
        if path == "/issues/models":
            return {"models": [_model()]}
        if path == "/issues/users":
            return {
                "users": [
                    {"name": "Expert A", "university": "Test University", "email": "a@example.test"},
                    {"name": "Expert B", "university": "Test University", "email": "b@example.test"},
                ]
            }
        if path == "/issues/expression-domains":
            return {"globals": [{"id": "domain", "typeKey": "numericContinuous", "definition": {"min": 0, "max": 1}}], "userDomains": []}
        if path == "/issues" and method == "POST":
            self.state["name"] = json["issueInfo"]["issueName"]
            return {}
        if path == "/issues/active":
            return {"issues": [self._active()]}
        if path.endswith("/invitation-response"):
            return {}
        if path.endswith("/evaluations/alternativeEvaluation") and method == "GET":
            self.state["evaluation_get_phases"].append(self.state["phase"])
            return _empty(self.state["phase"], self._phase_zero_collective() if self.state["phase"] == 1 else None)
        if path.endswith("/submit"):
            self.state["evaluation_submit_phases"].append(self.state["phase"])
            return {
                "completed": True,
                "stage": "alternativeEvaluation",
                "structureKey": "alternativePairwiseByCriterion",
                "consensusPhase": self.state["phase"],
                "currentStage": "alternativeEvaluation",
            }
        if path.endswith("/compute"):
            self.state["compute_phases"].append(self.state["phase"])
            return self._compute()
        if path == "/issues/finished":
            self.state["finished_lookup_call_index"] = len(self.state["calls"]) - 1
            return {"issues": [{"id": "issue", "name": self.state["name"]}]}
        if path == "/issues/finished/issue":
            return self._finished()
        raise AssertionError(f"unexpected request {self.alias} {method} {path}")

    def _active(self) -> dict[str, Any]:
        return {
            "id": "issue",
            "name": self.state["name"],
            "currentStage": "alternativeEvaluation",
            "consensusCurrentPhase": self.state["phase"],
            "isConsensus": True,
            "simulateConsensus": False,
            "consensusThreshold": 0.9,
            "consensusMaxPhases": 3,
            "isIssueOwner": True,
            "evaluationStructureKey": "alternativePairwiseByCriterion",
            "criteriaWeightsStructureKey": "manualCriteriaWeights",
            "expertParticipants": [
                {"invitationStatus": "accepted", "evaluationCompleted": False, "expert": {"email": "a@example.test"}},
                {"invitationStatus": "accepted", "evaluationCompleted": False, "expert": {"email": "b@example.test"}},
            ],
            "progress": {"totalAccepted": 2, "evalsDone": 0},
        }

    def _phase_zero_collective(self) -> dict[str, Any]:
        return {
            "overall": {
                "balanced": {"premium": 0.42, "budget": 0.41},
                "premium": {"balanced": 0.42, "budget": 0.44},
                "budget": {"balanced": 0.41, "premium": 0.44},
            }
        }

    def _phase_one_collective(self) -> dict[str, Any]:
        return {
            "overall": {
                "balanced": {"premium": 0.63, "budget": 0.64},
                "premium": {"balanced": 0.37, "budget": 0.64},
                "budget": {"balanced": 0.36, "premium": 0.35},
            }
        }

    def _result(self, phase: int) -> dict[str, Any]:
        reached = phase == 1
        collective = self._phase_one_collective() if reached else self._phase_zero_collective()
        names = ["Balanced choice", "Premium choice", "Budget choice"] if reached else ["Premium choice", "Budget choice", "Balanced choice"]
        ids = {"Balanced choice": "balanced", "Premium choice": "premium", "Budget choice": "budget"}
        scores = list(PHASE_ONE_SCORES) if reached else [0.4133, 0.4266, 0.4199]
        score_by_name = dict(zip(("Balanced choice", "Premium choice", "Budget choice"), scores, strict=True))
        lifecycle = {
            "consensusReached": reached,
            "maxPhasesReached": False,
            "finalizationReason": "consensusReached" if reached else None,
            "currentConsensusPhase": phase,
            "nextConsensusPhase": phase if reached else 1,
            "threshold": 0.9,
            "maxPhases": 3,
            "consensusMeasure": 1.0 if reached else 0.5,
        }
        suggestion_matrix = {
            "balanced": {"premium": {"value": 0.8}, "budget": {"value": 0.8}},
            "premium": {"balanced": {"value": 0.2}, "budget": {"value": 0.7}},
            "budget": {"balanced": {"value": 0.2}, "premium": {"value": 0.3}},
        }
        suggestions = (
            {}
            if reached
            else {
                "expert-a-id": {"payload": {"overall": suggestion_matrix}},
                "expert-b-id": {"payload": {"overall": suggestion_matrix}},
            }
        )
        return {
            "consensusMeasure": lifecycle["consensusMeasure"],
            "rankedAlternatives": [
                {"alternativeId": ids[name], "name": name, "score": score_by_name[name], "rank": index + 1} for index, name in enumerate(names)
            ],
            "collectiveEvaluations": collective,
            "consensusLifecycle": lifecycle,
            "rawOutput": {
                "cm": lifecycle["consensusMeasure"],
                "collective_scores": scores,
                "collective_evaluations": collective,
                "suggested_next_evaluations": suggestions,
            },
        }

    def _compute(self) -> dict[str, Any]:
        phase = self.state["phase"]
        result = self._result(phase)
        if phase == 0:
            self.state["phase"] = 1
        return {
            "stage": "alternativeEvaluation",
            "structureKey": "alternativePairwiseByCriterion",
            "consensusPhase": self.state["phase"],
            "currentStage": "finished" if phase == 1 else "alternativeEvaluation",
            "result": result,
        }

    def _finished(self) -> dict[str, Any]:
        zero, one = self._result(0), self._result(1)

        def phase(phase_number: int, result: dict[str, Any]) -> dict[str, Any]:
            return {
                "id": f"phase-{phase_number}",
                "stage": "alternativeEvaluation",
                "phase": phase_number,
                "consensusMeasure": result["consensusMeasure"],
                "rankedAlternatives": result["rankedAlternatives"],
                "modelSpecificOutput": {"consensusLifecycle": result["consensusLifecycle"]},
                "rawOutput": result["rawOutput"],
            }

        return {
            "issue": {"id": "issue", "name": self.state["name"]},
            "lifecycle": {"currentStage": "finished", "active": False},
            "models": {
                "base": {
                    "technical": {"apiModelKey": "herrera_viedma_crp"},
                    "evaluationStructureKey": "alternativePairwiseByCriterion",
                    "effectiveParameters": {**PARAMETERS, "weights": {"overall": 1.0}},
                },
                "criteriaWeighting": None,
            },
            "consensus": {
                "enabled": True,
                "simulated": False,
                "threshold": 0.9,
                "maxPhases": 3,
                "finalPhase": 1,
                "reachedPhase": 1,
                "finalizationReason": "consensusReached",
                "rounds": [{"phase": 0}, {"phase": 1}],
            },
            "criteria": {
                "nodes": [
                    {"id": "root", "name": "Decision factors", "type": "group", "isLeaf": False},
                    {"id": "overall", "name": "Overall preference", "type": "benefit", "isLeaf": True},
                ],
                "finalWeights": {"source": {"kind": "directModelParameters", "stageResultId": None}, "byCriterionId": {"overall": 1.0}},
            },
            "participants": [
                {"invitationStatus": "accepted", "evaluationCompleted": True, "expert": {"id": "expert-a-id", "email": "a@example.test"}},
                {"invitationStatus": "accepted", "evaluationCompleted": True, "expert": {"id": "expert-b-id", "email": "b@example.test"}},
            ],
            "participantHistory": {
                "summary": {"total": 2, "participated": 2, "notParticipated": 0, "participatedPercentage": 100},
                "records": [
                    {"participated": True, "participationKey": "participated", "weight": None, "expert": {"id": "expert-a-id", "email": "a@example.test"}},
                    {"participated": True, "participationKey": "participated", "weight": None, "expert": {"id": "expert-b-id", "email": "b@example.test"}},
                ],
            },
            "evaluations": {
                "individual": [
                    {
                        "expertId": expert,
                        "stage": "alternativeEvaluation",
                        "phase": phase_number,
                        "completed": True,
                        "structureKey": "alternativePairwiseByCriterion",
                        "submittedAt": "now",
                    }
                    for phase_number in (0, 1)
                    for expert in ("expert-a-id", "expert-b-id")
                ],
                "contexts": [{"stage": "alternativeEvaluation", "phase": 0}, {"stage": "alternativeEvaluation", "phase": 1}],
                "collective": [
                    {"stage": "alternativeEvaluation", "phase": 0, "phaseResultId": "phase-0", "rawPayload": zero["collectiveEvaluations"]},
                    {"stage": "alternativeEvaluation", "phase": 1, "phaseResultId": "phase-1", "rawPayload": one["collectiveEvaluations"]},
                ],
            },
            "phaseResults": [phase(0, zero), phase(1, one)],
        }


class FakeSessions:
    def __init__(self) -> None:
        self.users = {
            alias: UserCredentials(email=email, password="secret")
            for alias, email in {"owner": "owner@example.test", "expert_a": "a@example.test", "expert_b": "b@example.test"}.items()
        }
        self.state: dict[str, Any] = {
            "calls": [],
            "phase": 0,
            "evaluation_get_phases": [],
            "evaluation_submit_phases": [],
            "compute_phases": [],
        }
        self.clients = {alias: FakeClient(alias, self.state) for alias in self.users}

    def login(self, alias: str) -> dict[str, str]:
        self.state["calls"].append((alias, "LOGIN", "", None))
        return {"token": alias}

    def client_for(self, alias: str) -> FakeClient:
        return self.clients[alias]


def test_two_round_fake_http_flow_writes_manifest_after_finished_validation(tmp_path: Path) -> None:
    sessions, store = FakeSessions(), ManifestStore(tmp_path / "manifest.json")
    result = generate(sessions, store)
    calls = sessions.state["calls"]
    assert result.issue_id == "issue" and store.list_entries()[0].scenario_id == SCENARIO_ID
    assert [call[0] for call in calls if call[1] == "LOGIN"] == ["owner", "expert_a", "expert_b"]
    assert [call[2] for call in calls if call[2].endswith("/compute")] == ["/issues/issue/evaluations/alternativeEvaluation/compute"] * 2
    assert sessions.state["evaluation_get_phases"] == [0, 0, 1, 1]
    assert sessions.state["evaluation_submit_phases"] == [0, 0, 1, 1]
    assert sessions.state["compute_phases"] == [0, 1]
    assert sessions.state["phase"] == 1
    final_compute_index = max(index for index, call in enumerate(calls) if call[2].endswith("/compute"))
    assert calls[final_compute_index + 1][2] == "/issues/finished"
    assert sessions.state["finished_lookup_call_index"] == final_compute_index + 1
    assert not any(call[2].endswith("/evaluations/alternativeEvaluation") or call[2].endswith("/submit") for call in calls[final_compute_index + 1 :])


def test_idless_catalogue_still_requires_each_configured_expert_email_before_creation(tmp_path: Path) -> None:
    sessions, store = FakeSessions(), ManifestStore(tmp_path / "manifest.json")
    owner = sessions.clients["owner"]
    original_request = owner.request

    def missing_expert(method: str, path: str, *, json: Any = None) -> Any:
        if path == "/issues/users":
            return {"users": [{"name": "Expert A", "university": "Test University", "email": "a@example.test"}]}
        return original_request(method, path, json=json)

    owner.request = missing_expert  # type: ignore[method-assign]
    with pytest.raises(ScenarioLabError, match="absent from the Backend user catalogue"):
        generate(sessions, store)
    assert not any(call[1] == "POST" and call[2] == "/issues" for call in sessions.state["calls"])
    assert store.list_entries() == []


def test_duplicate_configured_expert_email_fails_before_creation(tmp_path: Path) -> None:
    sessions, store = FakeSessions(), ManifestStore(tmp_path / "manifest.json")
    sessions.users["expert_b"] = UserCredentials(email="a@example.test", password="secret")

    with pytest.raises(ScenarioLabError, match="emails must be distinct"):
        generate(sessions, store)
    assert not any(call[1] == "POST" and call[2] == "/issues" for call in sessions.state["calls"])
    assert store.list_entries() == []


@pytest.mark.parametrize("keys", [("", "expert-b-id"), ("expert_a", "expert-b-id"), ("a@example.test", "expert-b-id"), ("expert-a-id",)])
def test_phase_zero_suggestion_identity_shape_is_rejected_without_a_manifest(tmp_path: Path, keys: tuple[str, ...]) -> None:
    sessions, store = FakeSessions(), ManifestStore(tmp_path / "manifest.json")
    owner = sessions.clients["owner"]
    original_result = owner._result

    def invalid_suggestions(phase: int) -> dict[str, Any]:
        result = original_result(phase)
        if phase == 0:
            suggestion = next(iter(result["rawOutput"]["suggested_next_evaluations"].values()))
            result["rawOutput"]["suggested_next_evaluations"] = {key: suggestion for key in keys}
        return result

    owner._result = invalid_suggestions  # type: ignore[method-assign]
    with pytest.raises(ScenarioLabError, match="phase-zero suggestions"):
        generate(sessions, store)
    assert store.list_entries() == []


def test_phase_zero_suggestion_payload_shape_remains_required(tmp_path: Path) -> None:
    sessions, store = FakeSessions(), ManifestStore(tmp_path / "manifest.json")
    owner = sessions.clients["owner"]
    original_result = owner._result

    def missing_payload(phase: int) -> dict[str, Any]:
        result = original_result(phase)
        if phase == 0:
            result["rawOutput"]["suggested_next_evaluations"]["expert-a-id"] = {}
        return result

    owner._result = missing_payload  # type: ignore[method-assign]
    with pytest.raises(ScenarioLabError, match="suggestion payload"):
        generate(sessions, store)
    assert store.list_entries() == []


@pytest.mark.parametrize("keys", [("expert-a-id", "unknown-expert-id"), ("unknown-a", "unknown-b")])
def test_finished_cross_checks_phase_zero_suggestion_ids_against_participants(tmp_path: Path, keys: tuple[str, str]) -> None:
    sessions, store = FakeSessions(), ManifestStore(tmp_path / "manifest.json")
    owner = sessions.clients["owner"]
    original_result = owner._result

    def unknown_suggestions(phase: int) -> dict[str, Any]:
        result = original_result(phase)
        if phase == 0:
            suggestion = next(iter(result["rawOutput"]["suggested_next_evaluations"].values()))
            result["rawOutput"]["suggested_next_evaluations"] = {key: suggestion for key in keys}
        return result

    owner._result = unknown_suggestions  # type: ignore[method-assign]
    with pytest.raises(ScenarioLabError, match="finished consensus suggestion identities"):
        generate(sessions, store)
    assert store.list_entries() == []


def test_finished_reconciles_live_phase_zero_suggestion_keys_with_its_raw_output(tmp_path: Path) -> None:
    sessions, store = FakeSessions(), ManifestStore(tmp_path / "manifest.json")
    owner = sessions.clients["owner"]
    original_compute = owner._compute

    def mismatched_compute() -> dict[str, Any]:
        response = original_compute()
        if response["consensusPhase"] == 1 and response["currentStage"] == "alternativeEvaluation":
            suggestions = response["result"]["rawOutput"]["suggested_next_evaluations"]
            suggestion = next(iter(suggestions.values()))
            response["result"]["rawOutput"]["suggested_next_evaluations"] = {"expert-a-id": suggestion, "expert-b-mismatch": suggestion}
        return response

    owner._compute = mismatched_compute  # type: ignore[method-assign]
    with pytest.raises(ScenarioLabError, match="finished consensus suggestion identities"):
        generate(sessions, store)
    assert store.list_entries() == []


@pytest.mark.parametrize("mutation", ["missing-id", "duplicate-id", "evaluation-id", "phase-one-suggestions"])
def test_finished_identity_contract_mismatches_do_not_write_a_manifest(tmp_path: Path, mutation: str) -> None:
    sessions, store = FakeSessions(), ManifestStore(tmp_path / "manifest.json")
    owner = sessions.clients["owner"]
    original_finished = owner._finished

    def invalid_finished() -> dict[str, Any]:
        detail = original_finished()
        if mutation == "missing-id":
            detail["participants"][0]["expert"].pop("id")
        elif mutation == "duplicate-id":
            detail["participants"][1]["expert"]["id"] = "expert-a-id"
        elif mutation == "evaluation-id":
            detail["evaluations"]["individual"][0]["expertId"] = "unknown-expert-id"
        else:
            detail["phaseResults"][1]["rawOutput"]["suggested_next_evaluations"] = {"expert-a-id": {}}
        return detail

    owner._finished = invalid_finished  # type: ignore[method-assign]
    with pytest.raises(ScenarioLabError):
        generate(sessions, store)
    assert store.list_entries() == []


def test_phase_matrices_are_complete_reciprocal_and_distinct() -> None:
    context = _context(_empty(0), "issue", 0)
    zero = [_matrix(context, values) for values in PHASE_ZERO_FORWARD]
    one = [_matrix(context, values) for values in PHASE_ONE_FORWARD]
    assert zero[0] != zero[1] and one[0] != one[1]
    assert set(zero[0]) == {"overall"} and set(one[0]) == {"overall"}


def test_phase_one_scores_are_derived_from_unrounded_owa_and_qgdd_values() -> None:
    expert_weights, alternative_weights = (0.4, 0.6), (0.0, 0.33, 0.67)
    first, second = PHASE_ONE_FORWARD

    def expert_owa(values: tuple[float, float]) -> float:
        return sum(weight * value for weight, value in zip(expert_weights, sorted(values, reverse=True), strict=True))

    balanced_premium = expert_owa((first[0], second[0]))
    balanced_budget = expert_owa((first[1], second[1]))
    premium_budget = expert_owa((first[2], second[2]))
    premium_balanced = expert_owa((1 - first[0], 1 - second[0]))
    budget_balanced = expert_owa((1 - first[1], 1 - second[1]))
    budget_premium = expert_owa((1 - first[2], 1 - second[2]))
    collective = (
        (0.5, balanced_premium, balanced_budget),
        (premium_balanced, 0.5, premium_budget),
        (budget_balanced, budget_premium, 0.5),
    )
    scores = tuple(round(sum(weight * value for weight, value in zip(alternative_weights, sorted(row, reverse=True), strict=True)), 5) for row in collective)

    assert scores == (0.54224, 0.41156, 0.35532)
    assert PHASE_ONE_SCORES == scores
    assert sorted(range(len(scores)), key=scores.__getitem__, reverse=True) == [0, 1, 2]
    assert (round(balanced_premium, 2), round(balanced_budget, 2), round(premium_budget, 2)) == (0.63, 0.64, 0.64)
    assert (round(premium_balanced, 2), round(budget_balanced, 2), round(budget_premium, 2)) == (0.37, 0.36, 0.35)


def test_old_phase_one_scores_are_rejected_without_writing_manifest(tmp_path: Path) -> None:
    sessions, store = FakeSessions(), ManifestStore(tmp_path / "manifest.json")
    original = sessions.clients["owner"]._result

    def old_scores(phase: int) -> dict[str, Any]:
        result = original(phase)
        if phase == 1:
            result["rawOutput"]["collective_scores"] = [0.53564, 0.42496, 0.241]
        return result

    sessions.clients["owner"]._result = old_scores  # type: ignore[method-assign]
    with pytest.raises(ScenarioLabError, match="consensus raw output is incompatible"):
        generate(sessions, store)
    assert store.list_entries() == []


def test_phase_transition_failure_does_not_write_manifest(tmp_path: Path) -> None:
    sessions, store = FakeSessions(), ManifestStore(tmp_path / "manifest.json")
    original = sessions.clients["owner"]._compute

    def broken() -> dict[str, Any]:
        response = original()
        if response["consensusPhase"] == 1 and response["currentStage"] == "alternativeEvaluation":
            response["result"]["consensusLifecycle"]["nextConsensusPhase"] = 2
        return response

    sessions.clients["owner"]._compute = broken  # type: ignore[method-assign]
    with pytest.raises(ScenarioLabError, match="after issue creation"):
        generate(sessions, store)
    assert store.list_entries() == []
