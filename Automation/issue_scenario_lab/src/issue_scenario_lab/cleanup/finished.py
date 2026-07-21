from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from issue_scenario_lab.api.issues import IssuesApi
from issue_scenario_lab.api.session_pool import SessionPool
from issue_scenario_lab.errors import ApiClientError, ManifestError, ScenarioLabError
from issue_scenario_lab.manifest.models import GeneratedIssue
from issue_scenario_lab.manifest.store import ManifestStore


@dataclass(frozen=True)
class FinishedDeletionResult:
    generation_id: str
    issue_id: str
    issue_name: str
    processed_aliases: tuple[str, ...]
    already_hidden_aliases: tuple[str, ...]
    deletion_confirmed: bool
    manifest_entry_removed: bool


def _items(value: Any) -> list[dict[str, Any]]:
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    if isinstance(value, dict) and isinstance(value.get("issues"), list):
        return _items(value["issues"])
    return []


def _id(item: dict[str, Any]) -> str | None:
    value = item.get("id") or item.get("_id")
    return value if isinstance(value, str) and value else None


def _validate_entry(entry: GeneratedIssue, sessions: SessionPool) -> tuple[str, ...]:
    if not entry.issue_id or not entry.issue_name or not entry.owner_alias or not entry.visible_user_aliases:
        raise ScenarioLabError(f"manifest entry {entry.generation_id} is incomplete")
    if not entry.issue_name.startswith("[AUTO:"):
        raise ScenarioLabError(f"refusing cleanup for non-automated issue: {entry.issue_name}")
    aliases = tuple(entry.visible_user_aliases)
    if entry.owner_alias not in aliases:
        raise ScenarioLabError(f"manifest entry {entry.generation_id} does not include its owner in visibleUserAliases")
    missing = [alias for alias in aliases if alias not in sessions.users]
    if missing:
        raise ScenarioLabError(f"manifest entry {entry.generation_id} references unconfigured aliases: {', '.join(missing)}")
    return aliases


def _ordered_aliases(entry: GeneratedIssue) -> tuple[str, ...]:
    return tuple(alias for alias in entry.visible_user_aliases if alias != entry.owner_alias) + (entry.owner_alias,)


def delete_finished_generation(sessions: SessionPool, store: ManifestStore, generation_id: str) -> FinishedDeletionResult:
    entry = store.find(generation_id)
    if entry is None:
        raise ScenarioLabError(f"unknown generation ID: {generation_id}")
    _validate_entry(entry, sessions)
    aliases = _ordered_aliases(entry)

    # Authenticate everyone before hiding the issue for anyone.
    for alias in aliases:
        sessions.login(alias)

    processed: list[str] = []
    already_hidden: list[str] = []
    for alias in aliases:
        api = IssuesApi(sessions.client_for(alias))
        matching = [item for item in _items(api.finished_issues()) if _id(item) == entry.issue_id]
        if not matching:
            already_hidden.append(alias)
            continue
        if len(matching) != 1 or matching[0].get("name") != entry.issue_name:
            raise ScenarioLabError(f"finished issue name does not match manifest for alias {alias}")
        response = api.delete_finished_issue(entry.issue_id)
        if not isinstance(response, dict) or response.get("issueName") != entry.issue_name:
            raise ScenarioLabError(f"finished delete response name does not match manifest for alias {alias}")
        if any(_id(item) == entry.issue_id for item in _items(api.finished_issues())):
            raise ScenarioLabError(f"finished issue remains visible after deletion for alias {alias}")
        processed.append(alias)

    owner_api = IssuesApi(sessions.client_for(entry.owner_alias))
    try:
        owner_api.finished_issue(entry.issue_id)
    except ApiClientError as error:
        if error.status_code != 404:
            if error.status_code == 403:
                raise ScenarioLabError(
                    "finished issue remains physically present after all configured aliases hid it; "
                    "another accepted visible user may be missing from visibleUserAliases"
                ) from error
            raise ScenarioLabError(f"could not confirm permanent deletion: {error}") from error
    else:
        raise ScenarioLabError("finished issue remains accessible after all configured aliases were processed")

    try:
        removed = store.remove(entry.generation_id)
    except ManifestError as error:
        raise ScenarioLabError(
            "Backend issue was permanently deleted but manifest entry remains "
            f"(generationId={entry.generation_id}, issueId={entry.issue_id}, manifest={store.path}): {error}"
        ) from error
    if removed is None:
        raise ScenarioLabError(f"Backend issue was permanently deleted but manifest entry could not be removed: {entry.generation_id}")
    return FinishedDeletionResult(
        entry.generation_id,
        entry.issue_id,
        entry.issue_name,
        tuple(processed),
        tuple(already_hidden),
        True,
        True,
    )
