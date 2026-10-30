from __future__ import annotations

import base64
import binascii
import json
import math
import secrets
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from issue_scenario_lab.api.issues import IssuesApi
from issue_scenario_lab.api.session_pool import SessionPool
from issue_scenario_lab.errors import ManifestError, ScenarioLabError
from issue_scenario_lab.manifest.models import GeneratedIssue
from issue_scenario_lab.manifest.store import ManifestStore
from issue_scenario_lab.scenarios.no_consensus_basic import _id, _items
from issue_scenario_lab.scenarios.saaty_scale import (
    AHP_SAATY_DOMAIN_NAME,
    AHP_SAATY_SCALE_KEY,
    is_saaty_scale_value,
)

SCENARIO_ID = "ahp-sort-i-development-demos-saaty-v2"
MODEL_KEY = "ahp_sort_i"
WEIGHTING_MODEL_KEY = "ahp_criteria_weights"
RESULT_STRUCTURE_KEY = "sorting"
RESULT_STRUCTURE_VERSION = 1
CRITERIA_STAGE = "criteriaWeighting"
ALTERNATIVE_STAGE = "alternativeEvaluation"
FIXTURE_PATH = Path(__file__).parents[3] / "data" / "ahp_sort_i_development_demos.json"
SUPPLIER_ISSUE_NAME = "DEMO — AHPSort I — Supplier Pre-qualification (2012) — AHP Saaty Scale"
SUSTAINABLE_ISSUE_NAME = "DEMO — GAHPSort — Sustainable Development (2021) — AHP Saaty Scale"


@dataclass(frozen=True)
class DemonstrationIssueResult:
    generation_id: str
    issue_id: str
    issue_name: str
    assignments_by_alternative_name: dict[str, str]
    weights_by_criterion_name: dict[str, float]
    individual_assignments_by_expert: dict[str, dict[str, str]]
    votes_by_alternative: dict[str, dict[str, Any]]
    reused_existing_issue: bool


@dataclass(frozen=True)
class DemonstrationsResult:
    supplier: DemonstrationIssueResult
    sustainable: DemonstrationIssueResult
    manifest_path: str


def load_fixture(path: Path = FIXTURE_PATH) -> dict[str, Any]:
    try:
        fixture = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ScenarioLabError(f"unable to load AHPSort I development demonstration fixture: {path}") from error
    validate_fixture(fixture)
    return fixture


def validate_fixture(fixture: Any) -> None:
    if not isinstance(fixture, dict) or fixture.get("schemaVersion") != 2:
        raise ScenarioLabError("AHPSort I Saaty-scale demonstration fixture must use schemaVersion 2")
    supplier = fixture.get("supplierPrequalification")
    sustainable = fixture.get("sustainableDevelopment")
    if not isinstance(supplier, dict) or supplier.get("issueName") != SUPPLIER_ISSUE_NAME:
        raise ScenarioLabError("supplier demonstration fixture has an unexpected issue identity")
    if not isinstance(sustainable, dict) or sustainable.get("issueName") != SUSTAINABLE_ISSUE_NAME:
        raise ScenarioLabError("sustainable-development fixture has an unexpected issue identity")

    supplier_criteria = supplier.get("criteria")
    supplier_alternatives = supplier.get("alternatives")
    supplier_judgments = supplier.get("alternativeToProfileByAlternative")
    if (
        not isinstance(supplier_criteria, list)
        or len(supplier_criteria) != 5
        or [item.get("name") for item in supplier_criteria]
        != ["Experience", "Flexibility", "Security", "Resilience", "Environment"]
        or not isinstance(supplier_alternatives, list)
        or supplier_alternatives != [f"Supplier {letter}" for letter in "ABCDEFGHIJKL"]
        or not isinstance(supplier_judgments, dict)
        or set(supplier_judgments) != set(supplier_alternatives)
        or len(supplier.get("criterionPairwiseJudgments", [])) != 10
        or len(supplier.get("expectedAHPWeights", [])) != 5
        or len(supplier.get("categories", [])) != 2
        or len(supplier.get("profiles", [])) != 1
    ):
        raise ScenarioLabError("supplier demonstration must preserve the original five-criterion, twelve-supplier case")
    for alternative, values in supplier_judgments.items():
        if not isinstance(values, list) or len(values) != len(supplier_criteria) or any(not _is_saaty(value) for value in values):
            raise ScenarioLabError(f"supplier judgments for {alternative} must be five valid Saaty values")
    if supplier.get("expectedAssignments") != {
        **{f"Supplier {letter}": "Accepted" for letter in "ABCDEFG"},
        **{f"Supplier {letter}": "Rejected" for letter in "HIJKL"},
    }:
        raise ScenarioLabError("supplier expected assignments must preserve the published A–G/H–L split")

    criteria = sustainable.get("criteria")
    alternatives = sustainable.get("alternatives")
    votes = sustainable.get("categoryVotesByAlternative")
    if (
        not isinstance(criteria, list)
        or len(criteria) != 6
        or any(not isinstance(item.get("name"), str) or len(item["name"]) > 60 for item in criteria)
        or not isinstance(alternatives, list)
        or alternatives != ["Spain", "United Kingdom", "Croatia", "Norway", "Romania"]
        or not isinstance(votes, dict)
        or set(votes) != set(alternatives)
        or any(not isinstance(votes[name], list) or len(votes[name]) != 3 for name in alternatives)
        or len(sustainable.get("categories", [])) != 3
        or len(sustainable.get("profiles", [])) != 2
        or not isinstance(sustainable.get("expertPairwiseOverrides"), dict)
        or set(sustainable["expertPairwiseOverrides"]) != {"expert_a", "expert_b", "expert_c"}
        or len(sustainable.get("expectedMCCWeights", [])) != 6
    ):
        raise ScenarioLabError("sustainable-development fixture must define five alternatives, six criteria and three experts")
    if not isinstance(sustainable.get("description"), str) or "synthetic" not in sustainable["description"].casefold():
        raise ScenarioLabError("sustainable-development demonstration must disclose its synthetic judgments")
    if sustainable.get("expectedAssignments") != {
        "Spain": "Bad",
        "United Kingdom": "Moderate",
        "Croatia": "Good",
        "Norway": "Good",
        "Romania": "Bad",
    }:
        raise ScenarioLabError("sustainable-development expected collective assignments are invalid")


def _is_saaty(value: Any) -> bool:
    return is_saaty_scale_value(value)


def _require_unique_model(response: Any, model_key: str, collection_key: str) -> dict[str, Any]:
    matches = [item for item in _items(response, collection_key) if item.get("apiModelKey") == model_key]
    if len(matches) != 1 or not _id(matches[0]):
        raise ScenarioLabError(f"expected exactly one configured model for apiModelKey '{model_key}'")
    return matches[0]


def _compatible_models(response: Any) -> tuple[dict[str, Any], dict[str, Any]]:
    model = _require_unique_model(response, MODEL_KEY, "models")
    weighting = _require_unique_model(response, WEIGHTING_MODEL_KEY, "criteriaWeightingModels")
    checks = {
        "modelKind": model.get("modelKind") == "issue",
        "ready": model.get("implementationStatus") == "ready",
        "publicUsable": model.get("publicUsable") is True,
        "issueExecutionAuthorized": model.get("issueExecutionAuthorized") is True,
        "visibleInIssueCreation": model.get("visibleInIssueCreation") is not False,
        "sorting@1": model.get("resultStructureKey") == RESULT_STRUCTURE_KEY and model.get("resultStructureVersion") == RESULT_STRUCTURE_VERSION,
        "evaluationStructure": model.get("evaluationStructureKey") == "ahpSortAlternativeProfiles",
        "consensusDisabled": model.get("supportsConsensus") is False and model.get("supportsConsensusSimulation") is False,
        "criterionWeights": model.get("usesCriteriaWeights") is True,
        "supportedSaatyDomain": any(
            isinstance(item, dict)
            and item.get("typeKey") == "numericSaaty"
            and item.get("constraints") == {"scale": AHP_SAATY_SCALE_KEY}
            for item in model.get("supportedExpressionDomains", [])
        ),
    }
    weighting_checks = {
        "ready": weighting.get("implementationStatus") == "ready",
        "creatorAHP": weighting.get("supportsCreatorCriteriaWeighting") is True,
        "expertAHP": weighting.get("supportsExpertCriteriaWeighting") is True,
        "criteriaPairwiseAHP": weighting.get("evaluationStructureKey") == "criteriaPairwiseAHP",
    }
    failed = [f"AHPSort I {key}" for key, okay in checks.items() if not okay]
    failed.extend(f"AHP weighting {key}" for key, okay in weighting_checks.items() if not okay)
    if failed:
        raise ScenarioLabError("model catalog is not compatible: " + ", ".join(failed))
    return model, weighting


def _select_existing_saaty_domain(domains: Any, model: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(domains, dict):
        raise ScenarioLabError("Backend expression-domain response must be an object")
    supported = [
        item
        for item in model.get("supportedExpressionDomains", [])
        if isinstance(item, dict) and isinstance(item.get("typeKey"), str)
    ]
    global_domains = _items(domains, "globals")
    compatible = [
        domain
        for domain in global_domains
        if _id(domain)
        and isinstance(domain.get("definition"), dict)
        and domain.get("name") == AHP_SAATY_DOMAIN_NAME
        and domain.get("typeKey") == "numericSaaty"
        and domain.get("definition") == {"scale": AHP_SAATY_SCALE_KEY}
        and any(
            supported_entry.get("typeKey") == "numericSaaty"
            and supported_entry.get("constraints") == {"scale": AHP_SAATY_SCALE_KEY}
            for supported_entry in supported
        )
    ]
    if len(compatible) != 1:
        raise ScenarioLabError(
            "expected exactly one global AHP Saaty Scale domain; the generator will not create or substitute one"
        )
    return compatible[0]


def _saaty_comparisons(
    criteria: list[dict[str, Any]],
    *,
    upper_triangle_values: list[float] | None = None,
    overrides: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    values = upper_triangle_values or []
    overrides_by_pair = {
        (int(item["row"]), int(item["column"])): item["value"]
        for item in (overrides or [])
    }
    comparisons = []
    index = 0
    for row in range(len(criteria)):
        for column in range(row + 1, len(criteria)):
            value = overrides_by_pair.get((row, column))
            if value is None:
                if not upper_triangle_values:
                    value = 1
                else:
                    value = values[index]
            if not _is_saaty(value):
                raise ScenarioLabError("criteria weighting must use the original Saaty fundamental scale")
            comparisons.append({
                "criterionId": criteria[row]["id"],
                "comparedCriterionId": criteria[column]["id"],
                "value": float(value),
            })
            index += 1
    if upper_triangle_values is not None and index != len(upper_triangle_values):
        raise ScenarioLabError("criteria AHP judgment count does not match the number of criterion pairs")
    if len(overrides_by_pair) != len(overrides or []):
        raise ScenarioLabError("criteria AHP pairwise overrides contain duplicate pairs")
    return comparisons


def _criterion_pairwise_weights_payload(fixture: dict[str, Any], weighting_model_id: str, *, group: bool) -> dict[str, Any]:
    config: dict[str, Any] = {
        "mode": "expertApiModel" if group else "creatorApiModel",
        "source": "experts" if group else "creator",
        "method": "apiModel",
        "structureKey": "criteriaPairwiseAHP",
        "criteriaWeightingModelId": weighting_model_id,
        "criteriaWeightingModelKey": WEIGHTING_MODEL_KEY,
        "criteriaWeightingParameters": {},
        "level": "leaf",
        "payload": {},
    }
    if not group:
        criteria = [{"id": f"criterion-{item['key']}"} for item in fixture["criteria"]]
        config["payload"] = {
            "comparisons": _saaty_comparisons(
                criteria,
                upper_triangle_values=fixture["criterionPairwiseJudgments"],
            )
        }
    return config


def _issue_payload(
    *,
    fixture: dict[str, Any],
    model_id: str,
    weighting_model_id: str,
    expert_emails: list[str],
    domain_id: str,
    group: bool,
) -> dict[str, Any]:
    criterion_ids = {item["key"]: f"criterion-{item['key']}" for item in fixture["criteria"]}
    parameters: dict[str, Any] = {
        "orderedCategories": fixture["categories"],
        "ahpSortProfiles": {"mode": "limiting", "profiles": fixture["profiles"]},
    }
    if group:
        parameters["ahpSortGroup"] = {"tiePolicy": "optimistic"}
    root_name = "Supplier pre-qualification" if not group else "Sustainable development"
    return {
        "issueName": fixture["issueName"],
        "issueDescription": fixture["description"],
        "selectedModelId": model_id,
        "alternatives": [{"name": name, "description": ""} for name in fixture["alternatives"]],
        "criteria": [{
            "id": f"criterion-root-{SCENARIO_ID}",
            "name": root_name,
            "type": "group",
            "children": [{
                "id": criterion_ids[item["key"]],
                "name": item["name"],
                "type": item["type"],
                "children": [],
            } for item in fixture["criteria"]],
        }],
        "addedExperts": expert_emails,
        "expressionDomainConfig": {"mode": "global", "globalDomainId": domain_id},
        "closureDate": None,
        "isConsensus": False,
        "simulateConsensus": False,
        "paramValues": parameters,
        "criteriaWeightingParameters": {},
        "criteriaWeightingConfig": _criterion_pairwise_weights_payload(fixture, weighting_model_id, group=group),
    }


def _validate_active_identity(active: dict[str, Any], fixture: dict[str, Any], *, group: bool) -> None:
    params = active.get("modelParameters")
    expected_group = {"tiePolicy": "optimistic"} if group else None
    if (
        active.get("name") != fixture["issueName"]
        or active.get("isConsensus") is not False
        or active.get("resultStructureKey") != RESULT_STRUCTURE_KEY
        or active.get("resultStructureVersion") != RESULT_STRUCTURE_VERSION
        or not isinstance(params, dict)
        or params.get("orderedCategories") != fixture["categories"]
        or params.get("ahpSortProfiles") != {"mode": "limiting", "profiles": fixture["profiles"]}
        or (params.get("ahpSortGroup") if group else None) != expected_group
    ):
        raise ScenarioLabError(f"active issue named '{fixture['issueName']}' does not match this demonstration; it was left untouched")


def _resolve_context_entities(response: Any, stage: str, issue_id: str) -> tuple[dict[str, Any], list[dict[str, Any]], list[dict[str, Any]]]:
    if not isinstance(response, dict) or response.get("stage") != stage or response.get("consensusPhase") != 0:
        raise ScenarioLabError(f"{stage} evaluation context is incompatible")
    context = response.get("decisionContext")
    issue = context.get("issue") if isinstance(context, dict) else None
    if not isinstance(issue, dict) or _id(issue) != issue_id or issue.get("currentStage") != stage or issue.get("isConsensus") is not False:
        raise ScenarioLabError(f"{stage} context does not identify the active non-consensus issue")
    criteria = _items(context, "leafCriteria") or _items(context, "criteriaWeightingCriteria")
    if any("isLeaf" in item for item in criteria):
        criteria = [item for item in criteria if item.get("isLeaf") is True]
    alternatives = _items(context, "alternatives")
    return context, criteria, alternatives


def _criterion_ids_by_key(criteria: list[dict[str, Any]], fixture: dict[str, Any]) -> dict[str, str]:
    by_name = {item.get("name"): item for item in criteria}
    if len(criteria) != len(fixture["criteria"]) or set(by_name) != {item["name"] for item in fixture["criteria"]}:
        raise ScenarioLabError("evaluation context does not contain exactly the configured leaf criteria")
    output = {item["key"]: _id(by_name[item["name"]]) or "" for item in fixture["criteria"]}
    if any(not value for value in output.values()) or len(set(output.values())) != len(output):
        raise ScenarioLabError("Backend did not return unique persisted IDs for every leaf criterion")
    return output


def _alternative_ids_by_name(alternatives: list[dict[str, Any]], fixture: dict[str, Any]) -> dict[str, str]:
    by_name = {item.get("name"): item for item in alternatives}
    if len(alternatives) != len(fixture["alternatives"]) or set(by_name) != set(fixture["alternatives"]):
        raise ScenarioLabError("evaluation context does not contain exactly the configured alternatives")
    output = {name: _id(by_name[name]) or "" for name in fixture["alternatives"]}
    if any(not value for value in output.values()) or len(set(output.values())) != len(output):
        raise ScenarioLabError("Backend did not return unique persisted IDs for every alternative")
    return output


def _resolve_profiles(context: dict[str, Any], fixture: dict[str, Any]) -> list[dict[str, Any]]:
    params = context.get("modelParameters")
    profile_config = params.get("ahpSortProfiles") if isinstance(params, dict) else None
    if not isinstance(profile_config, dict) or profile_config.get("mode") != "limiting":
        raise ScenarioLabError("evaluation context does not use AHPSort I limiting profiles")
    profiles = profile_config.get("profiles")
    if not isinstance(profiles, list) or len(profiles) != len(fixture["profiles"]):
        raise ScenarioLabError("evaluation context has an unexpected limiting profile count")
    by_id = {item.get("profileId"): item for item in profiles if isinstance(item, dict)}
    expected = {item["profileId"]: item for item in fixture["profiles"]}
    if set(by_id) != set(expected):
        raise ScenarioLabError("evaluation context profile IDs differ from the configured demonstration")
    ordered = []
    for profile in fixture["profiles"]:
        actual = by_id[profile["profileId"]]
        if any(actual.get(key) != profile[key] for key in ("lowerCategoryId", "upperCategoryId")):
            raise ScenarioLabError("evaluation context profile category boundaries differ from the fixture")
        ordered.append(actual)
    return ordered


def _alternative_evaluation_payload(
    *,
    context: dict[str, Any],
    alternatives: list[dict[str, Any]],
    criteria: list[dict[str, Any]],
    fixture: dict[str, Any],
    expert_alias: str | None,
    group: bool,
) -> dict[str, Any]:
    alternative_ids = _alternative_ids_by_name(alternatives, fixture)
    criterion_ids = _criterion_ids_by_key(criteria, fixture)
    profiles = _resolve_profiles(context, fixture)
    if group:
        votes = fixture["categoryVotesByAlternative"]
        value_by_category = {"Bad": 1 / 9, "Moderate": 1, "Good": 9}
        if expert_alias not in {"expert_a", "expert_b", "expert_c"}:
            raise ScenarioLabError("group AHPSort I fixture requires expert_a, expert_b and expert_c")
        expert_index = ["expert_a", "expert_b", "expert_c"].index(expert_alias)
        judgments = {
            alternative: value_by_category[votes[alternative][expert_index]]
            for alternative in fixture["alternatives"]
        }
    else:
        judgments = fixture["alternativeToProfileByAlternative"]

    alternative_rows = []
    for alternative_name in fixture["alternatives"]:
        values = judgments[alternative_name]
        if not group and len(values) != len(criteria):
            raise ScenarioLabError(f"alternative judgments for {alternative_name} are incomplete")
        for criterion_index, criterion in enumerate(fixture["criteria"]):
            value = values[criterion_index] if not group else values
            for profile in profiles:
                alternative_rows.append({
                    "alternativeId": alternative_ids[alternative_name],
                    "criterionId": criterion_ids[criterion["key"]],
                    "profileId": profile["profileId"],
                    "alternativeToProfile": value,
                })
    profile_rows = []
    for criterion in fixture["criteria"]:
        for first_index, first in enumerate(profiles):
            for second in profiles[first_index + 1:]:
                profile_rows.append({
                    "criterionId": criterion_ids[criterion["key"]],
                    "firstProfileId": first["profileId"],
                    "secondProfileId": second["profileId"],
                    "firstToSecond": 1 / 3,
                })
    return {"alternativeProfileComparisons": alternative_rows, "profileComparisons": profile_rows}


def _same_saaty_payload(actual: Any, expected: list[dict[str, Any]]) -> bool:
    if not isinstance(actual, dict) or set(actual) != {"comparisons"} or not isinstance(actual["comparisons"], list):
        return False
    def normalize(rows: list[dict[str, Any]]) -> dict[tuple[Any, Any], float]:
        return {
            (row.get("criterionId"), row.get("comparedCriterionId")): float(row.get("value"))
            for row in rows
            if isinstance(row, dict) and isinstance(row.get("value"), (int, float))
        }

    return normalize(actual["comparisons"]) == normalize(expected) and len(actual["comparisons"]) == len(expected)


def _same_alternative_payload(actual: Any, expected: dict[str, Any]) -> bool:
    if not isinstance(actual, dict) or set(actual) != set(expected):
        return False
    for field in expected:
        actual_rows, expected_rows = actual.get(field), expected[field]
        if not isinstance(actual_rows, list) or len(actual_rows) != len(expected_rows):
            return False
        key_fields = (
            ("alternativeId", "criterionId", "profileId")
            if field == "alternativeProfileComparisons"
            else ("criterionId", "firstProfileId", "secondProfileId")
        )
        indexed = {tuple(row.get(key) for key in key_fields): row for row in actual_rows if isinstance(row, dict)}
        if len(indexed) != len(actual_rows):
            return False
        for expected_row in expected_rows:
            key = tuple(expected_row[key] for key in key_fields)
            row = indexed.get(key)
            value_field = "alternativeToProfile" if field == "alternativeProfileComparisons" else "firstToSecond"
            if (
                row is None
                or not isinstance(row.get(value_field), (int, float))
                or not math.isclose(
                    float(row[value_field]),
                    float(expected_row[value_field]),
                    rel_tol=0,
                    abs_tol=1e-12,
                )
            ):
                return False
    return True


def _validate_sorting_output(output: Any, fixture: dict[str, Any], alternatives_by_name: dict[str, str]) -> tuple[dict[str, str], dict[str, Any]]:
    categories = fixture["categories"]
    if not isinstance(output, dict) or output.get("categories") != categories:
        raise ScenarioLabError("AHPSort I result categories differ from the configured preference order")
    assignments = output.get("assignments")
    if not isinstance(assignments, list) or len(assignments) != len(fixture["alternatives"]):
        raise ScenarioLabError("AHPSort I result must contain one assignment per alternative")
    category_by_id = {item["categoryId"]: item["label"] for item in categories}
    name_by_id = {identifier: name for name, identifier in alternatives_by_name.items()}
    actual: dict[str, str] = {}
    for item in assignments:
        if not isinstance(item, dict) or item.get("alternativeId") not in name_by_id or item.get("categoryId") not in category_by_id:
            raise ScenarioLabError("AHPSort I result contains an unknown alternative or category ID")
        name = name_by_id[item["alternativeId"]]
        if name in actual:
            raise ScenarioLabError(f"AHPSort I result assigns {name} more than once")
        actual[name] = category_by_id[item["categoryId"]]
    if actual != fixture["expectedAssignments"]:
        raise ScenarioLabError(f"AHPSort I assignments differ from the expected demonstration: {actual}")
    diagnostics = output.get("diagnostics")
    if not isinstance(diagnostics, dict):
        raise ScenarioLabError("AHPSort I result diagnostics are missing")
    return actual, diagnostics


def _weights_by_name(detail: dict[str, Any], fixture: dict[str, Any], expected: list[float], *, group: bool) -> dict[str, float]:
    criteria = detail.get("criteria")
    nodes = _items(criteria, "nodes") if isinstance(criteria, dict) else []
    by_name = {item.get("name"): item for item in nodes if item.get("isLeaf") is True}
    if set(by_name) != {item["name"] for item in fixture["criteria"]}:
        raise ScenarioLabError("Finished Issue does not preserve all expected leaf criteria")
    by_id = criteria.get("finalWeights", {}).get("byCriterionId") if isinstance(criteria, dict) else None
    if not isinstance(by_id, dict):
        raise ScenarioLabError("Finished Issue does not preserve final criterion weights")
    weights = {}
    for index, criterion in enumerate(fixture["criteria"]):
        criterion_id = _id(by_name[criterion["name"]])
        value = by_id.get(criterion_id)
        if not _finite(value) or not math.isclose(float(value), float(expected[index]), rel_tol=0, abs_tol=2e-7):
            kind = "MCC" if group else "AHP"
            raise ScenarioLabError(f"{kind} weight for {criterion['name']} differs from the validated reference: {value}")
        weights[criterion["name"]] = float(value)
    if not math.isclose(math.fsum(weights.values()), 1.0, rel_tol=0, abs_tol=2e-7):
        raise ScenarioLabError("Finished Issue criterion weights are not normalized")
    return weights


def _validate_group_votes(
    diagnostics: dict[str, Any],
    *,
    fixture: dict[str, Any],
    alternative_ids_by_name: dict[str, str],
    category_ids_by_label: dict[str, str],
    expert_ids_by_alias: dict[str, str],
) -> tuple[dict[str, dict[str, str]], dict[str, dict[str, Any]]]:
    if diagnostics.get("groupTiePolicy") != "optimistic" or diagnostics.get("aggregationMethod") != "unweighted_plurality_vote":
        raise ScenarioLabError("group result does not use optimistic, unweighted AHPSort I plurality voting")
    results = diagnostics.get("resultsByAlternativeId")
    if not isinstance(results, dict):
        raise ScenarioLabError("group voting diagnostics are missing per-alternative votes")
    category_order = [item["label"] for item in fixture["categories"]]
    individual_assignments: dict[str, dict[str, str]] = {alias: {} for alias in ("expert_a", "expert_b", "expert_c")}
    vote_summary: dict[str, dict[str, Any]] = {}
    for alternative in fixture["alternatives"]:
        vote = results.get(alternative_ids_by_name[alternative])
        expected = fixture["expectedVotes"][alternative]
        if not isinstance(vote, dict) or vote.get("aggregationStatus") != expected["status"]:
            raise ScenarioLabError(f"group voting status for {alternative} differs from the expected plurality")
        counts = [vote.get("votesByCategoryId", {}).get(category_ids_by_label[label], 0) for label in category_order]
        if counts != expected["categoryCounts"]:
            raise ScenarioLabError(f"individual votes for {alternative} differ from the scenario fixture")
        classifications = vote.get("classificationsByExpertId")
        if not isinstance(classifications, dict) or set(classifications) != set(expert_ids_by_alias.values()):
            raise ScenarioLabError(f"group diagnostics for {alternative} do not preserve all three expert classifications")
        by_alias = {}
        for alias, expert_id in expert_ids_by_alias.items():
            category_id = classifications[expert_id]
            category = next((item["label"] for item in fixture["categories"] if item["categoryId"] == category_id), None)
            if category != fixture["categoryVotesByAlternative"][alternative][("expert_a", "expert_b", "expert_c").index(alias)]:
                raise ScenarioLabError(f"individual classification for {alternative}/{alias} differs from its submitted vote")
            individual_assignments[alias][alternative] = category
            by_alias[alias] = category
        selected_label = fixture["expectedAssignments"][alternative]
        if vote.get("selectedCategoryId") != category_ids_by_label[selected_label]:
            raise ScenarioLabError(f"collective classification for {alternative} differs from the expected GAHPSort vote")
        expected_policy = "optimistic" if expected["status"] == "tied_plurality" else None
        if vote.get("tiePolicy") != expected_policy:
            raise ScenarioLabError(f"tie policy evidence for {alternative} is incorrect")
        vote_summary[alternative] = {
            "status": expected["status"],
            "votes": by_alias,
            "countsByCategory": dict(zip(category_order, counts, strict=True)),
            "selected": selected_label,
            "tiePolicy": expected_policy,
        }
    return individual_assignments, vote_summary


def _validate_finished(
    detail: Any,
    *,
    issue_id: str,
    fixture: dict[str, Any],
    group: bool,
    expert_aliases: tuple[str, ...],
    expert_emails_by_alias: dict[str, str],
    expert_ids_by_email: dict[str, str],
) -> DemonstrationIssueResult:
    if not isinstance(detail, dict):
        raise ScenarioLabError("Finished AHPSort I Issue detail must be an object")
    issue = detail.get("issue")
    lifecycle = detail.get("lifecycle")
    base_model = detail.get("models", {}).get("base", {}).get("technical")
    if (
        not isinstance(issue, dict)
        or _id(issue) != issue_id
        or issue.get("name") != fixture["issueName"]
        or not isinstance(lifecycle, dict)
        or lifecycle.get("currentStage") != "finished"
        or lifecycle.get("active") is not False
        or not isinstance(base_model, dict)
        or base_model.get("apiModelKey") != MODEL_KEY
    ):
        raise ScenarioLabError("Finished Issue identity, lifecycle or base model is incompatible")
    consensus = detail.get("consensus")
    if not isinstance(consensus, dict) or consensus.get("enabled") is not False or consensus.get("rounds") not in (None, []):
        raise ScenarioLabError("AHPSort I demonstration unexpectedly contains consensus rounds")

    alternatives = _items(detail, "alternatives")
    alternatives_by_name = _alternative_ids_by_name(alternatives, fixture)
    criteria = detail.get("criteria")
    nodes = _items(criteria, "nodes") if isinstance(criteria, dict) else []
    leaf_nodes = [item for item in nodes if item.get("isLeaf") is True]
    criteria_by_name = {item.get("name"): item for item in leaf_nodes}
    criterion_ids_by_key = {item["key"]: _id(criteria_by_name.get(item["name"])) or "" for item in fixture["criteria"]}
    if any(not value for value in criterion_ids_by_key.values()):
        raise ScenarioLabError("Finished Issue is missing a persisted criterion ID")

    domain_snapshots = _items(detail, "expressionDomains")
    saaty_snapshots = [
        item for item in domain_snapshots
        if item.get("name") == AHP_SAATY_DOMAIN_NAME
        and item.get("typeKey") == "numericSaaty"
        and item.get("definition") == {"scale": AHP_SAATY_SCALE_KEY}
        and item.get("scope") == "global"
        and isinstance(item.get("sourceDomainId"), str)
        and bool(item.get("sourceDomainId"))
    ]
    if len(saaty_snapshots) != 1:
        raise ScenarioLabError("Finished Issue must preserve exactly one global AHP Saaty Scale snapshot")
    saaty_snapshot_id = _id(saaty_snapshots[0])
    if not saaty_snapshot_id or {
        item.get("expressionDomainId") for item in leaf_nodes
    } != {saaty_snapshot_id}:
        raise ScenarioLabError("all leaf criteria must share the persisted AHP Saaty Scale snapshot")

    phase_results = _items(detail, "phaseResults")
    sort_results = [item for item in phase_results if item.get("stage") == ALTERNATIVE_STAGE and item.get("phase") == 0]
    if (
        len(sort_results) != 1
        or sort_results[0].get("resultStructureKey") != RESULT_STRUCTURE_KEY
        or sort_results[0].get("resultStructureVersion") != RESULT_STRUCTURE_VERSION
    ):
        raise ScenarioLabError("Finished Issue must preserve exactly one sorting@1 result")
    assignments, diagnostics = _validate_sorting_output(sort_results[0].get("standardizedOutput"), fixture, alternatives_by_name)
    weights = _weights_by_name(detail, fixture, fixture["expectedMCCWeights"] if group else fixture["expectedAHPWeights"], group=group)

    audits = detail.get("evaluations")
    individuals = _items(audits, "individual") if isinstance(audits, dict) else []
    alternative_evaluations = [item for item in individuals if item.get("stage") == ALTERNATIVE_STAGE and item.get("phase") == 0]
    expected_aliases = expert_aliases
    if len(alternative_evaluations) != len(expected_aliases) or any(item.get("completed") is not True for item in alternative_evaluations):
        raise ScenarioLabError("Finished Issue must preserve every completed alternative evaluation")

    expected_raw_by_alias: dict[str, dict[str, Any]] = {}
    for alias in expected_aliases:
        # The same builder is used for submissions and the persisted-evidence check;
        # fixture validation and the DMS result comparison independently pin the outcome.
        expected_raw_by_alias[alias] = _alternative_evaluation_payload(
            context={"modelParameters": {"ahpSortProfiles": {"mode": "limiting", "profiles": fixture["profiles"]}}},
            alternatives=alternatives,
            criteria=leaf_nodes,
            fixture=fixture,
            expert_alias=alias if group else None,
            group=group,
        )
    evaluations_by_alias: dict[str, Any] = {}
    for item in alternative_evaluations:
        expert_id = str(item.get("expertId", ""))
        alias = next((name for name, email in expert_emails_by_alias.items() if expert_ids_by_email.get(email.casefold()) == expert_id), None)
        if alias not in expected_raw_by_alias or alias in evaluations_by_alias:
            raise ScenarioLabError("Finished Issue alternative evaluations do not match the configured test experts")
        if not _same_alternative_payload(item.get("rawPayload"), expected_raw_by_alias[alias]):
            raise ScenarioLabError(f"Finished Issue does not preserve the submitted alternative judgments for {alias}")
        evaluations_by_alias[alias] = item
    if set(evaluations_by_alias) != set(expected_aliases):
        raise ScenarioLabError("Finished Issue is missing an expected expert alternative evaluation")

    expert_ids_by_alias = {
        alias: expert_ids_by_email[email.casefold()]
        for alias, email in expert_emails_by_alias.items()
        if email.casefold() in expert_ids_by_email
    }
    individual_assignments: dict[str, dict[str, str]] = {}
    vote_summary: dict[str, dict[str, Any]] = {}
    if group:
        weighting_results = [item for item in phase_results if item.get("stage") == CRITERIA_STAGE and item.get("phase") == 0]
        if len(weighting_results) != 1 or weighting_results[0].get("rawOutput", {}).get("aggregation", {}).get("method") != "mcc":
            raise ScenarioLabError("collective criterion weights were not produced by the existing MCC stage")
        if weighting_results[0].get("rawOutput", {}).get("priorityMethod") != "principalEigenvector":
            raise ScenarioLabError("individual AHP priorities were not calculated with the principal eigenvector method")
        weighting_evaluations = [item for item in individuals if item.get("stage") == CRITERIA_STAGE and item.get("phase") == 0]
        if len(weighting_evaluations) != 3 or any(item.get("completed") is not True for item in weighting_evaluations):
            raise ScenarioLabError("Finished Issue must preserve three completed individual AHP weighting evaluations")
        expected_weighting_by_alias = {}
        ordered_criteria = [{"id": criterion_ids_by_key[item["key"]]} for item in fixture["criteria"]]
        for alias in ("expert_a", "expert_b", "expert_c"):
            expected_weighting_by_alias[alias] = {
                "comparisons": _saaty_comparisons(
                    ordered_criteria,
                    overrides=fixture["expertPairwiseOverrides"].get(alias, []),
                )
            }
        seen_weighting_aliases = set()
        for item in weighting_evaluations:
            expert_id = str(item.get("expertId", ""))
            alias = next((name for name in ("expert_a", "expert_b", "expert_c")
                          if expert_ids_by_email.get(expert_emails_by_alias[name].casefold()) == expert_id), None)
            if alias is None or alias in seen_weighting_aliases or not _same_saaty_payload(
                item.get("rawPayload"), expected_weighting_by_alias[alias]["comparisons"]
            ):
                raise ScenarioLabError("Finished Issue does not preserve the three submitted individual AHP matrices")
            seen_weighting_aliases.add(alias)
        if seen_weighting_aliases != {"expert_a", "expert_b", "expert_c"}:
            raise ScenarioLabError("Finished Issue is missing an individual AHP matrix")
        collective = _items(audits, "collective") if isinstance(audits, dict) else []
        if not any(item.get("stage") == CRITERIA_STAGE and item.get("phase") == 0 for item in collective):
            raise ScenarioLabError("Finished Issue is missing its persisted MCC collective weights")
        category_ids_by_label = {item["label"]: item["categoryId"] for item in fixture["categories"]}
        individual_assignments, vote_summary = _validate_group_votes(
            diagnostics,
            fixture=fixture,
            alternative_ids_by_name=alternatives_by_name,
            category_ids_by_label=category_ids_by_label,
            expert_ids_by_alias={alias: expert_ids_by_alias[alias] for alias in ("expert_a", "expert_b", "expert_c")},
        )
        participant_items = _items(detail, "participants")
        accepted_emails = {
            str((item.get("expert") or {}).get("email", "")).casefold()
            for item in participant_items
            if item.get("invitationStatus") == "accepted" and item.get("evaluationCompleted") is True
        }
        if accepted_emails != {expert_emails_by_alias[alias].casefold() for alias in ("expert_a", "expert_b", "expert_c")}:
            raise ScenarioLabError("Finished Issue must preserve the three accepted experts with completed classifications")

    return DemonstrationIssueResult(
        generation_id="",
        issue_id=issue_id,
        issue_name=fixture["issueName"],
        assignments_by_alternative_name=assignments,
        weights_by_criterion_name=weights,
        individual_assignments_by_expert=individual_assignments,
        votes_by_alternative=vote_summary,
        reused_existing_issue=True,
    )


def _finite(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(float(value))


def _user_id_from_token(access_token: str | None) -> str:
    """Resolve the authenticated user's stable ID without relying on the public directory."""
    if not isinstance(access_token, str):
        raise ScenarioLabError("authenticated Scenario Lab session did not provide a user token")
    parts = access_token.split(".")
    if len(parts) != 3:
        raise ScenarioLabError("authenticated Scenario Lab token does not have a JWT payload")
    try:
        payload = json.loads(base64.urlsafe_b64decode(parts[1] + "=" * (-len(parts[1]) % 4)))
    except (binascii.Error, json.JSONDecodeError, ValueError) as error:
        raise ScenarioLabError("authenticated Scenario Lab token has an invalid payload") from error
    user_id = payload.get("uid") if isinstance(payload, dict) else None
    if not isinstance(user_id, str) or not user_id:
        raise ScenarioLabError("authenticated Scenario Lab token does not include the user's stable ID")
    return user_id


def _ensure_manifest_entry(
    store: ManifestStore | None,
    *,
    issue_id: str,
    issue_name: str,
    aliases: tuple[str, ...],
    scenario_id: str = SCENARIO_ID,
) -> str:
    if store is None:
        return ""
    entries = store.list_entries()
    matching = [entry for entry in entries if entry.issue_id == issue_id]
    if matching:
        if len(matching) != 1 or matching[0].issue_name != issue_name or matching[0].scenario_id != scenario_id:
            raise ScenarioLabError(f"manifest entry for existing Issue {issue_id} conflicts with this demonstration")
        return matching[0].generation_id
    entry = GeneratedIssue(
        generationId=f"{scenario_id}-{secrets.token_hex(8)}",
        scenarioId=scenario_id,
        issueId=issue_id,
        issueName=issue_name,
        ownerAlias=aliases[0],
        visibleUserAliases=list(aliases),
    )
    try:
        store.add(entry)
    except ManifestError as error:
        raise ScenarioLabError(f"Issue {issue_id} is valid but could not be recorded in the Scenario Lab manifest: {error}") from error
    return entry.generation_id


def _find_exact_issues(api: IssuesApi, issue_name: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    active = [item for item in _items(api.active_issues(), "issues") if item.get("name") == issue_name]
    finished = [item for item in _items(api.finished_issues(), "issues") if item.get("name") == issue_name]
    if len(active) + len(finished) > 1:
        raise ScenarioLabError(f"more than one visible active/finished issue has the exact name '{issue_name}'; no Issue was created")
    if active:
        raise ScenarioLabError(
            f"an unfinished Issue already has the exact name '{issue_name}' (id={_id(active[0])}); it was left untouched and no duplicate was created"
        )
    return active, finished


def _validate_created_issue_id(response: Any, api: IssuesApi, issue_name: str) -> str:
    response_id = _id(response) if isinstance(response, dict) else None
    active = [item for item in _items(api.active_issues(), "issues") if item.get("name") == issue_name]
    if len(active) != 1 or not _id(active[0]):
        raise ScenarioLabError("created Issue could not be resolved uniquely from the owner's active Issues")
    active_id = _id(active[0]) or ""
    if response_id and response_id != active_id:
        raise ScenarioLabError("create response Issue ID does not match the active Issue returned by Backend")
    return active_id


def _create_issue(
    *,
    owner_api: IssuesApi,
    fixture: dict[str, Any],
    model: dict[str, Any],
    weighting: dict[str, Any],
    experts: tuple[str, ...],
    sessions: SessionPool,
    domain: dict[str, Any],
    group: bool,
) -> tuple[str, dict[str, Any]]:
    emails = [sessions.users[alias].email for alias in experts]
    response = owner_api.create_issue(_issue_payload(
        fixture=fixture,
        model_id=_id(model) or "",
        weighting_model_id=_id(weighting) or "",
        expert_emails=emails,
        domain_id=_id(domain) or "",
        group=group,
    ))
    issue_id = _validate_created_issue_id(response, owner_api, fixture["issueName"])
    active = next(item for item in _items(owner_api.active_issues(), "issues") if _id(item) == issue_id)
    _validate_active_identity(active, fixture, group=group)
    return issue_id, active


def _accept_experts(sessions: SessionPool, issue_id: str, experts: tuple[str, ...]) -> None:
    for alias in experts:
        IssuesApi(sessions.client_for(alias)).respond_to_invitation(issue_id, "accepted")


def _run_supplier(
    *,
    sessions: SessionPool,
    store: ManifestStore,
    fixture: dict[str, Any],
    model: dict[str, Any],
    weighting: dict[str, Any],
    domain: dict[str, Any],
    existing_finished: dict[str, Any] | None,
    expert_alias: str,
    expert_emails_by_alias: dict[str, str],
    expert_ids_by_email: dict[str, str],
) -> DemonstrationIssueResult:
    owner_api = IssuesApi(sessions.client_for("owner"))
    expected_aliases = (expert_alias,)
    if existing_finished:
        issue_id = _id(existing_finished) or ""
        detail = owner_api.finished_issue(issue_id)
        result = _validate_finished(detail, issue_id=issue_id, fixture=fixture, group=False, expert_aliases=expected_aliases,
                                    expert_emails_by_alias=expert_emails_by_alias,
                                    expert_ids_by_email=expert_ids_by_email)
        generation_id = _ensure_manifest_entry(store, issue_id=issue_id, issue_name=fixture["issueName"], aliases=("owner", *expected_aliases))
        return DemonstrationIssueResult(generation_id, result.issue_id, result.issue_name, result.assignments_by_alternative_name,
                                        result.weights_by_criterion_name, result.individual_assignments_by_expert,
                                        result.votes_by_alternative, True)

    issue_id, _ = _create_issue(owner_api=owner_api, fixture=fixture, model=model, weighting=weighting,
                                experts=expected_aliases, sessions=sessions, domain=domain, group=False)
    try:
        _accept_experts(sessions, issue_id, expected_aliases)
        expert_api = IssuesApi(sessions.client_for(expert_alias))
        context_response = expert_api.evaluation(issue_id, ALTERNATIVE_STAGE)
        context, criteria, alternatives = _resolve_context_entities(context_response, ALTERNATIVE_STAGE, issue_id)
        payload = _alternative_evaluation_payload(context=context, alternatives=alternatives, criteria=criteria,
                                                  fixture=fixture, expert_alias=None, group=False)
        submitted = expert_api.submit_evaluation(issue_id, ALTERNATIVE_STAGE, payload)
        if not isinstance(submitted, dict) or submitted.get("completed") is not True:
            raise ScenarioLabError("supplier alternative evaluation was not accepted as complete")
        computed = owner_api.compute_evaluation(issue_id, ALTERNATIVE_STAGE)
        if not isinstance(computed, dict) or computed.get("currentStage") != "finished":
            raise ScenarioLabError("AHPSort I did not finish the supplier Issue")
        finished = [item for item in _items(owner_api.finished_issues(), "issues") if _id(item) == issue_id]
        if len(finished) != 1:
            raise ScenarioLabError("supplier Issue is not visible exactly once in Finished Issues")
        result = _validate_finished(owner_api.finished_issue(issue_id), issue_id=issue_id, fixture=fixture, group=False, expert_aliases=expected_aliases,
                                    expert_emails_by_alias=expert_emails_by_alias,
                                    expert_ids_by_email=expert_ids_by_email)
        generation_id = _ensure_manifest_entry(store, issue_id=issue_id, issue_name=fixture["issueName"], aliases=("owner", *expected_aliases))
        return DemonstrationIssueResult(generation_id, result.issue_id, result.issue_name, result.assignments_by_alternative_name,
                                        result.weights_by_criterion_name, result.individual_assignments_by_expert,
                                        result.votes_by_alternative, False)
    except Exception as error:
        raise ScenarioLabError(f"supplier demonstration failed after creating the Issue (id={issue_id}); it was not deleted: {error}") from error


def _run_sustainable(
    *,
    sessions: SessionPool,
    store: ManifestStore,
    fixture: dict[str, Any],
    model: dict[str, Any],
    weighting: dict[str, Any],
    domain: dict[str, Any],
    existing_finished: dict[str, Any] | None,
    expert_aliases: tuple[str, str, str],
    expert_emails_by_alias: dict[str, str],
    expert_ids_by_email: dict[str, str],
) -> DemonstrationIssueResult:
    owner_api = IssuesApi(sessions.client_for("owner"))
    if existing_finished:
        issue_id = _id(existing_finished) or ""
        result = _validate_finished(owner_api.finished_issue(issue_id), issue_id=issue_id, fixture=fixture, group=True, expert_aliases=expert_aliases,
                                    expert_emails_by_alias=expert_emails_by_alias,
                                    expert_ids_by_email=expert_ids_by_email)
        generation_id = _ensure_manifest_entry(store, issue_id=issue_id, issue_name=fixture["issueName"], aliases=("owner", *expert_aliases))
        return DemonstrationIssueResult(generation_id, result.issue_id, result.issue_name, result.assignments_by_alternative_name,
                                        result.weights_by_criterion_name, result.individual_assignments_by_expert,
                                        result.votes_by_alternative, True)

    issue_id, _ = _create_issue(owner_api=owner_api, fixture=fixture, model=model, weighting=weighting,
                                experts=expert_aliases, sessions=sessions, domain=domain, group=True)
    try:
        _accept_experts(sessions, issue_id, expert_aliases)
        criteria_by_alias: dict[str, list[dict[str, Any]]] = {}
        weighting_payload_by_alias: dict[str, dict[str, Any]] = {}
        for alias in expert_aliases:
            api = IssuesApi(sessions.client_for(alias))
            response = api.evaluation(issue_id, CRITERIA_STAGE)
            _, criteria, _ = _resolve_context_entities(response, CRITERIA_STAGE, issue_id)
            criterion_ids = _criterion_ids_by_key(criteria, fixture)
            ordered_criteria = [{"id": criterion_ids[item["key"]]} for item in fixture["criteria"]]
            comparisons = _saaty_comparisons(
                ordered_criteria,
                overrides=fixture["expertPairwiseOverrides"].get(alias, []),
            )
            criteria_by_alias[alias] = criteria
            weighting_payload_by_alias[alias] = {"comparisons": comparisons}
            if response.get("completed") is True:
                if not _same_saaty_payload(response.get("payload"), comparisons):
                    raise ScenarioLabError(f"existing AHP weighting for {alias} differs from the fixture; it was not overwritten")
            else:
                submission = api.submit_evaluation(issue_id, CRITERIA_STAGE, weighting_payload_by_alias[alias])
                if not isinstance(submission, dict) or submission.get("completed") is not True:
                    raise ScenarioLabError(f"AHP weighting for {alias} was not accepted as complete")
        computed_weights = owner_api.compute_evaluation(issue_id, CRITERIA_STAGE)
        if not isinstance(computed_weights, dict) or computed_weights.get("currentStage") != ALTERNATIVE_STAGE:
            raise ScenarioLabError("AHP + MCC did not transition to AHPSort I alternative evaluation")
        weight_result = computed_weights.get("result")
        collective = weight_result.get("weightsByCriterion") if isinstance(weight_result, dict) else None
        if not isinstance(collective, dict) or weight_result.get("rawOutput", {}).get("aggregation", {}).get("method") != "mcc":
            raise ScenarioLabError("Backend did not calculate the collective AHP weights using MCC")
        _assert_weight_values(collective, fixture, criteria_by_alias[expert_aliases[0]], fixture["expectedMCCWeights"], label="MCC")

        for alias in expert_aliases:
            api = IssuesApi(sessions.client_for(alias))
            response = api.evaluation(issue_id, ALTERNATIVE_STAGE)
            context, criteria, alternatives = _resolve_context_entities(response, ALTERNATIVE_STAGE, issue_id)
            payload = _alternative_evaluation_payload(context=context, alternatives=alternatives, criteria=criteria,
                                                      fixture=fixture, expert_alias=alias, group=True)
            if response.get("completed") is True:
                if not _same_alternative_payload(response.get("payload"), payload):
                    raise ScenarioLabError(f"existing alternative evaluation for {alias} differs from the fixture; it was not overwritten")
            else:
                submission = api.submit_evaluation(issue_id, ALTERNATIVE_STAGE, payload)
                if not isinstance(submission, dict) or submission.get("completed") is not True:
                    raise ScenarioLabError(f"alternative evaluation for {alias} was not accepted as complete")
        computed = owner_api.compute_evaluation(issue_id, ALTERNATIVE_STAGE)
        if not isinstance(computed, dict) or computed.get("currentStage") != "finished":
            raise ScenarioLabError("GAHPSort did not finish the sustainable-development Issue")
        finished = [item for item in _items(owner_api.finished_issues(), "issues") if _id(item) == issue_id]
        if len(finished) != 1:
            raise ScenarioLabError("sustainable-development Issue is not visible exactly once in Finished Issues")
        result = _validate_finished(owner_api.finished_issue(issue_id), issue_id=issue_id, fixture=fixture, group=True, expert_aliases=expert_aliases,
                                    expert_emails_by_alias=expert_emails_by_alias,
                                    expert_ids_by_email=expert_ids_by_email)
        generation_id = _ensure_manifest_entry(store, issue_id=issue_id, issue_name=fixture["issueName"], aliases=("owner", *expert_aliases))
        return DemonstrationIssueResult(generation_id, result.issue_id, result.issue_name, result.assignments_by_alternative_name,
                                        result.weights_by_criterion_name, result.individual_assignments_by_expert,
                                        result.votes_by_alternative, False)
    except Exception as error:
        raise ScenarioLabError(f"group demonstration failed after creating the Issue (id={issue_id}); it was not deleted: {error}") from error


def _assert_weight_values(
    weights_by_id: dict[str, Any], fixture: dict[str, Any], criteria: list[dict[str, Any]], expected: list[float], *, label: str
) -> None:
    ids_by_name = {item.get("name"): _id(item) for item in criteria}
    if set(ids_by_name) != {item["name"] for item in fixture["criteria"]}:
        raise ScenarioLabError(f"{label} weights cannot be checked against the complete criterion list")
    for index, criterion in enumerate(fixture["criteria"]):
        actual = weights_by_id.get(ids_by_name[criterion["name"]])
        if not _finite(actual) or not math.isclose(float(actual), expected[index], rel_tol=0, abs_tol=2e-7):
            raise ScenarioLabError(f"{label} weight for {criterion['name']} differs from the validated reference: {actual}")


def generate(
    sessions: SessionPool,
    store: ManifestStore,
    *,
    owner_alias: str = "owner",
    supplier_expert_alias: str = "expert_a",
    group_expert_aliases: tuple[str, str, str] = ("expert_a", "expert_b", "expert_c"),
) -> DemonstrationsResult:
    fixture = load_fixture()
    supplier = fixture["supplierPrequalification"]
    sustainable = fixture["sustainableDevelopment"]
    aliases = (owner_alias, supplier_expert_alias, *group_expert_aliases)
    if any(alias not in sessions.users for alias in aliases):
        missing = sorted(set(alias for alias in aliases if alias not in sessions.users))
        raise ScenarioLabError(f"{SCENARIO_ID} requires configured local users for aliases: {', '.join(missing)}")
    if len(set((owner_alias, supplier_expert_alias))) != 2 or len(set((owner_alias, *group_expert_aliases))) != 4 or len(set(group_expert_aliases)) != 3:
        raise ScenarioLabError("owner and demonstration experts must use distinct configured test accounts")
    if group_expert_aliases != ("expert_a", "expert_b", "expert_c"):
        raise ScenarioLabError("the validated sustainable-development fixture is bound to expert_a, expert_b and expert_c")
    emails_by_alias = {alias: sessions.users[alias].email for alias in set(aliases)}
    if len({email.casefold() for email in emails_by_alias.values()}) != len(emails_by_alias):
        raise ScenarioLabError("demonstration aliases must map to distinct user accounts")

    for alias in set(aliases):
        sessions.login(alias)
    owner_api = IssuesApi(sessions.client_for(owner_alias))
    model, weighting = _compatible_models(owner_api.models())
    user_items = _items(owner_api.users(), "users")
    user_by_email = {str(item.get("email", "")).casefold(): item for item in user_items}
    missing_experts = [email for email in emails_by_alias.values() if email.casefold() not in user_by_email]
    if missing_experts:
        raise ScenarioLabError("configured Scenario Lab accounts are absent from the development user catalog")
    expert_ids_by_email = {
        sessions.users[alias].email.casefold(): _user_id_from_token(sessions.client_for(alias).access_token)
        for alias in emails_by_alias
    }
    domain = _select_existing_saaty_domain(owner_api.expression_domains(), model)

    supplier_active, supplier_finished = _find_exact_issues(owner_api, supplier["issueName"])
    sustainable_active, sustainable_finished = _find_exact_issues(owner_api, sustainable["issueName"])
    del supplier_active, sustainable_active
    # Validate both existing results before creating either missing Issue.
    if supplier_finished:
        _validate_finished(
            owner_api.finished_issue(_id(supplier_finished[0]) or ""),
            issue_id=_id(supplier_finished[0]) or "",
            fixture=supplier,
            group=False,
            expert_aliases=(supplier_expert_alias,),
            expert_emails_by_alias=emails_by_alias,
            expert_ids_by_email=expert_ids_by_email,
        )
    if sustainable_finished:
        _validate_finished(
            owner_api.finished_issue(_id(sustainable_finished[0]) or ""),
            issue_id=_id(sustainable_finished[0]) or "",
            fixture=sustainable,
            group=True,
            expert_aliases=group_expert_aliases,
            expert_emails_by_alias=emails_by_alias,
            expert_ids_by_email=expert_ids_by_email,
        )

    try:
        supplier_result = _run_supplier(
            sessions=sessions,
            store=store,
            fixture=supplier,
            model=model,
            weighting=weighting,
            domain=domain,
            existing_finished=supplier_finished[0] if supplier_finished else None,
            expert_alias=supplier_expert_alias,
            expert_emails_by_alias=emails_by_alias,
            expert_ids_by_email=expert_ids_by_email,
        )
        sustainable_result = _run_sustainable(
            sessions=sessions,
            store=store,
            fixture=sustainable,
            model=model,
            weighting=weighting,
            domain=domain,
            existing_finished=sustainable_finished[0] if sustainable_finished else None,
            expert_aliases=group_expert_aliases,
            expert_emails_by_alias=emails_by_alias,
            expert_ids_by_email=expert_ids_by_email,
        )
    except ScenarioLabError:
        raise
    except Exception as error:
        raise ScenarioLabError(f"{SCENARIO_ID} failed: {error}") from error
    return DemonstrationsResult(supplier_result, sustainable_result, str(store.path))


__all__ = ["FIXTURE_PATH", "SCENARIO_ID", "load_fixture", "validate_fixture", "generate"]
