from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest
from typer.testing import CliRunner

from issue_scenario_lab.api.issues import IssuesApi
from issue_scenario_lab.cleanup.active import ActiveDeletionResult, delete_active_issue
from issue_scenario_lab.cleanup.finished import FinishedDeletionResult, delete_finished_generation
from issue_scenario_lab.config import UserCredentials
from issue_scenario_lab.errors import ApiClientError, ManifestError, ScenarioLabError
from issue_scenario_lab.manifest.models import GeneratedIssue
from issue_scenario_lab.manifest.store import ManifestStore

ISSUE_ID = "issue-id"
ISSUE_NAME = "[AUTO:gen-id] No consensus · basic"
ENTRY = GeneratedIssue(
    generationId="gen-id",
    scenarioId="no-consensus-basic",
    issueId=ISSUE_ID,
    issueName=ISSUE_NAME,
    ownerAlias="owner",
    visibleUserAliases=["owner", "expert_a", "expert_b"],
)


class RecordingClient:
    def __init__(self) -> None:
        self.calls: list[tuple[str, str, Any]] = []

    def request(self, method: str, path: str, *, json: Any = None) -> Any:
        self.calls.append((method, path, json))
        return {"issueName": ISSUE_NAME}


class CleanupClient:
    def __init__(self, alias: str, state: dict[str, Any]) -> None:
        self.alias, self.state = alias, state

    def request(self, method: str, path: str, *, json: Any = None) -> Any:
        self.state["calls"].append((self.alias, method, path))
        if path == "/issues/finished" and method == "GET":
            return {"issues": [{"id": ISSUE_ID, "name": self.state["names"].get(self.alias, ISSUE_NAME)}] if self.state["visible"].get(self.alias) else []}
        if path == f"/issues/finished/{ISSUE_ID}" and method == "DELETE":
            if not self.state["keep_visible"]:
                self.state["visible"][self.alias] = False
            return {"issueName": self.state["delete_names"].get(self.alias, ISSUE_NAME)}
        if path == f"/issues/finished/{ISSUE_ID}" and method == "GET":
            status = self.state["detail_status"]
            if status == 200:
                return {"issue": {"id": ISSUE_ID}}
            raise ApiClientError(method="GET", path=path, status_code=status, message="safe detail error")
        if path == "/issues/active" and method == "GET":
            return {"issues": self.state["active"]}
        if path == f"/issues/{ISSUE_ID}" and method == "DELETE":
            if not self.state["keep_active"]:
                self.state["active"] = []
            return {"issueName": self.state["active_delete_name"]}
        raise AssertionError(f"unexpected request: {method} {path}")


class FakeSessions:
    def __init__(self, state: dict[str, Any] | None = None) -> None:
        self.state = state or {
            "calls": [],
            "visible": {"owner": True, "expert_a": True, "expert_b": True},
            "names": {},
            "delete_names": {},
            "detail_status": 404,
            "keep_visible": False,
            "active": [{"id": ISSUE_ID, "name": ISSUE_NAME, "isIssueOwner": True}],
            "keep_active": False,
            "active_delete_name": ISSUE_NAME,
        }
        self.users = {alias: UserCredentials(email=f"{alias}@example.test", password="secret") for alias in ENTRY.visible_user_aliases}
        self.clients = {alias: CleanupClient(alias, self.state) for alias in self.users}

    def __enter__(self) -> FakeSessions:
        return self

    def __exit__(self, *_: object) -> None:
        return None

    def login(self, alias: str) -> dict[str, str]:
        self.state["calls"].append((alias, "LOGIN", ""))
        if alias in self.state.get("login_failures", set()):
            raise ScenarioLabError(f"login failed for {alias}")
        return {"token": "not-printed"}

    def client_for(self, alias: str) -> CleanupClient:
        return self.clients[alias]


def store_with_entry(tmp_path: Path, entry: GeneratedIssue = ENTRY) -> ManifestStore:
    store = ManifestStore(tmp_path / "manifest.json")
    store.add(entry)
    return store


def test_delete_api_wrappers_use_existing_routes_and_extract_data() -> None:
    client = RecordingClient()
    api = IssuesApi(client)  # type: ignore[arg-type]
    assert api.delete_finished_issue(ISSUE_ID) == {"issueName": ISSUE_NAME}
    assert api.delete_active_issue(ISSUE_ID) == {"issueName": ISSUE_NAME}
    assert client.calls == [("DELETE", f"/issues/finished/{ISSUE_ID}", None), ("DELETE", f"/issues/{ISSUE_ID}", None)]


def test_unknown_generation_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(ScenarioLabError, match="unknown generation ID"):
        delete_finished_generation(FakeSessions(), ManifestStore(tmp_path / "manifest.json"), "unknown")


def test_missing_alias_and_login_failure_happen_before_any_delete(tmp_path: Path) -> None:
    sessions = FakeSessions()
    del sessions.users["expert_b"]
    with pytest.raises(ScenarioLabError, match="unconfigured aliases"):
        delete_finished_generation(sessions, store_with_entry(tmp_path), ENTRY.generation_id)
    assert not any(method == "DELETE" for _, method, _ in sessions.state["calls"])

    sessions = FakeSessions()
    sessions.state["login_failures"] = {"expert_b"}
    with pytest.raises(ScenarioLabError, match="login failed"):
        delete_finished_generation(sessions, store_with_entry(tmp_path / "second"), ENTRY.generation_id)
    assert not any(method == "DELETE" for _, method, _ in sessions.state["calls"])


def test_finished_cleanup_orders_experts_before_owner_and_removes_manifest(tmp_path: Path) -> None:
    sessions = FakeSessions()
    store = store_with_entry(tmp_path)
    result = delete_finished_generation(sessions, store, ENTRY.generation_id)
    deletes = [alias for alias, method, _ in sessions.state["calls"] if method == "DELETE"]
    assert deletes == ["expert_a", "expert_b", "owner"]
    assert result.processed_aliases == ("expert_a", "expert_b", "owner")
    assert result.deletion_confirmed and result.manifest_entry_removed
    assert store.find(ENTRY.generation_id) is None


@pytest.mark.parametrize(
    ("mutate", "message"),
    [
        (lambda state: state["names"].update({"expert_a": "wrong"}), "name does not match"),
        (lambda state: state.update(keep_visible=True), "remains visible"),
        (lambda state: state["delete_names"].update({"expert_a": "wrong"}), "response name does not match"),
    ],
)
def test_finished_per_user_safety_failures_preserve_manifest(tmp_path: Path, mutate: Any, message: str) -> None:
    sessions = FakeSessions()
    mutate(sessions.state)
    store = store_with_entry(tmp_path)
    with pytest.raises(ScenarioLabError, match=message):
        delete_finished_generation(sessions, store, ENTRY.generation_id)
    assert store.find(ENTRY.generation_id) is not None


def test_already_hidden_alias_is_skipped_and_404_confirms_deletion(tmp_path: Path) -> None:
    sessions = FakeSessions()
    sessions.state["visible"]["expert_a"] = False
    result = delete_finished_generation(sessions, store_with_entry(tmp_path), ENTRY.generation_id)
    assert result.already_hidden_aliases == ("expert_a",)
    assert "expert_a" not in [alias for alias, method, _ in sessions.state["calls"] if method == "DELETE"]


@pytest.mark.parametrize(("status", "message"), [(403, "another accepted visible user"), (200, "remains accessible"), (500, "could not confirm")])
def test_detail_failures_do_not_remove_manifest(tmp_path: Path, status: int, message: str) -> None:
    sessions = FakeSessions()
    sessions.state["detail_status"] = status
    store = store_with_entry(tmp_path)
    with pytest.raises(ScenarioLabError, match=message):
        delete_finished_generation(sessions, store, ENTRY.generation_id)
    assert store.find(ENTRY.generation_id) is not None


def test_non_auto_and_manifest_write_failure_are_safe(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    unsafe = ENTRY.model_copy(update={"issue_name": "Manual issue"})
    with pytest.raises(ScenarioLabError, match="non-automated"):
        delete_finished_generation(FakeSessions(), store_with_entry(tmp_path, unsafe), unsafe.generation_id)

    store = store_with_entry(tmp_path / "write")
    monkeypatch.setattr(store, "remove", lambda _: (_ for _ in ()).throw(ManifestError("disk failed")))
    with pytest.raises(ScenarioLabError, match="Backend issue was permanently deleted"):
        delete_finished_generation(FakeSessions(), store, ENTRY.generation_id)


@pytest.mark.parametrize(
    ("mutate", "message"),
    [
        (lambda state: state.update(active=[]), "not found by exact ID"),
        (lambda state: state["active"][0].update(isIssueOwner=False), "not the owner"),
        (lambda state: state["active"][0].update(name="Manual issue"), "AUTO"),
        (lambda state: state.update(active_delete_name="wrong"), "response name"),
        (lambda state: state.update(keep_active=True), "remains listed"),
    ],
)
def test_active_cleanup_safeguards(tmp_path: Path, mutate: Any, message: str) -> None:
    sessions = FakeSessions()
    mutate(sessions.state)
    with pytest.raises(ScenarioLabError, match=message):
        delete_active_issue(sessions, ISSUE_ID)


def test_active_cleanup_uses_owner_and_never_touches_manifest(tmp_path: Path) -> None:
    sessions = FakeSessions()
    store = store_with_entry(tmp_path)
    result = delete_active_issue(sessions, ISSUE_ID)
    assert result == ActiveDeletionResult(ISSUE_ID, ISSUE_NAME, "owner", True)
    assert store.find(ENTRY.generation_id) is not None
    assert ("owner", "DELETE", f"/issues/{ISSUE_ID}") in sessions.state["calls"]


def test_cleanup_errors_do_not_include_credentials(tmp_path: Path) -> None:
    sessions = FakeSessions()
    sessions.state["login_failures"] = {"expert_a"}
    with pytest.raises(ScenarioLabError) as error:
        delete_finished_generation(sessions, store_with_entry(tmp_path), ENTRY.generation_id)
    assert "secret" not in str(error.value)
    assert "not-printed" not in str(error.value)


def test_cli_commands_invoke_cleanup_services(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    from issue_scenario_lab import cli

    sessions = FakeSessions()
    settings = SimpleNamespace(manifest_file=tmp_path / "manifest.json")
    store_with_entry(tmp_path)
    monkeypatch.setattr(cli, "_settings", lambda: settings)
    monkeypatch.setattr("issue_scenario_lab.cli.SessionPool.from_settings", lambda _: sessions)
    monkeypatch.setattr(
        cli,
        "delete_finished_generation",
        lambda *_: FinishedDeletionResult("gen-id", ISSUE_ID, ISSUE_NAME, ("owner",), (), True, True),
    )
    monkeypatch.setattr(cli, "delete_active_issue", lambda *_args, **_kwargs: ActiveDeletionResult(ISSUE_ID, ISSUE_NAME, "owner", True))
    runner = CliRunner()
    assert runner.invoke(cli.app, ["delete", "gen-id"]).exit_code == 0
    assert runner.invoke(cli.app, ["delete-active", ISSUE_ID]).exit_code == 0


def test_delete_all_has_friendly_empty_state_and_continues_after_failure(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    from issue_scenario_lab import cli

    settings = SimpleNamespace(manifest_file=tmp_path / "manifest.json")
    monkeypatch.setattr(cli, "_settings", lambda: settings)
    monkeypatch.setattr("issue_scenario_lab.cli.SessionPool.from_settings", lambda _: FakeSessions())
    runner = CliRunner()
    empty = runner.invoke(cli.app, ["delete-all"])
    assert empty.exit_code == 0
    assert "No generated issues" in empty.output

    store = store_with_entry(tmp_path)
    second = ENTRY.model_copy(update={"generation_id": "gen-two", "issue_id": "issue-two", "issue_name": "[AUTO:gen-two] No consensus · basic"})
    store.add(second)
    calls: list[str] = []

    def cleanup(_sessions: Any, _store: Any, generation_id: str) -> FinishedDeletionResult:
        calls.append(generation_id)
        if generation_id == ENTRY.generation_id:
            raise ScenarioLabError("safe failure")
        return FinishedDeletionResult(generation_id, "issue-two", second.issue_name, (), (), True, True)

    monkeypatch.setattr(cli, "delete_finished_generation", cleanup)
    result = runner.invoke(cli.app, ["delete-all"])
    assert result.exit_code == 1
    assert calls == [ENTRY.generation_id, second.generation_id]
