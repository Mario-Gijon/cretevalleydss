from __future__ import annotations

from copy import deepcopy
from pathlib import Path
from typing import Any

import pytest

from issue_scenario_lab.config import UserCredentials
from issue_scenario_lab.errors import ScenarioLabError
from issue_scenario_lab.manifest.store import ManifestStore
from issue_scenario_lab.scenarios import topsis_sort_2016_rich as scenario

FIXTURE = scenario.load_fixture()
CRITERION_IDS = {item["key"]: f"mongo-criterion-{item['key']}" for item in FIXTURE["criteria"]}
ALTERNATIVE_IDS = {item["key"]: f"mongo-alternative-{item['key']}" for item in FIXTURE["alternatives"]}
MODEL = {
    "id": "mongo-topsis-sort",
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
WEIGHTING_MODEL = {
    "id": "mongo-manual-weights",
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
EXPERT_EMAILS = {"expert_a": "a@example.test", "expert_b": "b@example.test", "expert_c": "c@example.test", "expert_d": "d@example.test"}
EXPERT_IDS = {alias: f"mongo-{alias}" for alias in EXPERT_EMAILS}


def _criteria_by_name() -> list[dict[str, Any]]:
    return [
        {
            "id": CRITERION_IDS[item["key"]],
            "name": item["name"],
            "type": item["type"],
            "expressionDomain": {"typeKey": "numericDiscrete", "definition": {"min": 1, "max": 10, "step": 1}},
        }
        for item in FIXTURE["criteria"]
    ]


def _alternatives_by_name() -> list[dict[str, str]]:
    return [{"id": ALTERNATIVE_IDS[item["key"]], "name": item["name"]} for item in FIXTURE["alternatives"]]


def test_fixture_has_six_leaf_criteria_ten_alternatives_and_four_distinct_experts() -> None:
    scenario.validate_fixture(FIXTURE)
    assert len(FIXTURE["criteria"]) == 6
    assert len(FIXTURE["alternatives"]) == 10
    assert len(FIXTURE["weightsByExpert"]) == len(FIXTURE["evaluationMatricesByExpert"]) == 4
    assert len(FIXTURE["orderedCategories"]) == 5
    assert len(FIXTURE["boundaryProfiles"]["profiles"]) == 4
    assert len({str(value) for value in FIXTURE["evaluationMatricesByExpert"].values()}) == 4


@pytest.mark.parametrize(
    "mutation",
    [
        lambda fixture: fixture["alternatives"].pop(),
        lambda fixture: fixture["evaluationMatricesByExpert"]["expert_c"].pop("granite_systems"),
        lambda fixture: fixture["weightsByExpert"]["expert_b"].update({"quality": 0.9}),
        lambda fixture: fixture["boundaryProfiles"]["profiles"][2]["valuesByCriterionId"].update({"purchase_cost": 8}),
    ],
)
def test_fixture_rejects_incomplete_matrices_weights_and_profiles(mutation: Any) -> None:
    invalid = deepcopy(FIXTURE)
    mutation(invalid)
    with pytest.raises(ScenarioLabError):
        scenario.validate_fixture(invalid)


def test_issue_payload_uses_only_leaf_criteria_and_expert_manual_weighting() -> None:
    payload = scenario._issue_payload("rich test", MODEL["id"], list(EXPERT_EMAILS.values()), "numeric-domain", FIXTURE)
    assert len(payload["criteria"]) == 6
    assert all(criterion["children"] == [] for criterion in payload["criteria"])
    assert payload["criteriaWeightingConfig"] == {
        "mode": "expertManual",
        "source": "experts",
        "method": "manual",
        "structureKey": "manualCriteriaWeights",
        "level": "leaf",
        "payload": {},
    }
    assert payload["isConsensus"] is False and payload["simulateConsensus"] is False
    assert len(payload["paramValues"]["boundaryProfiles"]["profiles"]) == 4
    assert all(
        set(profile["valuesByCriterionId"]) == {f"criterion-{key}" for key in CRITERION_IDS}
        for profile in payload["paramValues"]["boundaryProfiles"]["profiles"]
    )
    assert "weightsByCriterion" not in payload["criteriaWeightingConfig"]["payload"]


def test_weight_context_remaps_each_expert_vector_to_persisted_ids() -> None:
    response = {
        "stage": "criteriaWeighting",
        "structureKey": "manualCriteriaWeights",
        "consensusPhase": 0,
        "completed": False,
        "decisionContext": {
            "issue": {"id": "issue-id", "currentStage": "criteriaWeighting", "isConsensus": False},
            "structure": {"key": "manualCriteriaWeights", "stage": "criteriaWeighting"},
            "model": {"apiModelKey": "manual_criteria_weights"},
            "leafCriteria": _criteria_by_name(),
        },
        "payload": {"weightsByCriterion": {value: "" for value in CRITERION_IDS.values()}},
    }
    context, identity = scenario._weight_context(response, "issue-id", FIXTURE)
    assert len(identity) == 6
    a_payload = scenario._weight_payload(context, FIXTURE, "expert_a")
    c_payload = scenario._weight_payload(context, FIXTURE, "expert_c")
    assert set(a_payload["weightsByCriterion"]) == set(CRITERION_IDS.values())
    assert a_payload != c_payload
    assert sum(a_payload["weightsByCriterion"].values()) == pytest.approx(1)


def test_domain_preflight_covers_all_expert_cells_and_profiles() -> None:
    domains = {
        "globals": [{"id": "numeric-domain", "typeKey": "numericDiscrete", "definition": {"min": 1, "max": 10, "step": 1}}],
        "userDomains": [],
    }
    domain = scenario._compatible_domain(domains, {"numericDiscrete", "numericContinuous"}, FIXTURE)
    assert domain["id"] == "numeric-domain"
    domains["globals"][0]["definition"]["max"] = 9
    with pytest.raises(ScenarioLabError, match="no compatible numeric expression domain"):
        scenario._compatible_domain(domains, {"numericDiscrete"}, FIXTURE)


def test_offline_mcc_topsis_analysis_and_projection_are_reproducible() -> None:
    runtime = Path(__file__).resolve().parents[3] / "DecisionModelsService/.venv/bin/python"
    if not runtime.is_file():
        pytest.skip("DecisionModelsService venv is not present; use its pytest environment to run math integration")
    summary = scenario._offline_validation(scenario.FIXTURE_PATH)
    assert summary["analysisStatus"] == "available"
    assert summary["categoryCounts"] == {"low": 1, "medium": 8, "high": 1}
    assert set(summary["sensitivityChangedCriteria"]) >= {"quality", "purchase_cost"}
    assert len(summary["projection"]["expert_points"]) == 4
    assert summary["projection"]["identical_evaluation_groups"] == []


class RichClient:
    def __init__(self, alias: str, state: dict[str, Any]) -> None:
        self.alias, self.state = alias, state

    def request(self, method: str, path: str, *, json: Any = None) -> Any:
        self.state["calls"].append((self.alias, method, path, deepcopy(json)))
        if self.alias == "owner" and path == "/issues/models":
            return {"models": [deepcopy(self.state["decision_model"])], "criteriaWeightingModels": [deepcopy(self.state["weighting_model"])]}
        if self.alias == "owner" and path == "/issues/users":
            return [{"email": value} for value in EXPERT_EMAILS.values()]
        if self.alias == "owner" and path == "/issues/expression-domains":
            return {"globals": [{"id": "numeric-domain", "typeKey": "numericDiscrete", "definition": {"min": 1, "max": 10, "step": 1}}], "userDomains": []}
        if self.alias == "owner" and method == "POST" and path == "/issues":
            self.state["creation"] = json["issueInfo"]
            self.state["name"] = json["issueInfo"]["issueName"]
            return {"id": "issue-id", "name": self.state["name"]}
        if self.alias == "owner" and path == "/issues/active":
            return {"issues": [self._active_issue()]}
        if path.endswith("/invitation-response"):
            return {}
        if path.endswith("/evaluations/criteriaWeighting") and method == "GET":
            return self._weight_context()
        if path.endswith("/evaluations/criteriaWeighting/submit"):
            self.state["weight_submissions"].append((self.alias, deepcopy(json["payload"])))
            if len(self.state["weight_submissions"]) == 4:
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
            weights_by_id = {CRITERION_IDS[key]: value for key, value in FIXTURE["expectedCriteriaWeights"].items()}
            originals = {EXPERT_EMAILS[alias]: deepcopy(payload["weightsByCriterion"]) for alias, payload in self.state["weight_submissions"]}
            mcc = {"useMcc": True, "status": "Optimal", "weightsByCriterion": deepcopy(weights_by_id)}
            return {
                "stage": "criteriaWeighting",
                "structureKey": "manualCriteriaWeights",
                "consensusPhase": 0,
                "currentStage": "alternativeEvaluation",
                "result": {
                    "weightsByCriterion": weights_by_id,
                    "collectiveEvaluations": {"weightsByCriterion": deepcopy(weights_by_id)},
                    "consensusMeasure": None,
                    "rawOutput": {"useMcc": True, "nExperts": 4, "mcc": mcc, "expertWeightsByExpert": originals},
                },
            }
        if path.endswith("/evaluations/alternativeEvaluation") and method == "GET":
            return self._alternative_context()
        if path.endswith("/evaluations/alternativeEvaluation/submit"):
            self.state["alternative_submissions"].append((self.alias, deepcopy(json["payload"])))
            return {"completed": True, "currentStage": "alternativeEvaluation"}
        if path.endswith("/evaluations/alternativeEvaluation/compute"):
            self.state["stage"] = "finished"
            assignments = [{"alternativeId": ALTERNATIVE_IDS[key], "categoryId": category} for key, category in FIXTURE["expectedAssignments"].items()]
            return {
                "stage": "alternativeEvaluation",
                "currentStage": "finished",
                "result": {
                    "categories": deepcopy(FIXTURE["orderedCategories"]),
                    "categoryOrderSemantics": "lower-order-is-less-preferred",
                    "assignments": assignments,
                    "diagnostics": {"closeness_by_alternative_id": {key: 0.5 for key in ALTERNATIVE_IDS.values()}},
                },
            }
        if self.alias == "owner" and path == "/issues/finished":
            return {"issues": [{"id": "issue-id", "name": self.state["name"]}]}
        if self.alias == "owner" and path == "/issues/finished/issue-id":
            return self._finished()
        raise AssertionError(f"unexpected request {self.alias} {method} {path}")

    def _active_issue(self) -> dict[str, Any]:
        payload = self.state.get("creation", {})
        profiles = payload.get("paramValues", {}).get("boundaryProfiles", {}).get("profiles", [])
        remapped = []
        for profile in profiles:
            values = {CRITERION_IDS[key.removeprefix("criterion-")]: value for key, value in profile["valuesByCriterionId"].items()}
            remapped.append({"profileId": profile["profileId"], "categoryId": profile["categoryId"], "valuesByCriterionId": values})
        return {
            "id": "issue-id",
            "name": self.state["name"],
            "currentStage": self.state["stage"],
            "isConsensus": False,
            "isIssueOwner": True,
            "evaluationStructureKey": "alternativeCriteriaMatrix",
            "criteriaWeightsStructureKey": "manualCriteriaWeights",
            "resultStructureKey": "sorting",
            "resultStructureVersion": 1,
            "modelParameters": {"orderedCategories": deepcopy(FIXTURE["orderedCategories"]), "boundaryProfiles": {"profiles": remapped}},
        }

    def _weight_context(self) -> dict[str, Any]:
        return {
            "stage": "criteriaWeighting",
            "structureKey": "manualCriteriaWeights",
            "consensusPhase": 0,
            "completed": False,
            "decisionContext": {
                "issue": {"id": "issue-id", "currentStage": "criteriaWeighting", "isConsensus": False},
                "structure": {"key": "manualCriteriaWeights", "stage": "criteriaWeighting"},
                "model": {"apiModelKey": "manual_criteria_weights"},
                "leafCriteria": _criteria_by_name(),
            },
            "payload": {"weightsByCriterion": {value: "" for value in CRITERION_IDS.values()}},
        }

    def _alternative_context(self) -> dict[str, Any]:
        return {
            "stage": "alternativeEvaluation",
            "structureKey": "alternativeCriteriaMatrix",
            "consensusPhase": 0,
            "completed": False,
            "decisionContext": {
                "issue": {"id": "issue-id", "currentStage": "alternativeEvaluation", "isConsensus": False},
                "structure": {"key": "alternativeCriteriaMatrix", "stage": "alternativeEvaluation"},
                "model": {"id": "mongo-topsis-sort", "apiModelKey": "topsis_sort_2016"},
                "alternatives": _alternatives_by_name(),
                "leafCriteria": _criteria_by_name(),
            },
            "payload": {alt: {criterion: "" for criterion in CRITERION_IDS.values()} for alt in ALTERNATIVE_IDS.values()},
        }

    def _finished(self) -> dict[str, Any]:
        issue_name = self.state["name"]
        assignments = [{"alternativeId": ALTERNATIVE_IDS[key], "categoryId": category} for key, category in FIXTURE["expectedAssignments"].items()]
        standard = {
            "categories": deepcopy(FIXTURE["orderedCategories"]),
            "categoryOrderSemantics": "lower-order-is-less-preferred",
            "assignments": assignments,
            "diagnostics": {"closeness_by_alternative_id": {key: 0.5 for key in ALTERNATIVE_IDS.values()}},
        }
        return {
            "issue": {"id": "issue-id", "name": issue_name},
            "lifecycle": {"currentStage": "finished", "active": False},
            "models": {
                "base": {"technical": {"apiModelKey": "topsis_sort_2016"}},
                "criteriaWeighting": {"technical": {"apiModelKey": "manual_criteria_weights"}},
            },
            "configuration": {
                "criteriaWeighting": {"required": True, "source": "expertCriteriaWeighting", "structureKey": "manualCriteriaWeights", "level": "leaf"},
                "alternativeEvaluation": {"structureKey": "alternativeCriteriaMatrix"},
            },
            "consensus": {"enabled": False, "rounds": []},
            "participants": [
                {
                    "expert": {"id": EXPERT_IDS[alias], "email": EXPERT_EMAILS[alias]},
                    "invitationStatus": "accepted",
                    "weightsCompleted": True,
                    "evaluationCompleted": True,
                }
                for alias in EXPERT_EMAILS
            ],
            "evaluations": {
                "individual": [
                    {
                        "stage": stage,
                        "phase": 0,
                        "structureKey": structure,
                        "completed": True,
                        "expertId": EXPERT_IDS[alias],
                        "submittedAt": "2026-01-01T00:00:00Z",
                    }
                    for stage, structure in (("criteriaWeighting", "manualCriteriaWeights"), ("alternativeEvaluation", "alternativeCriteriaMatrix"))
                    for alias in EXPERT_EMAILS
                ],
                "contexts": [
                    {
                        "id": f"{stage}:0",
                        "stage": stage,
                        "phase": 0,
                        "structureKey": structure,
                        "modelId": "model-id",
                        "activeModelId": "model-id",
                        "decisionContext": {"issue": {"id": "issue-id"}, "model": {"apiModelKey": model_key}},
                    }
                    for stage, structure, model_key in (
                        ("criteriaWeighting", "manualCriteriaWeights", "manual_criteria_weights"),
                        ("alternativeEvaluation", "alternativeCriteriaMatrix", "topsis_sort_2016"),
                    )
                ],
                "collective": [
                    {
                        "phaseResultId": "weight-result",
                        "stage": "criteriaWeighting",
                        "phase": 0,
                        "rawPayload": {"weightsByCriterion": {CRITERION_IDS[key]: value for key, value in FIXTURE["expectedCriteriaWeights"].items()}},
                    },
                    {"phaseResultId": "sorting-result", "stage": "alternativeEvaluation", "phase": 0, "rawPayload": {}},
                ],
            },
            "alternatives": _alternatives_by_name(),
            "criteria": {
                "nodes": [{"id": CRITERION_IDS[item["key"]], "name": item["name"], "isLeaf": True} for item in FIXTURE["criteria"]],
                "finalWeights": {
                    "source": {"kind": "criteriaWeightingStageResult", "stageResultId": "weight-result", "stage": "criteriaWeighting", "phase": 0},
                    "byCriterionId": {CRITERION_IDS[key]: value for key, value in FIXTURE["expectedCriteriaWeights"].items()},
                },
            },
            "phaseResults": [
                {"id": "weight-result", "stage": "criteriaWeighting", "phase": 0, "consensusMeasure": None},
                {
                    "id": "sorting-result",
                    "stage": "alternativeEvaluation",
                    "phase": 0,
                    "resultStructureKey": "sorting",
                    "resultStructureVersion": 1,
                    "standardizedOutput": standard,
                    "rawOutput": {"diagnostics": {}},
                    "modelSpecificOutput": {"diagnostics": {}},
                },
            ],
        }


class RichSessions:
    def __init__(self) -> None:
        self.state = {
            "calls": [],
            "stage": "criteriaWeighting",
            "name": "",
            "creation": {},
            "weight_submissions": [],
            "alternative_submissions": [],
            "decision_model": deepcopy(MODEL),
            "weighting_model": deepcopy(WEIGHTING_MODEL),
        }
        users = {"owner": "owner@example.test", **EXPERT_EMAILS}
        self.users = {alias: UserCredentials(email=email, password="secret") for alias, email in users.items()}
        self.clients = {alias: RichClient(alias, self.state) for alias in self.users}
        self.logins: list[str] = []

    def login(self, alias: str) -> dict[str, str]:
        self.logins.append(alias)
        return {"token": alias}

    def client_for(self, alias: str) -> RichClient:
        return self.clients[alias]


def test_generation_runs_both_real_stages_with_four_experts_and_records_manifest(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(scenario, "_offline_validation", lambda _path: {"analysisStatus": "available"})
    sessions = RichSessions()
    store = ManifestStore(tmp_path / "manifest.json")
    result = scenario.generate(sessions, store)

    assert result.issue_id == "issue-id"
    assert result.expert_aliases == ("expert_a", "expert_b", "expert_c", "expert_d")
    assert result.assignments_by_alternative_name["Granite Systems"] == "low"
    assert result.assignments_by_alternative_name["Juniper Integrated Manufacturing"] == "high"
    assert store.list_entries()[0].scenario_id == scenario.SCENARIO_ID
    assert sessions.logins == ["owner", "expert_a", "expert_b", "expert_c", "expert_d"]
    assert len(sessions.state["weight_submissions"]) == len(sessions.state["alternative_submissions"]) == 4
    creation = sessions.state["creation"]
    assert len(creation["criteria"]) == 6 and all(not item["children"] for item in creation["criteria"])
    assert creation["criteriaWeightingConfig"]["level"] == "leaf"
    assert creation["criteriaWeightingConfig"]["payload"] == {}
    assert all(len(payload) == 10 and all(len(row) == 6 for row in payload.values()) for _, payload in sessions.state["alternative_submissions"])
    assert sum("/evaluations/criteriaWeighting/compute" in call[2] for call in sessions.state["calls"]) == 1
    assert sum("/evaluations/alternativeEvaluation/compute" in call[2] for call in sessions.state["calls"]) == 1


def test_generation_rejects_missing_fourth_alias_before_any_http_write(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(scenario, "_offline_validation", lambda _path: {"analysisStatus": "available"})
    sessions = RichSessions()
    sessions.users.pop("expert_d")
    with pytest.raises(ScenarioLabError, match="five configured distinct aliases"):
        scenario.generate(sessions, ManifestStore(tmp_path / "manifest.json"))
    assert not any(method == "POST" and path == "/issues" for _, method, path, _ in sessions.state["calls"])
