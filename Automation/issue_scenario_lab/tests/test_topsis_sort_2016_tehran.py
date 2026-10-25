from __future__ import annotations

from copy import deepcopy
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest
from typer.testing import CliRunner

from issue_scenario_lab import cli
from issue_scenario_lab.api.issues import IssuesApi
from issue_scenario_lab.config import UserCredentials
from issue_scenario_lab.errors import ScenarioLabError
from issue_scenario_lab.manifest.store import ManifestStore
from issue_scenario_lab.scenarios import topsis_sort_2016_tehran as scenario

FIXTURE = scenario.load_fixture()
CRITERION_IDS = {item["key"]: f"mongo-criterion-{item['key']}" for item in FIXTURE["criteria"]}
ALTERNATIVE_IDS = {item["name"]: f"mongo-{item['key']}" for item in FIXTURE["alternatives"]}
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
    "supportedExpressionDomains": [{"typeKey": "numericContinuous"}],
}
EXPERT_EMAIL = "tehran.expert@example.test"
DOMAIN = {"id": "numeric-domain", "typeKey": "numericContinuous", "definition": {"min": 0, "max": 1000}}


def _diagnostics() -> dict[str, Any]:
    criterion_order = [CRITERION_IDS[item["key"]] for item in FIXTURE["criteria"]]
    weighted_alternatives: dict[str, dict[str, float]] = {}
    for item in FIXTURE["alternatives"]:
        values = FIXTURE["publishedTable3"][item["sourceId"]]
        weighted_alternatives[ALTERNATIVE_IDS[item["name"]]] = {
            **{criterion_order[index]: values[index] for index in range(4)},
            criterion_order[4]: 0.2 - values[4],
        }
    weighted_profiles: dict[str, dict[str, float]] = {}
    for profile_id in ("p1", "p2", "p3", "p4"):
        values = FIXTURE["publishedTable3"][profile_id]
        weighted_profiles[profile_id] = {
            **{criterion_order[index]: values[index] for index in range(4)},
            criterion_order[4]: 0.2 - values[4],
        }
    distances_alternatives = {}
    closeness_alternatives = {}
    for item in FIXTURE["alternatives"]:
        distances = FIXTURE["publishedTable4"][item["sourceId"]]
        alt_id = ALTERNATIVE_IDS[item["name"]]
        distances_alternatives[alt_id] = {"to_positive_ideal": distances[0], "to_negative_ideal": distances[1]}
        closeness_alternatives[alt_id] = distances[2]
    distances_profiles = {}
    closeness_profiles = {}
    for profile_id in ("p1", "p2", "p3", "p4"):
        distances = FIXTURE["publishedTable4"][profile_id]
        distances_profiles[profile_id] = {"to_positive_ideal": distances[0], "to_negative_ideal": distances[1]}
        closeness_profiles[profile_id] = distances[2]
    return {
        "weighted_values_by_alternative_id": weighted_alternatives,
        "weighted_values_by_profile_id": weighted_profiles,
        "positive_ideal_by_criterion_id": {
            **{criterion_order[index]: FIXTURE["publishedTable3Ideal"][index] for index in range(4)},
            criterion_order[4]: 0.2 - FIXTURE["publishedTable3Ideal"][4],
        },
        "negative_ideal_by_criterion_id": {
            **{criterion_order[index]: FIXTURE["publishedTable3AntiIdeal"][index] for index in range(4)},
            criterion_order[4]: 0.2 - FIXTURE["publishedTable3AntiIdeal"][4],
        },
        "distances_by_alternative_id": distances_alternatives,
        "distances_by_profile_id": distances_profiles,
        "closeness_by_alternative_id": closeness_alternatives,
        "closeness_by_profile_id": closeness_profiles,
    }


def _result() -> dict[str, Any]:
    return {
        "categories": deepcopy(FIXTURE["orderedCategories"]),
        "categoryOrderSemantics": "lower-order-is-less-preferred",
        "assignments": [
            {"alternativeId": ALTERNATIVE_IDS[item["name"]], "categoryId": FIXTURE["expectedAssignments"][item["key"]]} for item in FIXTURE["alternatives"]
        ],
        "diagnostics": _diagnostics(),
    }


class FakeClient:
    def __init__(self, alias: str, state: dict[str, Any]) -> None:
        self.alias, self.state = alias, state

    def request(self, method: str, path: str, *, json: Any = None) -> Any:
        self.state["calls"].append((self.alias, method, path, deepcopy(json)))
        if self.alias == "owner" and path == "/issues/models":
            return {"models": [deepcopy(MODEL)]}
        if self.alias == "owner" and path == "/issues/users":
            return [{"email": EXPERT_EMAIL}]
        if self.alias == "owner" and path == "/issues/expression-domains":
            if method == "POST":
                created = {
                    "id": "private-domain",
                    "name": json["name"],
                    "typeKey": json["typeKey"],
                    "definition": {**json["definition"], "step": None},
                }
                self.state["domains"]["userDomains"].append(created)
                self.state["created_domain"] = deepcopy(json)
                return created
            return deepcopy(self.state["domains"])
        if self.alias == "owner" and method == "POST" and path == "/issues":
            self.state["creation"] = json["issueInfo"]
            self.state["name"] = json["issueInfo"]["issueName"]
            return {"id": "issue-id", "name": self.state["name"]}
        if self.alias == "owner" and path == "/issues/active":
            return {"issues": [self._active_issue()]}
        if path.endswith("/invitation-response"):
            return {}
        if path.endswith("/evaluations/alternativeEvaluation") and method == "GET":
            return self._evaluation_context()
        if path.endswith("/evaluations/alternativeEvaluation/submit"):
            self.state["submission"] = deepcopy(json["payload"])
            return {"completed": True, "currentStage": "alternativeEvaluation"}
        if path.endswith("/evaluations/alternativeEvaluation/compute"):
            return {"stage": "alternativeEvaluation", "currentStage": "finished", "result": deepcopy(self.state["result"])}
        if self.alias == "owner" and path == "/issues/finished":
            return {"issues": [{"id": "issue-id", "name": self.state["name"]}]}
        if self.alias == "owner" and path == "/issues/finished/issue-id":
            return self._finished()
        raise AssertionError(f"unexpected {self.alias} {method} {path}")

    def _active_issue(self) -> dict[str, Any]:
        criteria_by_name = {item["name"]: CRITERION_IDS[item["key"]] for item in FIXTURE["criteria"]}
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
                "orderedCategories": deepcopy(FIXTURE["orderedCategories"]),
                "boundaryProfiles": {
                    "profiles": [
                        {
                            "profileId": profile["profileId"],
                            "categoryId": profile["categoryId"],
                            "valuesByCriterionId": {criteria_by_name[key]: value for key, value in profile["valuesByCriterionId"].items()},
                        }
                        for profile in FIXTURE["boundaryProfiles"]["profiles"]
                    ]
                },
            },
            "finalWeights": deepcopy(FIXTURE["criteriaWeights"]),
        }

    def _evaluation_context(self) -> dict[str, Any]:
        alternatives = [{"id": ALTERNATIVE_IDS[item["name"]], "name": item["name"]} for item in FIXTURE["alternatives"]]
        criteria = [
            {
                "id": CRITERION_IDS[item["key"]],
                "name": item["name"],
                "type": item["type"],
                "expressionDomain": deepcopy(DOMAIN),
            }
            for item in FIXTURE["criteria"]
        ]
        return {
            "stage": "alternativeEvaluation",
            "structureKey": "alternativeCriteriaMatrix",
            "consensusPhase": 0,
            "completed": False,
            "decisionContext": {
                "issue": {"id": "issue-id", "currentStage": "alternativeEvaluation", "isConsensus": False},
                "structure": {"key": "alternativeCriteriaMatrix", "stage": "alternativeEvaluation"},
                "model": {"id": MODEL["id"], "apiModelKey": MODEL["apiModelKey"]},
                "alternatives": alternatives,
                "leafCriteria": criteria,
            },
            "payload": {item["id"]: {criterion["id"]: "" for criterion in criteria} for item in alternatives},
        }

    def _finished(self) -> dict[str, Any]:
        criteria = [{"id": CRITERION_IDS[item["key"]], "name": item["name"], "isLeaf": True} for item in FIXTURE["criteria"]]
        return {
            "issue": {"id": "issue-id", "name": self.state["name"]},
            "lifecycle": {"currentStage": "finished", "active": False},
            "models": {"base": {"technical": {"apiModelKey": "topsis_sort_2016"}}},
            "consensus": {"enabled": False, "rounds": []},
            "criteria": {"nodes": criteria, "finalWeights": {"byCriterionId": {item["id"]: 0.2 for item in criteria}}},
            "participants": [{"invitationStatus": "accepted", "evaluationCompleted": True}],
            "evaluations": {
                "individual": [
                    {
                        "stage": "alternativeEvaluation",
                        "phase": 0,
                        "structureKey": "alternativeCriteriaMatrix",
                        "rawPayload": deepcopy(self.state["submission"]),
                        "completed": True,
                    }
                ],
                "collective": [
                    {
                        "phaseResultId": "result-id",
                        "stage": "alternativeEvaluation",
                        "phase": 0,
                        "rawPayload": deepcopy(self.state["submission"]),
                    }
                ],
            },
            "phaseResults": [
                {
                    "stage": "alternativeEvaluation",
                    "phase": 0,
                    "resultStructureKey": "sorting",
                    "resultStructureVersion": 1,
                    "standardizedOutput": deepcopy(self.state["result"]),
                    "rawOutput": {"diagnostics": deepcopy(self.state["result"]["diagnostics"])},
                    "modelSpecificOutput": {"apiModelKey": "topsis_sort_2016"},
                }
            ],
        }


class FakeSessions:
    def __init__(self, state: dict[str, Any]) -> None:
        self.users = {
            "owner": UserCredentials(email="owner@example.test", password="test-only"),
            "expert_a": UserCredentials(email=EXPERT_EMAIL, password="test-only"),
        }
        self.clients = {alias: FakeClient(alias, state) for alias in self.users}
        self.logins: list[str] = []

    def login(self, alias: str) -> None:
        self.logins.append(alias)

    def client_for(self, alias: str) -> FakeClient:
        return self.clients[alias]


def _state() -> dict[str, Any]:
    return {
        "calls": [],
        "name": "",
        "result": _result(),
        "domains": {
            "globals": [
                {"id": "global-continuous", "typeKey": "numericContinuous", "definition": {"min": 0, "max": 1}},
                {"id": "global-discrete", "typeKey": "numericDiscrete", "definition": {"min": 0, "max": 9, "step": 1}},
            ],
            "userDomains": [],
        },
    }


def test_fixture_adapts_authoritative_paper_data_without_second_matrix_copy() -> None:
    source = scenario._authoritative_data()
    fixture = scenario.load_fixture()
    assert scenario.FIXTURE_PATH.name == "tehran_2016.py"
    assert len(fixture["alternatives"]) == 22
    assert len(fixture["criteria"]) == 5
    assert fixture["criteriaWeights"] == {"g1": 0.2, "g2": 0.2, "g3": 0.2, "g4": 0.2, "g5": 0.2}
    assert [item["categoryId"] for item in fixture["orderedCategories"]] == ["tehran-C5", "tehran-C4", "tehran-C3", "tehran-C2", "tehran-C1"]
    assert [item["profileId"] for item in fixture["boundaryProfiles"]["profiles"]] == ["p4", "p3", "p2", "p1"]
    assert fixture["alternatives"][0]["valuesByCriterionId"] == source.TEHRAN_ALTERNATIVES[0]["values_by_criterion_id"]
    assert (
        fixture["boundaryProfiles"]["profiles"][0]["valuesByCriterionId"]
        == next(item for item in source.TEHRAN_PROFILES if item["profile_id"] == "p4")["values_by_criterion_id"]
    )
    assert fixture["expectedAssignments"]["district-04"] == "tehran-C1"
    assert fixture["expectedAssignments"]["district-01"] == "tehran-C2"


def test_fixture_rejects_category_or_profile_order_drift() -> None:
    invalid = deepcopy(FIXTURE)
    invalid["orderedCategories"].reverse()
    with pytest.raises(ScenarioLabError, match="C5 through C1"):
        scenario.validate_fixture(invalid)
    invalid = deepcopy(FIXTURE)
    invalid["boundaryProfiles"]["profiles"].reverse()
    with pytest.raises(ScenarioLabError, match="p4, p3, p2, p1"):
        scenario.validate_fixture(invalid)


def test_issue_payload_keeps_original_values_weights_and_non_consensus_single_expert() -> None:
    payload = scenario._issue_payload("Tehran", MODEL["id"], EXPERT_EMAIL, DOMAIN["id"], FIXTURE)
    assert payload["isConsensus"] is False and payload["simulateConsensus"] is False
    assert payload["addedExperts"] == [EXPERT_EMAIL]
    assert payload["criteriaWeightingConfig"]["payload"]["weightsByCriterion"] == {f"criterion-g{index}": 0.2 for index in range(1, 6)}
    assert len(payload["alternatives"]) == 22
    assert len(payload["paramValues"]["boundaryProfiles"]["profiles"]) == 4
    assert payload["paramValues"]["boundaryProfiles"]["profiles"][0]["profileId"] == "p4"
    assert payload["paramValues"]["boundaryProfiles"]["profiles"][0]["valuesByCriterionId"] == {
        f"criterion-{key}": value
        for key, value in next(item for item in FIXTURE["boundaryProfiles"]["profiles"] if item["profileId"] == "p4")["valuesByCriterionId"].items()
    }


def test_generation_uses_one_real_http_evaluation_and_validates_table_3_4_and_5(tmp_path: Path) -> None:
    state = _state()
    sessions = FakeSessions(state)
    store = ManifestStore(tmp_path / "manifest.json")

    generated = scenario.generate(sessions, store)

    assert sessions.logins == ["owner", "expert_a"]
    assert generated.issue_id == "issue-id"
    assert generated.expert_aliases == ("expert_a",)
    assert len(state["submission"]) == 22
    assert all(len(row) == 5 for row in state["submission"].values())
    assert state["creation"]["isConsensus"] is False
    assert state["creation"]["criteriaWeightingConfig"]["payload"]["weightsByCriterion"] == {f"criterion-{key}": 0.2 for key in ("g1", "g2", "g3", "g4", "g5")}
    assert state["creation"]["expressionDomainConfig"] == {"mode": "global", "globalDomainId": "private-domain"}
    assert state["created_domain"] == {
        "name": scenario.DOMAIN_NAME,
        "typeKey": "numericContinuous",
        "definition": {"min": 0, "max": 916.67},
    }
    assert generated.assignments_by_alternative_name["District 4"] == "tehran-C1"
    assert generated.assignments_by_alternative_name["District 1"] == "tehran-C2"
    assert generated.assignments_by_alternative_name["District 3"] == "tehran-C3"
    assert generated.max_table_3_absolute_difference == pytest.approx(0, abs=1e-15)
    assert generated.max_table_4_distance_absolute_difference == 0
    assert generated.max_table_4_closeness_absolute_difference == 0
    assert generated.expression_domain_name == scenario.DOMAIN_NAME
    assert generated.expression_domain_range == (0, 916.67)
    assert generated.expression_domain_created is True
    entry = store.find(generated.generation_id)
    assert entry is not None and entry.issue_id == "issue-id" and entry.scenario_id == scenario.SCENARIO_ID
    assert [call[2] for call in state["calls"] if call[2].endswith("invitation-response")] == ["/issues/issue-id/invitation-response"]


def test_compatible_owner_domain_is_reused_without_creating_another_domain() -> None:
    state = _state()
    reusable = {**deepcopy(DOMAIN), "name": scenario.DOMAIN_NAME}
    state["domains"]["userDomains"].append(reusable)
    owner = FakeClient("owner", state)

    selected, created = scenario._compatible_domain_or_create(IssuesApi(owner), {"numericContinuous"}, FIXTURE)

    assert selected["id"] == reusable["id"]
    assert created is False
    assert state.get("created_domain") is None
    assert all(method != "POST" for _, method, path, _ in state["calls"] if path == "/issues/expression-domains")


def test_published_table_rounding_tolerances_accept_service_precision_and_reject_mismatch() -> None:
    fixture = scenario.load_fixture()
    result = _result()
    first = FIXTURE["alternatives"][0]
    result["diagnostics"]["closeness_by_alternative_id"][ALTERNATIVE_IDS[first["name"]]] += 0.00008
    metrics = scenario._validate_published_diagnostics(result, fixture, ALTERNATIVE_IDS, CRITERION_IDS)
    assert metrics[2] == pytest.approx(0.00008)
    result["diagnostics"]["closeness_by_alternative_id"][ALTERNATIVE_IDS[first["name"]]] += 0.00002
    with pytest.raises(ScenarioLabError, match="beyond tolerances"):
        scenario._validate_published_diagnostics(result, fixture, ALTERNATIVE_IDS, CRITERION_IDS)


def test_cli_registers_the_tehran_scenario_and_reports_published_comparisons(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    settings = SimpleNamespace(manifest_file=tmp_path / "manifest.json")
    generated = scenario.GenerationResult(
        generation_id="generation-1",
        issue_id="issue-1",
        issue_name="Tehran",
        owner_alias="owner",
        expert_aliases=("expert_a",),
        manifest_path=str(settings.manifest_file),
        assignments_by_alternative_name={"District 1": "tehran-C2"},
        max_table_3_absolute_difference=0.00001,
        max_table_4_distance_absolute_difference=0.00002,
        max_table_4_closeness_absolute_difference=0.00003,
        expression_domain_name=scenario.DOMAIN_NAME,
        expression_domain_range=(0, 916.67),
        expression_domain_created=True,
    )

    class ContextSessions:
        def __enter__(self):
            return self

        def __exit__(self, *_: object) -> None:
            return None

    monkeypatch.setattr(cli, "_settings", lambda: settings)
    monkeypatch.setattr(cli.SessionPool, "from_settings", lambda _: ContextSessions())
    monkeypatch.setattr(cli, "generate_topsis_sort_2016_tehran", lambda *_args, **_kwargs: generated)
    result = CliRunner().invoke(cli.app, ["generate", "topsis-sort-2016-tehran"])

    assert result.exit_code == 0, result.output
    assert "topsis-sort-2016-tehran" in result.output
    assert "maxTable4ClosenessAbsoluteDifference" in result.output
