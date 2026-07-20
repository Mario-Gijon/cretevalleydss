from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from issue_scenario_lab.config import UserCredentials
from issue_scenario_lab.errors import ScenarioLabError
from issue_scenario_lab.manifest.store import ManifestStore
from issue_scenario_lab.scenarios.consensus_first_round import PARAMETERS
from issue_scenario_lab.scenarios.consensus_max_rounds import (
    PHASE_COLLECTIVE_VALUES,
    PHASE_FORWARDS,
    PHASE_MEASURES,
    PHASE_RANKINGS,
    PHASE_SCORES,
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


def _collective(phase: int) -> dict[str, Any]:
    bp, pb, bu, ub, pu, up = PHASE_COLLECTIVE_VALUES[phase]
    return {"overall": {"balanced": {"premium": bp, "budget": bu}, "premium": {"balanced": pb, "budget": pu}, "budget": {"balanced": ub, "premium": up}}}


def _empty(phase: int) -> dict[str, Any]:
    ids = {"Balanced choice": "balanced", "Premium choice": "premium", "Budget choice": "budget"}
    matrix = {row: {column: {"value": ""} for column in ids.values() if column != row} for row in ids.values()}
    previous = _collective(phase - 1) if phase else {}
    return {
        "stage": "alternativeEvaluation",
        "structureKey": "alternativePairwiseByCriterion",
        "consensusPhase": phase,
        "completed": False,
        "submittedAt": None,
        "evaluationContext": {
            "issue": {"id": "issue", "currentStage": "alternativeEvaluation", "isConsensus": True},
            "model": {"apiModelKey": "herrera_viedma_crp"},
            "alternatives": [{"id": value, "name": name} for name, value in ids.items()],
            "leafCriteria": [
                {
                    "id": "overall",
                    "name": "Overall preference",
                    "type": "benefit",
                    "expressionDomain": {"typeKey": "numericContinuous", "definition": {"min": 0, "max": 1}},
                }
            ],
            "consensus": {"phase": phase, "currentCollectiveEvaluations": {}, "previousCollectiveEvaluations": previous},
        },
        "payload": {"overall": matrix},
        "collectiveReference": None if phase == 0 else {"consensusPhase": phase - 1, "collectiveEvaluations": previous},
    }


class FakeClient:
    def __init__(self, alias: str, state: dict[str, Any]) -> None:
        self.alias, self.state = alias, state

    def request(self, method: str, path: str, *, json: Any = None) -> Any:
        self.state["calls"].append((self.alias, method, path, json))
        if path == "/issues/models":
            return {"models": [_model()]}
        if path == "/issues/users":
            return {"users": [{"email": "a@example.test"}, {"email": "b@example.test"}]}
        if path == "/issues/expression-domains":
            return {"globals": [{"id": "domain", "typeKey": "numericContinuous", "definition": {"min": 0, "max": 1}}], "userDomains": []}
        if path == "/issues" and method == "POST":
            self.state["name"] = json["issueInfo"]["issueName"]
            self.state["creation"] = json["issueInfo"]
            return {}
        if path == "/issues/active":
            return {"issues": [self._active()]}
        if path.endswith("/invitation-response"):
            return {}
        if path.endswith("/evaluations/alternativeEvaluation") and method == "GET":
            phase = self.state["phase"]
            self.state["gets"].append((self.alias, phase))
            return _empty(phase)
        if path.endswith("/submit"):
            phase = self.state["phase"]
            self.state["submits"].append((self.alias, phase, json["payload"]))
            return {
                "completed": True,
                "stage": "alternativeEvaluation",
                "structureKey": "alternativePairwiseByCriterion",
                "consensusPhase": phase,
                "currentStage": "alternativeEvaluation",
            }
        if path.endswith("/compute"):
            phase = self.state["phase"]
            self.state["computes"].append(phase)
            response = self._compute(phase)
            if phase < 3:
                self.state["phase"] += 1
            return response
        if path == "/issues/finished":
            self.state["finished_index"] = len(self.state["calls"]) - 1
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

    def _result(self, phase: int) -> dict[str, Any]:
        ids = {"Balanced choice": "balanced", "Premium choice": "premium", "Budget choice": "budget"}
        scores = PHASE_SCORES[phase]
        score_by_name = dict(zip(("Balanced choice", "Premium choice", "Budget choice"), scores, strict=True))
        final = phase == 3
        lifecycle = {
            "consensusReached": False,
            "maxPhasesReached": final,
            "finalizationReason": "maxPhasesReached" if final else None,
            "currentConsensusPhase": phase,
            "nextConsensusPhase": 3 if final else phase + 1,
            "threshold": 0.9,
            "maxPhases": 3,
            "consensusMeasure": PHASE_MEASURES[phase],
        }
        suggestion_matrix = {
            "balanced": {"premium": {"value": 0.8}, "budget": {"value": 0.8}},
            "premium": {"balanced": {"value": 0.2}, "budget": {"value": 0.7}},
            "budget": {"balanced": {"value": 0.2}, "premium": {"value": 0.3}},
        }
        suggestions = {"expert-a-id": {"payload": {"overall": suggestion_matrix}}, "expert-b-id": {"payload": {"overall": suggestion_matrix}}}
        plots = {"expert_points": [[0.1, -0.1], [-0.1, 0.1]], "collective_point": [0.0, 0.0]}
        collective = _collective(phase)
        return {
            "consensusMeasure": PHASE_MEASURES[phase],
            "rankedAlternatives": [
                {"alternativeId": ids[name], "name": name, "score": score_by_name[name], "rank": index + 1} for index, name in enumerate(PHASE_RANKINGS[phase])
            ],
            "collectiveEvaluations": collective,
            "plotsGraphic": plots,
            "consensusLifecycle": lifecycle,
            "rawOutput": {
                "cm": PHASE_MEASURES[phase],
                "collective_scores": list(scores),
                "collective_evaluations": collective,
                "plots_graphic": plots,
                "suggested_next_evaluations": suggestions,
            },
        }

    def _compute(self, phase: int) -> dict[str, Any]:
        return {
            "stage": "alternativeEvaluation",
            "structureKey": "alternativePairwiseByCriterion",
            "consensusPhase": 3 if phase == 3 else phase + 1,
            "currentStage": "finished" if phase == 3 else "alternativeEvaluation",
            "result": self._result(phase),
        }

    def _finished(self) -> dict[str, Any]:
        results = [self._result(phase) for phase in range(4)]

        def evaluation_context(phase: int) -> dict[str, Any]:
            serialized = _empty(phase)["evaluationContext"]
            return {
                "stage": "alternativeEvaluation",
                "phase": phase,
                "structureKey": "alternativePairwiseByCriterion",
                "modelId": "hv",
                "activeModelId": "hv",
                "alternativeIds": ["balanced", "premium", "budget"],
                "criterionIds": ["overall"],
                "serializedContext": serialized,
            }

        def phase_result(phase: int) -> dict[str, Any]:
            result = results[phase]
            return {
                "id": f"phase-{phase}",
                "stage": "alternativeEvaluation",
                "phase": phase,
                "consensusMeasure": result["consensusMeasure"],
                "rankedAlternatives": result["rankedAlternatives"],
                "plotsGraphic": result["plotsGraphic"],
                "modelSpecificOutput": {"consensusLifecycle": result["consensusLifecycle"]},
                "rawOutput": result["rawOutput"],
            }

        individual = []
        for phase in range(4):
            context = _empty(phase)["evaluationContext"]
            for expert_index, expert in enumerate(("expert-a-id", "expert-b-id")):
                individual.append(
                    {
                        "expertId": expert,
                        "stage": "alternativeEvaluation",
                        "phase": phase,
                        "completed": True,
                        "structureKey": "alternativePairwiseByCriterion",
                        "submittedAt": "now",
                        "rawPayload": _matrix(context, PHASE_FORWARDS[phase][expert_index]),
                    }
                )

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
                "modelSupportsConsensus": True,
                "simulated": False,
                "threshold": 0.9,
                "maxPhases": 3,
                "finalPhase": 3,
                "reachedPhase": None,
                "finalizationReason": "maxPhasesReached",
                "rounds": [{"phase": phase, "phaseResultId": f"phase-{phase}"} for phase in range(4)],
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
                    {"participated": True, "participationKey": "participated", "weight": None, "expert": {"id": "expert-a-id"}},
                    {"participated": True, "participationKey": "participated", "weight": None, "expert": {"id": "expert-b-id"}},
                ],
            },
            "evaluations": {
                "individual": individual,
                "contexts": [evaluation_context(phase) for phase in range(4)],
                "collective": [
                    {"stage": "alternativeEvaluation", "phase": phase, "phaseResultId": f"phase-{phase}", "rawPayload": results[phase]["collectiveEvaluations"]}
                    for phase in range(4)
                ],
            },
            "phaseResults": [phase_result(phase) for phase in range(4)],
        }


class FakeSessions:
    def __init__(self) -> None:
        self.users = {
            alias: UserCredentials(email=email, password="secret")
            for alias, email in {"owner": "owner@example.test", "expert_a": "a@example.test", "expert_b": "b@example.test"}.items()
        }
        self.state: dict[str, Any] = {"calls": [], "phase": 0, "gets": [], "submits": [], "computes": []}
        self.clients = {alias: FakeClient(alias, self.state) for alias in self.users}

    def login(self, alias: str) -> dict[str, str]:
        self.state["calls"].append((alias, "LOGIN", "", None))
        return {"token": alias}

    def client_for(self, alias: str) -> FakeClient:
        return self.clients[alias]


def test_four_round_flow_validates_finished_evidence_before_manifest(tmp_path: Path) -> None:
    sessions, store = FakeSessions(), ManifestStore(tmp_path / "manifest.json")
    result = generate(sessions, store)
    calls = sessions.state["calls"]
    assert result.issue_id == "issue"
    assert store.list_entries()[0].scenario_id == SCENARIO_ID
    assert sessions.state["gets"] == [(alias, phase) for phase in range(4) for alias in ("expert_a", "expert_b")]
    assert [phase for _, phase, _ in sessions.state["submits"]] == [0, 0, 1, 1, 2, 2, 3, 3]
    assert sessions.state["computes"] == [0, 1, 2, 3]
    assert sessions.state["phase"] == 3
    assert [call[0] for call in calls if call[1] == "LOGIN"] == ["owner", "expert_a", "expert_b"]
    assert all(
        call[0] == "owner"
        for call in calls
        if call[2]
        in {"/issues/models", "/issues/users", "/issues/expression-domains", "/issues", "/issues/active", "/issues/finished", "/issues/finished/issue"}
        or call[2].endswith("/compute")
    )
    assert sessions.state["creation"]["simulateConsensus"] is False
    assert sessions.state["creation"]["consensusThreshold"] == 0.9 and sessions.state["creation"]["consensusMaxPhases"] == 3
    final_compute = max(index for index, call in enumerate(calls) if call[2].endswith("/compute"))
    assert calls[final_compute + 1][2] == "/issues/finished"
    assert not any("/evaluations/alternativeEvaluation" in call[2] for call in calls[final_compute + 1 :])
    expected = [
        ("owner", "LOGIN", ""),
        ("expert_a", "LOGIN", ""),
        ("expert_b", "LOGIN", ""),
        ("owner", "GET", "/issues/models"),
        ("owner", "GET", "/issues/users"),
        ("owner", "GET", "/issues/expression-domains"),
        ("owner", "POST", "/issues"),
        ("owner", "GET", "/issues/active"),
        ("expert_a", "POST", "/issues/issue/invitation-response"),
        ("expert_b", "POST", "/issues/issue/invitation-response"),
    ]
    for phase in range(4):
        expected.extend(
            [
                ("expert_a", "GET", "/issues/issue/evaluations/alternativeEvaluation"),
                ("expert_b", "GET", "/issues/issue/evaluations/alternativeEvaluation"),
                ("expert_a", "POST", "/issues/issue/evaluations/alternativeEvaluation/submit"),
                ("expert_b", "POST", "/issues/issue/evaluations/alternativeEvaluation/submit"),
                ("owner", "POST", "/issues/issue/evaluations/alternativeEvaluation/compute"),
            ]
        )
        if phase < 3:
            expected.append(("owner", "GET", "/issues/active"))
    expected.extend([("owner", "GET", "/issues/finished"), ("owner", "GET", "/issues/finished/issue")])
    assert [(alias, method, path) for alias, method, path, _ in calls] == expected


def test_all_four_matrix_pairs_are_complete_reciprocal_and_distinct() -> None:
    context = _context(_empty(0), "issue", 0)
    for values in PHASE_FORWARDS:
        first, second = (_matrix(context, value) for value in values)
        assert first != second
        assert set(first) == {"overall"}
    assert PHASE_MEASURES == (0.50, 0.65, 0.73, 0.80)
    assert all(left < right < 0.9 for left, right in zip(PHASE_MEASURES, PHASE_MEASURES[1:], strict=False))


def test_creation_payload_and_idless_user_catalogue_are_supported(tmp_path: Path) -> None:
    sessions, store = FakeSessions(), ManifestStore(tmp_path / "manifest.json")
    generate(sessions, store)
    payload = sessions.state["creation"]
    assert payload["criteriaWeightingConfig"]["payload"] == {"weightsByCriterion": {"criterion-overall": 1.0}}
    assert payload["addedExperts"] == ["a@example.test", "b@example.test"]
    assert payload["paramValues"] == PARAMETERS


@pytest.mark.parametrize("mutation", ["transition", "previous", "finished-phase", "phase-four"])
def test_contract_mismatches_do_not_write_manifest(tmp_path: Path, mutation: str) -> None:
    sessions, store = FakeSessions(), ManifestStore(tmp_path / "manifest.json")
    owner = sessions.clients["owner"]
    if mutation == "transition":
        original = owner._compute

        def broken(phase: int) -> dict[str, Any]:
            response = original(phase)
            if phase == 2:
                response["result"]["consensusLifecycle"]["nextConsensusPhase"] = 2
            return response

        owner._compute = broken  # type: ignore[method-assign]
    elif mutation == "previous":
        expert = sessions.clients["expert_a"]
        original = expert.request

        def broken(method: str, path: str, *, json: Any = None) -> Any:
            response = original(method, path, json=json)
            if method == "GET" and path.endswith("/evaluations/alternativeEvaluation") and sessions.state["phase"] == 2:
                response["collectiveReference"]["consensusPhase"] = 0
            return response

        expert.request = broken  # type: ignore[method-assign]
    else:
        original = owner._finished

        def broken() -> dict[str, Any]:
            detail = original()
            if mutation == "finished-phase":
                detail["phaseResults"].pop()
            else:
                detail["phaseResults"].append({"id": "phase-4", "stage": "alternativeEvaluation", "phase": 4})
            return detail

        owner._finished = broken  # type: ignore[method-assign]
    with pytest.raises(ScenarioLabError):
        generate(sessions, store)
    assert store.list_entries() == []
