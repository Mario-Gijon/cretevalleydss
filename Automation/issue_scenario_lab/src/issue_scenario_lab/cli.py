from __future__ import annotations

from typing import Any

import typer
from rich.console import Console
from rich.table import Table

from issue_scenario_lab.api.client import ApiClient
from issue_scenario_lab.api.session_pool import SessionPool
from issue_scenario_lab.cleanup.active import delete_active_issue
from issue_scenario_lab.cleanup.finished import delete_finished_generation
from issue_scenario_lab.config import Settings
from issue_scenario_lab.errors import ScenarioLabError
from issue_scenario_lab.manifest.store import ManifestStore
from issue_scenario_lab.scenarios.consensus_first_round import SCENARIO_ID as CONSENSUS_FIRST_ROUND_SCENARIO_ID
from issue_scenario_lab.scenarios.consensus_first_round import generate as generate_consensus_first_round
from issue_scenario_lab.scenarios.consensus_later_round import SCENARIO_ID as CONSENSUS_LATER_ROUND_SCENARIO_ID
from issue_scenario_lab.scenarios.consensus_later_round import generate as generate_consensus_later_round
from issue_scenario_lab.scenarios.no_consensus_basic import SCENARIO_ID
from issue_scenario_lab.scenarios.no_consensus_basic import generate as generate_no_consensus_basic
from issue_scenario_lab.scenarios.no_consensus_criteria_weighting import SCENARIO_ID as CRITERIA_WEIGHTING_SCENARIO_ID
from issue_scenario_lab.scenarios.no_consensus_criteria_weighting import generate as generate_no_consensus_criteria_weighting
from issue_scenario_lab.scenarios.no_consensus_expert_weights import SCENARIO_ID as EXPERT_WEIGHTS_SCENARIO_ID
from issue_scenario_lab.scenarios.no_consensus_expert_weights import generate as generate_no_consensus_expert_weights

app = typer.Typer(add_completion=False, help="Local HTTP foundation for CreteValleyDSS issue variants.")
console = Console()


def _settings() -> Settings:
    try:
        return Settings()
    except ValueError as error:
        raise typer.BadParameter(str(error)) from error


def _profile_identity(profile_data: dict[str, Any]) -> dict[str, Any]:
    profile = profile_data.get("user", profile_data)
    if not isinstance(profile, dict):
        return {}
    safe_keys = ("id", "_id", "email", "name", "role", "university")
    return {key: profile[key] for key in safe_keys if key in profile}


def _raise_cli_error(error: Exception) -> None:
    console.print(f"[red]Error:[/red] {error}")
    raise typer.Exit(code=1)


@app.command()
def health() -> None:
    """Check the real local Backend health endpoint."""

    try:
        with ApiClient(_settings()) as client:
            data = client.health()
    except ScenarioLabError as error:
        _raise_cli_error(error)
    table = Table(show_header=False)
    for key in ("service", "status", "startedAt"):
        if key in data:
            table.add_row(key, str(data[key]))
    console.print(table)


@app.command("check-user")
def check_user(user_alias: str) -> None:
    """Log in one configured local user and print a safe profile identity."""

    try:
        with SessionPool.from_settings(_settings()) as sessions:
            sessions.login(user_alias)
            identity = _profile_identity(sessions.client_for(user_alias).current_user())
    except ScenarioLabError as error:
        _raise_cli_error(error)
    console.print({"alias": user_alias, "profile": identity})


@app.command("check-users")
def check_users() -> None:
    """Log in every configured user with independent HTTP sessions."""

    try:
        sessions = SessionPool.from_settings(_settings())
    except ScenarioLabError as error:
        _raise_cli_error(error)

    table = Table("Alias", "Status", "Identity")
    failures = 0
    with sessions:
        for alias in sessions.aliases:
            try:
                sessions.login(alias)
                table.add_row(alias, "[green]ok[/green]", str(_profile_identity(sessions.client_for(alias).current_user())))
            except ScenarioLabError as error:
                failures += 1
                table.add_row(alias, "[red]failed[/red]", str(error))
    console.print(table)
    if failures:
        raise typer.Exit(code=1)


@app.command("list-generated")
def list_generated() -> None:
    """List generated issues known to the minimal local manifest."""

    try:
        entries = ManifestStore(_settings().manifest_file).list_entries()
    except ScenarioLabError as error:
        _raise_cli_error(error)
    if not entries:
        console.print("No generated issues are recorded in the local manifest.")
        return
    table = Table("Generation ID", "Scenario ID", "Issue ID", "Issue name")
    for entry in entries:
        table.add_row(entry.generation_id, entry.scenario_id, entry.issue_id, entry.issue_name)
    console.print(table)


def _finished_result_output(result: Any) -> dict[str, Any]:
    return {
        "generationId": result.generation_id,
        "issueId": result.issue_id,
        "issueName": result.issue_name,
        "processedAliases": list(result.processed_aliases),
        "alreadyHiddenAliases": list(result.already_hidden_aliases),
        "deletionConfirmed": result.deletion_confirmed,
        "manifestEntryRemoved": result.manifest_entry_removed,
    }


@app.command("delete")
def delete(generation_id: str) -> None:
    """Hide and permanently remove one generated finished issue through the Backend."""

    try:
        settings = _settings()
        with SessionPool.from_settings(settings) as sessions:
            result = delete_finished_generation(sessions, ManifestStore(settings.manifest_file), generation_id)
    except ScenarioLabError as error:
        _raise_cli_error(error)
    console.print(_finished_result_output(result))


@app.command("delete-all")
def delete_all() -> None:
    """Sequentially clean up every generated finished issue in the local manifest."""

    try:
        settings = _settings()
        store = ManifestStore(settings.manifest_file)
        entries = list(store.list_entries())
    except ScenarioLabError as error:
        _raise_cli_error(error)
    if not entries:
        console.print("No generated issues are recorded in the local manifest.")
        return
    table = Table("Generation ID", "Issue ID", "Status", "Message")
    failures = 0
    for entry in entries:
        try:
            with SessionPool.from_settings(settings) as sessions:
                result = delete_finished_generation(sessions, store, entry.generation_id)
            table.add_row(result.generation_id, result.issue_id, "[green]deleted[/green]", "permanent deletion confirmed")
        except ScenarioLabError as error:
            failures += 1
            table.add_row(entry.generation_id, entry.issue_id, "[red]failed[/red]", str(error))
    console.print(table)
    if failures:
        raise typer.Exit(code=1)


@app.command("delete-active")
def delete_active(issue_id: str, owner_alias: str = "owner") -> None:
    """Permanently remove one owner-owned, automated active issue through the Backend."""

    try:
        settings = _settings()
        with SessionPool.from_settings(settings) as sessions:
            result = delete_active_issue(sessions, issue_id, owner_alias=owner_alias)
    except ScenarioLabError as error:
        _raise_cli_error(error)
    console.print(
        {"issueId": result.issue_id, "issueName": result.issue_name, "ownerAlias": result.owner_alias, "deletionConfirmed": result.deletion_confirmed}
    )


@app.command("show-config")
def show_config() -> None:
    """Print only the non-secret local configuration values."""

    settings = _settings()
    table = Table("Setting", "Value")
    for name, value in settings.safe_values().items():
        table.add_row(name, str(value))
    console.print(table)


@app.command()
def generate(
    scenario_id: str,
    owner_alias: str = "owner",
    expert_a_alias: str = "expert_a",
    expert_b_alias: str = "expert_b",
) -> None:
    """Generate one supported local issue scenario through the real HTTP API."""

    generators = {
        SCENARIO_ID: (generate_no_consensus_basic, {"model": "BORDA"}),
        CRITERIA_WEIGHTING_SCENARIO_ID: (
            generate_no_consensus_criteria_weighting,
            {"model": "TOPSIS", "criteriaWeightingModel": "Manual Criteria Weights"},
        ),
        EXPERT_WEIGHTS_SCENARIO_ID: (
            generate_no_consensus_expert_weights,
            {"model": "WASPAS", "expertWeights": {"expert_a": 0.75, "expert_b": 0.25}, "criteriaWeights": {"Quality": 0.60, "Cost": 0.40}, "lambda": 0.5},
        ),
        CONSENSUS_FIRST_ROUND_SCENARIO_ID: (
            generate_consensus_first_round,
            {"model": "Herrera Viedma CRP", "consensusThreshold": 0.9, "consensusMaxPhases": 3, "finalConsensusPhase": 0, "consensusReached": True},
        ),
        CONSENSUS_LATER_ROUND_SCENARIO_ID: (
            generate_consensus_later_round,
            {"model": "Herrera Viedma CRP", "consensusThreshold": 0.9, "consensusMaxPhases": 3, "finalConsensusPhase": 1, "consensusReached": True},
        ),
    }
    selected = generators.get(scenario_id)
    if selected is None:
        console.print(f"[red]Unsupported scenario:[/red] {scenario_id}. Supported: {', '.join(generators)}")
        raise typer.Exit(code=1)
    try:
        settings = _settings()
        with SessionPool.from_settings(settings) as sessions:
            result = selected[0](
                sessions,
                ManifestStore(settings.manifest_file),
                owner_alias=owner_alias,
                expert_a_alias=expert_a_alias,
                expert_b_alias=expert_b_alias,
            )
    except ScenarioLabError as error:
        _raise_cli_error(error)
    console.print(
        {
            "generationId": result.generation_id,
            "scenarioId": scenario_id,
            "issueId": result.issue_id,
            "issueName": result.issue_name,
            **selected[1],
            "experts": result.expert_aliases,
            "finalStage": "finished",
            "manifest": result.manifest_path,
        }
    )
