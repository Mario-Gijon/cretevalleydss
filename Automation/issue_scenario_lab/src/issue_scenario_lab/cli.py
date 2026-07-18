from __future__ import annotations

from typing import Any

import typer
from rich.console import Console
from rich.table import Table

from issue_scenario_lab.api.client import ApiClient
from issue_scenario_lab.api.session_pool import SessionPool
from issue_scenario_lab.config import Settings
from issue_scenario_lab.errors import ScenarioLabError
from issue_scenario_lab.manifest.store import ManifestStore
from issue_scenario_lab.scenarios.no_consensus_basic import SCENARIO_ID
from issue_scenario_lab.scenarios.no_consensus_basic import generate as generate_no_consensus_basic

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

    if scenario_id != SCENARIO_ID:
        console.print(f"[red]Unsupported scenario:[/red] {scenario_id}. Supported: {SCENARIO_ID}")
        raise typer.Exit(code=1)
    try:
        settings = _settings()
        with SessionPool.from_settings(settings) as sessions:
            result = generate_no_consensus_basic(
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
            "scenarioId": SCENARIO_ID,
            "issueId": result.issue_id,
            "issueName": result.issue_name,
            "model": "BORDA",
            "experts": result.expert_aliases,
            "finalStage": "finished",
            "manifest": result.manifest_path,
        }
    )
