from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from issue_scenario_lab.api.issues import IssuesApi
from issue_scenario_lab.api.session_pool import SessionPool
from issue_scenario_lab.errors import ScenarioLabError


@dataclass(frozen=True)
class ActiveDeletionResult:
    issue_id: str
    issue_name: str
    owner_alias: str
    deletion_confirmed: bool


def _items(value: Any) -> list[dict[str, Any]]:
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    if isinstance(value, dict) and isinstance(value.get("issues"), list):
        return _items(value["issues"])
    return []


def _id(item: dict[str, Any]) -> str | None:
    value = item.get("id") or item.get("_id")
    return value if isinstance(value, str) and value else None


def delete_active_issue(sessions: SessionPool, issue_id: str, *, owner_alias: str = "owner") -> ActiveDeletionResult:
    if owner_alias not in sessions.users:
        raise ScenarioLabError(f"unknown owner alias: {owner_alias}")
    sessions.login(owner_alias)
    api = IssuesApi(sessions.client_for(owner_alias))
    matches = [item for item in _items(api.active_issues()) if _id(item) == issue_id]
    if len(matches) != 1:
        raise ScenarioLabError(f"active issue was not found by exact ID: {issue_id}")
    issue = matches[0]
    name = issue.get("name")
    if not isinstance(name, str) or not name.startswith("[AUTO:"):
        raise ScenarioLabError("refusing to delete an active issue without the [AUTO: prefix")
    if issue.get("isIssueOwner") is not True:
        raise ScenarioLabError("configured owner is not the owner of this active issue")
    response = api.delete_active_issue(issue_id)
    if not isinstance(response, dict) or response.get("issueName") != name:
        raise ScenarioLabError("active delete response name does not match the active issue")
    if any(_id(item) == issue_id for item in _items(api.active_issues())):
        raise ScenarioLabError("active issue remains listed after deletion")
    return ActiveDeletionResult(issue_id, name, owner_alias, True)
