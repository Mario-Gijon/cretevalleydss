from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

from issue_scenario_lab.api.issues import IssuesApi
from issue_scenario_lab.api.session_pool import SessionPool
from issue_scenario_lab.errors import ScenarioLabError
from issue_scenario_lab.manifest.store import ManifestStore
from issue_scenario_lab.scenarios.ahp_sort_i_development_demos import (
    MODEL_KEY,
    WEIGHTING_MODEL_KEY,
    DemonstrationIssueResult,
    _compatible_models,
    _ensure_manifest_entry,
    _find_exact_issues,
    _id,
    _items,
    _run_sustainable,
    _select_existing_saaty_domain,
    _user_id_from_token,
    _validate_finished,
)
from issue_scenario_lab.scenarios.saaty_scale import is_saaty_scale_value

SCENARIO_ID = "ahp-sort-i-sustainable-multicriteria-v3"
ISSUE_NAME = "DEMO — GAHPSort — Sustainable Development — Multicriteria V3"
FIXTURE_PATH = Path(__file__).parents[3] / "data" / "ahp_sort_i_sustainable_multicriteria_v3.json"
EXPERT_ALIASES = ("expert_a", "expert_b", "expert_c")
ALTERNATIVES = ("Spain", "United Kingdom", "Croatia", "Norway", "Romania")
CATEGORIES = ("Bad", "Moderate", "Good")
EXPECTED_CRITERIA = (
    ("poverty", "People at risk of poverty or social exclusion", "cost"),
    ("obesity", "Obesity rate by BMI", "cost"),
    ("life_expectancy", "Life expectancy at birth", "benefit"),
    ("neet", "Young people not in employment, education or training (NEET)", "cost"),
    ("gender_gap", "Gender employment gap", "cost"),
    ("homicide", "Death rate due to homicide", "cost"),
)
EXPECTED_PROFILES = ("bad-moderate-boundary", "moderate-good-boundary")


def load_fixture(path: Path = FIXTURE_PATH) -> dict[str, Any]:
    try:
        fixture = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ScenarioLabError(f"unable to load the AHPSort I multicriteria fixture: {path}") from error
    validate_fixture(fixture)
    return fixture


def validate_fixture(fixture: Any) -> None:
    if not isinstance(fixture, dict) or fixture.get("schemaVersion") != 1:
        raise ScenarioLabError("AHPSort I multicriteria fixture must use schemaVersion 1")
    if fixture.get("scenarioId") != SCENARIO_ID or fixture.get("issueName") != ISSUE_NAME:
        raise ScenarioLabError("AHPSort I multicriteria fixture has an unexpected versioned identity")
    description = fixture.get("description")
    if not isinstance(description, str) or any(
        phrase not in description.casefold() for phrase in ("synthetic", "not empirical", "article")
    ):
        raise ScenarioLabError("AHPSort I multicriteria Issue must disclose its synthetic, non-empirical data")

    criteria = fixture.get("criteria")
    if not isinstance(criteria, list) or tuple(
        (item.get("key"), item.get("name"), item.get("type")) for item in criteria if isinstance(item, dict)
    ) != EXPECTED_CRITERIA:
        raise ScenarioLabError("AHPSort I multicriteria fixture must preserve the six Sustainable Development criteria")
    if fixture.get("alternatives") != list(ALTERNATIVES):
        raise ScenarioLabError("AHPSort I multicriteria fixture must preserve the five configured countries")
    if fixture.get("categories") != [
        {"categoryId": "bad", "label": "Bad", "order": 0},
        {"categoryId": "moderate", "label": "Moderate", "order": 1},
        {"categoryId": "good", "label": "Good", "order": 2},
    ]:
        raise ScenarioLabError("AHPSort I multicriteria fixture must use the ordered Bad/Moderate/Good categories")
    if tuple(item.get("profileId") for item in fixture.get("profiles", []) if isinstance(item, dict)) != EXPECTED_PROFILES:
        raise ScenarioLabError("AHPSort I multicriteria fixture must use the two consecutive limiting profiles")

    overrides = fixture.get("expertPairwiseOverrides")
    expected_weights = fixture.get("expectedAHPWeightsByExpert")
    expected_consistency = fixture.get("expectedConsistencyByExpert")
    expected_mcc = fixture.get("expectedMCCWeights")
    if not isinstance(overrides, dict) or set(overrides) != set(EXPERT_ALIASES):
        raise ScenarioLabError("AHPSort I multicriteria fixture must contain one AHP matrix per expert")
    if not isinstance(expected_weights, dict) or set(expected_weights) != set(EXPERT_ALIASES):
        raise ScenarioLabError("AHPSort I multicriteria fixture is missing its independent AHP weight references")
    if not isinstance(expected_consistency, dict) or set(expected_consistency) != set(EXPERT_ALIASES):
        raise ScenarioLabError("AHPSort I multicriteria fixture is missing its AHP consistency references")
    if not isinstance(expected_mcc, list) or len(expected_mcc) != len(criteria) or any(
        not isinstance(value, (int, float)) or value <= 0 for value in expected_mcc
    ) or not math.isclose(math.fsum(expected_mcc), 1, rel_tol=0, abs_tol=2e-7):
        raise ScenarioLabError("AHPSort I multicriteria fixture is missing normalized MCC reference weights")
    matrix_values_by_expert = {}
    expected_pair_count = len(criteria) * (len(criteria) - 1) // 2
    for alias in EXPERT_ALIASES:
        entries = overrides[alias]
        weights = expected_weights[alias]
        if not isinstance(entries, list) or len(entries) != expected_pair_count or not isinstance(weights, list) or len(weights) != len(criteria):
            raise ScenarioLabError(f"AHP weighting fixture for {alias} must include all criterion pairs and weights")
        pairs = set()
        for entry in entries:
            if not isinstance(entry, dict) or set(entry) != {"row", "column", "value"}:
                raise ScenarioLabError(f"AHP weighting fixture for {alias} contains an invalid pair")
            row, column, value = entry["row"], entry["column"], entry["value"]
            if not isinstance(row, int) or not isinstance(column, int) or not (0 <= row < column < len(criteria)):
                raise ScenarioLabError(f"AHP weighting fixture for {alias} contains an invalid criterion pair")
            if (row, column) in pairs or not is_saaty_scale_value(value):
                raise ScenarioLabError(f"AHP weighting fixture for {alias} has duplicate or non-Saaty judgments")
            pairs.add((row, column))
        if any(not isinstance(value, (int, float)) or value <= 0 for value in weights) or not math.isclose(math.fsum(weights), 1, abs_tol=2e-7):
            raise ScenarioLabError(f"AHP weight reference for {alias} is not a normalized positive vector")
        matrix_values_by_expert[alias] = [entry["value"] for entry in entries]
        consistency = expected_consistency[alias]
        if not isinstance(consistency, dict) or consistency.get("consistencyStatus") != "consistent" or consistency.get("consistencyRatio", 1) > 0.10:
            raise ScenarioLabError(f"AHP consistency reference for {alias} should be below the review threshold")
    if len({tuple(values) for values in matrix_values_by_expert.values()}) != len(EXPERT_ALIASES):
        raise ScenarioLabError("each expert must have a distinct criteria AHP matrix")

    by_expert = fixture.get("alternativeToProfileByExpert")
    if not isinstance(by_expert, dict) or set(by_expert) != set(EXPERT_ALIASES):
        raise ScenarioLabError("alternative judgments must be defined independently for each expert")
    criterion_keys = {item["key"] for item in criteria}
    for alias, alternatives in by_expert.items():
        if not isinstance(alternatives, dict) or set(alternatives) != set(ALTERNATIVES):
            raise ScenarioLabError(f"alternative judgments for {alias} must cover all five countries")
        for alternative, criteria_values in alternatives.items():
            if not isinstance(criteria_values, dict) or set(criteria_values) != criterion_keys:
                raise ScenarioLabError(f"alternative judgments for {alias}/{alternative} must cover all six criteria")
            for criterion_key, profile_values in criteria_values.items():
                if not isinstance(profile_values, dict) or set(profile_values) != set(EXPECTED_PROFILES):
                    raise ScenarioLabError(f"alternative judgments for {alias}/{alternative}/{criterion_key} must cover both profile IDs")
                if any(not is_saaty_scale_value(value) for value in profile_values.values()):
                    raise ScenarioLabError(f"alternative judgments for {alias}/{alternative}/{criterion_key} must use Saaty values")

    profile_comparisons = fixture.get("profileComparisonsByCriterion")
    if not isinstance(profile_comparisons, dict) or set(profile_comparisons) != criterion_keys:
        raise ScenarioLabError("profile preferences must be specified once per criterion")
    if any(not is_saaty_scale_value(value) or value >= 1 for value in profile_comparisons.values()):
        raise ScenarioLabError("ordered limiting profiles must retain a Saaty preference for the more preferred boundary")
    local_consistency = fixture.get("expectedLocalConsistency")
    expected_local_count = len(ALTERNATIVES) * len(criteria) * (len(EXPECTED_PROFILES) + 1) * len(EXPECTED_PROFILES) // 2
    if (
        not isinstance(local_consistency, dict)
        or local_consistency.get("matrixCount") != expected_local_count
        or local_consistency.get("reviewCount") != 0
        or not isinstance(local_consistency.get("maximumCR"), (int, float))
        or local_consistency["maximumCR"] > 1e-10
    ):
        raise ScenarioLabError("AHPSort I multicriteria local-matrix consistency reference is invalid")

    individual = fixture.get("expectedIndividualAssignmentsByExpert")
    expected_votes = fixture.get("expectedVotes")
    assignments = fixture.get("expectedAssignments")
    if not isinstance(individual, dict) or set(individual) != set(EXPERT_ALIASES) or not isinstance(expected_votes, dict) or not isinstance(assignments, dict):
        raise ScenarioLabError("AHPSort I multicriteria fixture is missing frozen classification references")
    for alternative in ALTERNATIVES:
        values = [individual[alias].get(alternative) for alias in EXPERT_ALIASES]
        if any(value not in CATEGORIES for value in values):
            raise ScenarioLabError(f"expected individual classifications are incomplete for {alternative}")
        counts = [values.count(label) for label in CATEGORIES]
        maximum = max(counts)
        winners = [index for index, count in enumerate(counts) if count == maximum]
        status = "unanimous" if maximum == 3 else "tied_plurality" if len(winners) > 1 else "unique_plurality"
        selected = CATEGORIES[winners[-1] if len(winners) > 1 else winners[0]]
        if expected_votes.get(alternative) != {"status": status, "categoryCounts": counts} or assignments.get(alternative) != selected:
            raise ScenarioLabError(f"frozen GAHPSort voting reference is inconsistent for {alternative}")
    if set(assignments) != set(ALTERNATIVES):
        raise ScenarioLabError("collective reference assignments must include all five countries")


def generate(
    sessions: SessionPool,
    store: ManifestStore,
    *,
    owner_alias: str = "owner",
    expert_a_alias: str = "expert_a",
    expert_b_alias: str = "expert_b",
    expert_c_alias: str = "expert_c",
) -> DemonstrationIssueResult:
    fixture = load_fixture()
    expert_aliases = (expert_a_alias, expert_b_alias, expert_c_alias)
    if expert_aliases != EXPERT_ALIASES or owner_alias in expert_aliases:
        raise ScenarioLabError("the validated V3 fixture requires distinct owner and expert_a/expert_b/expert_c accounts")
    aliases = (owner_alias, *expert_aliases)
    missing = [alias for alias in aliases if alias not in sessions.users]
    if missing:
        raise ScenarioLabError(f"{SCENARIO_ID} requires configured user aliases: {', '.join(missing)}")
    emails_by_alias = {alias: sessions.users[alias].email for alias in aliases}
    if len({email.casefold() for email in emails_by_alias.values()}) != len(emails_by_alias):
        raise ScenarioLabError("the V3 owner and experts must use distinct configured accounts")
    for alias in aliases:
        sessions.login(alias)

    owner_api = IssuesApi(sessions.client_for(owner_alias))
    model, weighting = _compatible_models(owner_api.models())
    if model.get("apiModelKey") != MODEL_KEY or weighting.get("apiModelKey") != WEIGHTING_MODEL_KEY:
        raise ScenarioLabError("AHPSort I/AHP weighting catalog selection changed unexpectedly")
    users = _items(owner_api.users(), "users")
    emails_in_catalog = {str(item.get("email", "")).casefold() for item in users}
    if any(email.casefold() not in emails_in_catalog for email in emails_by_alias.values()):
        raise ScenarioLabError("one or more configured V3 users are absent from the development user catalog")
    expert_ids_by_email = {
        emails_by_alias[alias].casefold(): _user_id_from_token(sessions.client_for(alias).access_token)
        for alias in aliases
    }
    domain = _select_existing_saaty_domain(owner_api.expression_domains(), model)

    active, finished = _find_exact_issues(owner_api, fixture["issueName"])
    del active
    existing = finished[0] if finished else None
    if existing:
        issue_id = _id(existing) or ""
        validated = _validate_finished(
            owner_api.finished_issue(issue_id),
            issue_id=issue_id,
            fixture=fixture,
            group=True,
            expert_aliases=expert_aliases,
            expert_emails_by_alias=emails_by_alias,
            expert_ids_by_email=expert_ids_by_email,
        )
        generation_id = _ensure_manifest_entry(
            store,
            issue_id=issue_id,
            issue_name=fixture["issueName"],
            aliases=aliases,
            scenario_id=SCENARIO_ID,
        )
        return DemonstrationIssueResult(
            generation_id,
            validated.issue_id,
            validated.issue_name,
            validated.assignments_by_alternative_name,
            validated.weights_by_criterion_name,
            validated.individual_assignments_by_expert,
            validated.votes_by_alternative,
            True,
            validated.individual_weights_by_expert,
            validated.consistency_by_expert,
        )

    return _run_sustainable(
        sessions=sessions,
        store=store,
        fixture=fixture,
        model=model,
        weighting=weighting,
        domain=domain,
        existing_finished=None,
        expert_aliases=expert_aliases,
        expert_emails_by_alias=emails_by_alias,
        expert_ids_by_email=expert_ids_by_email,
        owner_alias=owner_alias,
        scenario_id=SCENARIO_ID,
    )


__all__ = ["FIXTURE_PATH", "SCENARIO_ID", "ISSUE_NAME", "load_fixture", "validate_fixture", "generate"]
