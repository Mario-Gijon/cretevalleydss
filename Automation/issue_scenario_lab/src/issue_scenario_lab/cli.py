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
from issue_scenario_lab.scenarios.ahp_sort_i_development_demos import SCENARIO_ID as AHPSORT_I_DEMOS_SCENARIO_ID
from issue_scenario_lab.scenarios.ahp_sort_i_development_demos import generate as generate_ahpsort_i_development_demos
from issue_scenario_lab.scenarios.consensus_first_round import SCENARIO_ID as CONSENSUS_FIRST_ROUND_SCENARIO_ID
from issue_scenario_lab.scenarios.consensus_first_round import generate as generate_consensus_first_round
from issue_scenario_lab.scenarios.consensus_later_round import SCENARIO_ID as CONSENSUS_LATER_ROUND_SCENARIO_ID
from issue_scenario_lab.scenarios.consensus_later_round import generate as generate_consensus_later_round
from issue_scenario_lab.scenarios.consensus_max_rounds import SCENARIO_ID as CONSENSUS_MAX_ROUNDS_SCENARIO_ID
from issue_scenario_lab.scenarios.consensus_max_rounds import generate as generate_consensus_max_rounds
from issue_scenario_lab.scenarios.consensus_max_rounds import recover_finished as recover_consensus_max_rounds_finished
from issue_scenario_lab.scenarios.no_consensus_basic import SCENARIO_ID
from issue_scenario_lab.scenarios.no_consensus_basic import generate as generate_no_consensus_basic
from issue_scenario_lab.scenarios.no_consensus_criteria_weighting import SCENARIO_ID as CRITERIA_WEIGHTING_SCENARIO_ID
from issue_scenario_lab.scenarios.no_consensus_criteria_weighting import generate as generate_no_consensus_criteria_weighting
from issue_scenario_lab.scenarios.no_consensus_expert_weights import SCENARIO_ID as EXPERT_WEIGHTS_SCENARIO_ID
from issue_scenario_lab.scenarios.no_consensus_expert_weights import generate as generate_no_consensus_expert_weights
from issue_scenario_lab.scenarios.topsis_2tuple_greece import SCENARIO_ID as TOPSIS_2TUPLE_GREECE_SCENARIO_ID
from issue_scenario_lab.scenarios.topsis_2tuple_greece import generate as generate_topsis_2tuple_greece
from issue_scenario_lab.scenarios.topsis_sort_2016 import SCENARIO_ID as TOPSIS_SORT_2016_SCENARIO_ID
from issue_scenario_lab.scenarios.topsis_sort_2016 import generate as generate_topsis_sort_2016
from issue_scenario_lab.scenarios.topsis_sort_2016_rich import SCENARIO_ID as TOPSIS_SORT_2016_RICH_SCENARIO_ID
from issue_scenario_lab.scenarios.topsis_sort_2016_rich import generate as generate_topsis_sort_2016_rich
from issue_scenario_lab.scenarios.topsis_sort_2016_tehran import SCENARIO_ID as TOPSIS_SORT_2016_TEHRAN_SCENARIO_ID
from issue_scenario_lab.scenarios.topsis_sort_2016_tehran import generate as generate_topsis_sort_2016_tehran
from issue_scenario_lab.scenarios.two_tuple_greece import SCENARIO_ID as TWO_TUPLE_GREECE_SCENARIO_ID
from issue_scenario_lab.scenarios.two_tuple_greece import generate as generate_two_tuple_greece
from issue_scenario_lab.scenarios.two_tuple_greece_video import SCENARIO_ID as TWO_TUPLE_GREECE_VIDEO_SCENARIO_ID
from issue_scenario_lab.scenarios.two_tuple_greece_video import generate as generate_two_tuple_greece_video

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
def delete(generation_id: str, allow_legacy_manifest_entry: bool = typer.Option(False, "--allow-legacy-manifest-entry")) -> None:
    """Hide and permanently remove one generated finished issue through the Backend."""

    try:
        settings = _settings()
        with SessionPool.from_settings(settings) as sessions:
            result = delete_finished_generation(
                sessions, ManifestStore(settings.manifest_file), generation_id, allow_legacy_manifest_entry=allow_legacy_manifest_entry
            )
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


@app.command("recover-finished")
def recover_finished(
    scenario_id: str,
    generation_id: str = typer.Option(..., "--generation-id"),
    issue_id: str = typer.Option(..., "--issue-id"),
    owner_alias: str = "owner",
    expert_a_alias: str = "expert_a",
    expert_b_alias: str = "expert_b",
) -> None:
    """Validate and register one Finished scenario that was not recorded locally."""

    if scenario_id != CONSENSUS_MAX_ROUNDS_SCENARIO_ID:
        _raise_cli_error(ScenarioLabError(f"Unsupported recovery scenario: {scenario_id}. Supported: {CONSENSUS_MAX_ROUNDS_SCENARIO_ID}"))
    try:
        settings = _settings()
        with SessionPool.from_settings(settings) as sessions:
            result = recover_consensus_max_rounds_finished(
                sessions,
                ManifestStore(settings.manifest_file),
                generation_id=generation_id,
                issue_id=issue_id,
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
            "recovered": result.recovered,
            "finalConsensusPhase": 3,
            "consensusReached": False,
            "finalizationReason": "maxPhasesReached",
            "finalStage": "finished",
            "manifest": result.manifest_path,
        }
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
    expert_c_alias: str = "expert_c",
    expert_d_alias: str = "expert_d",
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
        CONSENSUS_MAX_ROUNDS_SCENARIO_ID: (
            generate_consensus_max_rounds,
            {
                "model": "Herrera Viedma CRP",
                "consensusThreshold": 0.9,
                "consensusMaxPhases": 3,
                "finalConsensusPhase": 3,
                "consensusReached": False,
                "finalizationReason": "maxPhasesReached",
            },
        ),
        TOPSIS_2TUPLE_GREECE_SCENARIO_ID: (
            generate_topsis_2tuple_greece,
            {"model": "2-TUPLE TOPSIS", "criteriaWeightingModel": "Preference Order Criteria Weights"},
        ),
        TOPSIS_SORT_2016_SCENARIO_ID: (
            generate_topsis_sort_2016,
            {
                "model": "TOPSIS-Sort 2016",
                "criteriaWeights": {"Quality": 0.6, "Cost": 0.4},
                "resultStructure": "sorting@1",
                "consensus": False,
            },
        ),
        TOPSIS_SORT_2016_RICH_SCENARIO_ID: (
            generate_topsis_sort_2016_rich,
            {
                "model": "TOPSIS-Sort 2016",
                "criteriaWeightingModel": "manual_criteria_weights (MCC)",
                "alternatives": 10,
                "criteria": 6,
                "categories": 5,
                "profiles": 4,
                "consensus": False,
            },
        ),
        TOPSIS_SORT_2016_TEHRAN_SCENARIO_ID: (
            generate_topsis_sort_2016_tehran,
            {
                "model": "TOPSIS-Sort 2016",
                "source": "Sabokbar et al. (2016), Tehran example, Tables 1–5",
                "alternatives": 22,
                "criteria": 5,
                "criteriaWeights": {"g1": 0.2, "g2": 0.2, "g3": 0.2, "g4": 0.2, "g5": 0.2},
                "experts": 1,
                "consensus": False,
                "resultStructure": "sorting@1",
            },
        ),
        TWO_TUPLE_GREECE_SCENARIO_ID: (
            generate_two_tuple_greece,
            {
                "model": "2-Tuple Linguistic Model",
                "criteriaWeightingModel": "Preference Order Criteria Weights",
                "parentCriteria": 7,
                "leafCriteria": 18,
                "alternatives": 5,
            },
        ),
        TWO_TUPLE_GREECE_VIDEO_SCENARIO_ID: (
            generate_two_tuple_greece_video,
            {"model": "2-Tuple Linguistic Model", "criteriaWeightingModel": "Preference Order Criteria Weights", "experts": 5},
        ),
        AHPSORT_I_DEMOS_SCENARIO_ID: (
            generate_ahpsort_i_development_demos,
            {
                "models": ["AHPSort I", "AHP Criteria Weights"],
                "issues": 2,
                "individualSupplierExperts": 1,
                "groupExperts": 3,
                "groupWeighting": "AHP + MCC",
                "groupClassification": "unweighted plurality, optimistic tie policy",
                "consensus": False,
            },
        ),
    }
    selected = generators.get(scenario_id)
    if selected is None:
        console.print(f"[red]Unsupported scenario:[/red] {scenario_id}. Supported: {', '.join(generators)}")
        raise typer.Exit(code=1)
    try:
        settings = _settings()
        with SessionPool.from_settings(settings) as sessions:
            kwargs = (
                {"owner_alias": "owner"}
                if scenario_id in {TOPSIS_2TUPLE_GREECE_SCENARIO_ID, TWO_TUPLE_GREECE_SCENARIO_ID, TWO_TUPLE_GREECE_VIDEO_SCENARIO_ID}
                else (
                    {"owner_alias": owner_alias, "expert_alias": expert_a_alias}
                    if scenario_id == TOPSIS_SORT_2016_TEHRAN_SCENARIO_ID
                    else (
                        {
                            "owner_alias": owner_alias,
                            "expert_a_alias": expert_a_alias,
                            "expert_b_alias": expert_b_alias,
                            "expert_c_alias": expert_c_alias,
                            "expert_d_alias": expert_d_alias,
                        }
                        if scenario_id == TOPSIS_SORT_2016_RICH_SCENARIO_ID
                        else (
                            {
                                "owner_alias": owner_alias,
                                "supplier_expert_alias": expert_a_alias,
                                "group_expert_aliases": (expert_a_alias, expert_b_alias, expert_c_alias),
                            }
                            if scenario_id == AHPSORT_I_DEMOS_SCENARIO_ID
                            else {"owner_alias": owner_alias, "expert_a_alias": expert_a_alias, "expert_b_alias": expert_b_alias}
                        )
                    )
                )
            )
            result = selected[0](sessions, ManifestStore(settings.manifest_file), **kwargs)
    except ScenarioLabError as error:
        _raise_cli_error(error)
    if scenario_id == AHPSORT_I_DEMOS_SCENARIO_ID:
        console.print({
            "scenarioId": scenario_id,
            **selected[1],
            "supplier": {
                "generationId": result.supplier.generation_id,
                "issueId": result.supplier.issue_id,
                "issueName": result.supplier.issue_name,
                "assignments": result.supplier.assignments_by_alternative_name,
                "AHPWeights": result.supplier.weights_by_criterion_name,
                "reusedExistingIssue": result.supplier.reused_existing_issue,
            },
            "sustainableDevelopment": {
                "generationId": result.sustainable.generation_id,
                "issueId": result.sustainable.issue_id,
                "issueName": result.sustainable.issue_name,
                "assignments": result.sustainable.assignments_by_alternative_name,
                "individualAssignments": result.sustainable.individual_assignments_by_expert,
                "MCCWeights": result.sustainable.weights_by_criterion_name,
                "votes": result.sustainable.votes_by_alternative,
                "reusedExistingIssue": result.sustainable.reused_existing_issue,
            },
            "finalStage": "finished",
            "manifest": result.manifest_path,
        })
        return
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
            **(
                {"assignments": result.assignments_by_alternative_name}
                if scenario_id in {TOPSIS_SORT_2016_SCENARIO_ID, TOPSIS_SORT_2016_RICH_SCENARIO_ID, TOPSIS_SORT_2016_TEHRAN_SCENARIO_ID}
                else {}
            ),
            **(
                {
                    "maxTable3AbsoluteDifference": result.max_table_3_absolute_difference,
                    "maxTable4DistanceAbsoluteDifference": result.max_table_4_distance_absolute_difference,
                    "maxTable4ClosenessAbsoluteDifference": result.max_table_4_closeness_absolute_difference,
                }
                if scenario_id == TOPSIS_SORT_2016_TEHRAN_SCENARIO_ID
                else {}
            ),
            **(
                {
                    "expressionDomain": {
                        "name": result.expression_domain_name,
                        "typeKey": "numericContinuous",
                        "range": result.expression_domain_range,
                        "createdForThisGeneration": result.expression_domain_created,
                    }
                }
                if scenario_id == TOPSIS_SORT_2016_TEHRAN_SCENARIO_ID
                else {}
            ),
            **({"collectiveCriteriaWeights": result.collective_weights_by_criterion_name} if scenario_id == TOPSIS_SORT_2016_RICH_SCENARIO_ID else {}),
            **({"offlineValidation": result.offline_validation} if scenario_id == TOPSIS_SORT_2016_RICH_SCENARIO_ID else {}),
        }
    )
