from __future__ import annotations

import json
import math
import secrets
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from issue_scenario_lab.api.issues import IssuesApi
from issue_scenario_lab.api.session_pool import SessionPool
from issue_scenario_lab.errors import ManifestError, ScenarioLabError
from issue_scenario_lab.manifest.models import GeneratedIssue
from issue_scenario_lab.manifest.store import ManifestStore
from issue_scenario_lab.scenarios.no_consensus_basic import _id, _items
from issue_scenario_lab.scenarios.numeric_values import numeric_levels

SCENARIO_ID = "topsis-sort-2016"
MODEL_KEY = "topsis_sort_2016"
RESULT_STRUCTURE_KEY = "sorting"
RESULT_STRUCTURE_VERSION = 1
STAGE = "alternativeEvaluation"
FIXTURE_PATH = Path(__file__).parents[3] / "data" / "topsis_sort_2016.json"


@dataclass(frozen=True)
class GenerationResult:
    generation_id: str
    issue_id: str
    issue_name: str
    owner_alias: str
    expert_aliases: tuple[str, str]
    manifest_path: str
    assignments_by_alternative_name: dict[str, str]


def load_fixture(path: Path = FIXTURE_PATH) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ScenarioLabError(f"unable to load TOPSIS-Sort 2016 fixture: {path}") from error
    if not isinstance(data, dict):
        raise ScenarioLabError("TOPSIS-Sort 2016 fixture must be an object")
    validate_fixture(data)
    return data


def validate_fixture(data: dict[str, Any]) -> None:
    criteria = data.get("criteria")
    alternatives = data.get("alternatives")
    if not isinstance(criteria, list) or len(criteria) != 2 or not isinstance(alternatives, list) or len(alternatives) != 3:
        raise ScenarioLabError("fixture must contain exactly two criteria and three alternatives")
    criterion_keys = [item.get("key") for item in criteria if isinstance(item, dict)]
    alternative_keys = [item.get("key") for item in alternatives if isinstance(item, dict)]
    if len(criterion_keys) != len(criteria) or set(criterion_keys) != {"quality", "cost"} or len(set(criterion_keys)) != 2:
        raise ScenarioLabError("fixture criteria must have unique quality and cost keys")
    if any(not isinstance(item.get("name"), str) or item.get("type") not in {"benefit", "cost"} for item in criteria):
        raise ScenarioLabError("fixture criteria require names and benefit/cost directions")
    if {item["key"]: item["type"] for item in criteria} != {"quality": "benefit", "cost": "cost"}:
        raise ScenarioLabError("fixture requires Quality as benefit and Cost as cost")
    if len(alternative_keys) != len(alternatives) or set(alternative_keys) != {"budget", "balanced", "premium"}:
        raise ScenarioLabError("fixture must contain three uniquely keyed alternatives")
    if any(not isinstance(item.get("name"), str) or not item["name"] for item in alternatives):
        raise ScenarioLabError("fixture alternatives require names")

    weights = data.get("criteriaWeights")
    if weights != {"quality": 0.6, "cost": 0.4}:
        raise ScenarioLabError("fixture criteria weights must be Quality 0.6 and Cost 0.4")

    categories = data.get("orderedCategories")
    expected_categories = [
        {"categoryId": "low", "label": "Low", "order": 0},
        {"categoryId": "medium", "label": "Medium", "order": 1},
        {"categoryId": "high", "label": "High", "order": 2},
    ]
    if categories != expected_categories:
        raise ScenarioLabError("fixture orderedCategories must define Low, Medium, High in preference order")

    boundary_profiles = data.get("boundaryProfiles")
    profiles = boundary_profiles.get("profiles") if isinstance(boundary_profiles, dict) else None
    if not isinstance(profiles, list) or len(profiles) != 2:
        raise ScenarioLabError("fixture boundaryProfiles must contain exactly two profiles")
    expected_profile_categories = ["medium", "high"]
    previous = None
    for index, profile in enumerate(profiles):
        values = profile.get("valuesByCriterionId") if isinstance(profile, dict) else None
        if (
            not isinstance(profile, dict)
            or not isinstance(profile.get("profileId"), str)
            or profile.get("categoryId") != expected_profile_categories[index]
            or not isinstance(values, dict)
            or set(values) != set(criterion_keys)
        ):
            raise ScenarioLabError("fixture profiles must use the boundaryProfiles contract and identify the entered category")
        if any(not _finite(value) for value in values.values()):
            raise ScenarioLabError("fixture profile values must be finite numbers")
        if previous is not None and not (values["quality"] > previous["quality"] and values["cost"] < previous["cost"]):
            raise ScenarioLabError("fixture profiles must be strictly ordered by benefit and cost preference")
        previous = values

    evaluations = data.get("evaluations")
    if not isinstance(evaluations, dict) or set(evaluations) != set(alternative_keys):
        raise ScenarioLabError("fixture evaluations must contain every alternative")
    for alternative_key, row in evaluations.items():
        if not isinstance(row, dict) or set(row) != set(criterion_keys) or any(not _finite(value) for value in row.values()):
            raise ScenarioLabError(f"fixture evaluation for {alternative_key} must contain finite numeric values for every criterion")
    if set(data.get("expectedAssignments", {})) != set(alternative_keys) or any(
        category_id not in {category["categoryId"] for category in categories} for category_id in data["expectedAssignments"].values()
    ):
        raise ScenarioLabError("fixture expectedAssignments must assign every alternative to a configured category")
    if not isinstance(data.get("description"), str) or "sintético" not in data["description"].casefold():
        raise ScenarioLabError("fixture must document that its values are synthetic")


def _finite(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(float(value))


def _supported_domain_type_keys(model: dict[str, Any]) -> set[str]:
    entries = model.get("supportedExpressionDomains")
    if not isinstance(entries, list):
        raise ScenarioLabError("TOPSIS-Sort metadata supportedExpressionDomains must be an array")
    if any(not isinstance(entry, dict) or not isinstance(entry.get("typeKey"), str) for entry in entries):
        raise ScenarioLabError("TOPSIS-Sort metadata contains malformed supportedExpressionDomains entries")
    return {entry["typeKey"].strip() for entry in entries if entry["typeKey"].strip()}


def _compatible_model(models_data: Any) -> dict[str, Any]:
    model = next(
        (item for item in _items(models_data, "models", "compatibleModels", "compatible") if item.get("apiModelKey") == MODEL_KEY),
        None,
    )
    if model is None:
        raise ScenarioLabError(f"TOPSIS-Sort 2016 (apiModelKey '{MODEL_KEY}') is unavailable")
    if model.get("issueExecutionAuthorized") is not True:
        raise ScenarioLabError("TOPSIS-Sort 2016 is not authorized for issue execution")
    endpoint = model.get("apiEndpoint")
    checks = {
        "modelKind": model.get("modelKind") == "issue",
        "implementationStatus": model.get("implementationStatus") == "ready",
        "publicUsable": model.get("publicUsable") is True,
        "visibleInIssueCreation": model.get("visibleInIssueCreation") is not False,
        "manifestSync.isStale": (model.get("manifestSync") or {}).get("isStale") is not True,
        "resultStructure": model.get("resultStructureKey") == RESULT_STRUCTURE_KEY and model.get("resultStructureVersion") == RESULT_STRUCTURE_VERSION,
        "apiEndpoint": isinstance(endpoint, dict) and endpoint.get("method") == "POST" and endpoint.get("path") == "/topsis_sort_2016",
        "supportsConsensus": model.get("supportsConsensus") is False,
        "supportsConsensusSimulation": model.get("supportsConsensusSimulation") is False,
        "usesCriteriaWeights": model.get("usesCriteriaWeights") is True,
        "usesExpertWeights": model.get("usesExpertWeights") is False,
        "evaluationStructureKey": model.get("evaluationStructureKey") == "alternativeCriteriaMatrix",
    }
    if not ({"numericDiscrete", "numericContinuous"} & _supported_domain_type_keys(model)):
        checks["supportedExpressionDomains"] = False
    if not all(checks.values()) or not _id(model):
        failed = ", ".join(key for key, valid in checks.items() if not valid) or "missing model id"
        raise ScenarioLabError(f"TOPSIS-Sort 2016 model is incompatible: {failed}")
    return model


def _domain_accepts(domain: dict[str, Any], value: float) -> bool:
    definition = domain.get("definition")
    if not isinstance(definition, dict):
        return False
    try:
        decimal_value = Decimal(str(value))
        minimum, maximum = Decimal(str(definition["min"])), Decimal(str(definition["max"]))
    except (InvalidOperation, KeyError, TypeError, ValueError):
        return False
    if not decimal_value.is_finite() or not minimum.is_finite() or not maximum.is_finite() or not minimum <= decimal_value <= maximum:
        return False
    if domain.get("typeKey") == "numericDiscrete":
        try:
            step = Decimal(str(definition["step"]))
        except (InvalidOperation, KeyError, TypeError, ValueError):
            return False
        if not step.is_finite() or step <= 0:
            return False
        return (decimal_value - minimum) % step == 0
    return domain.get("typeKey") == "numericContinuous"


def _compatible_domain(domains_data: Any, supported: set[str], fixture: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(domains_data, dict):
        raise ScenarioLabError("expression domain response must be an object")
    globals_, user_domains = domains_data.get("globals", []), domains_data.get("userDomains", [])
    if not isinstance(globals_, list) or not isinstance(user_domains, list):
        raise ScenarioLabError("expression domain globals and userDomains must be arrays")
    candidates = [*globals_, *user_domains]
    preferred_types = ("numericDiscrete", "numericContinuous")
    fixture_values = [
        *[value for row in fixture["evaluations"].values() for value in row.values()],
        *[value for profile in fixture["boundaryProfiles"]["profiles"] for value in profile["valuesByCriterionId"].values()],
    ]
    for type_key in preferred_types:
        for domain in candidates:
            if not isinstance(domain, dict) or domain.get("typeKey") != type_key or type_key not in supported or not _id(domain):
                continue
            try:
                numeric_levels(domain)
            except ScenarioLabError:
                continue
            if all(_domain_accepts(domain, value) for value in fixture_values):
                return domain
    raise ScenarioLabError("no compatible numeric expression domain can represent every fixture value")


def _issue_payload(issue_name: str, model_id: str, expert_emails: list[str], domain_id: str, fixture: dict[str, Any]) -> dict[str, Any]:
    criteria = [
        {"id": f"criterion-{criterion['key']}", "name": criterion["name"], "type": criterion["type"], "children": []} for criterion in fixture["criteria"]
    ]
    source_criterion_ids = {criterion["key"]: f"criterion-{criterion['key']}" for criterion in fixture["criteria"]}
    boundary_profiles = {
        "profiles": [
            {
                "profileId": profile["profileId"],
                "categoryId": profile["categoryId"],
                "valuesByCriterionId": {source_criterion_ids[key]: value for key, value in profile["valuesByCriterionId"].items()},
            }
            for profile in fixture["boundaryProfiles"]["profiles"]
        ]
    }
    weights_by_source_id = {source_criterion_ids[key]: value for key, value in fixture["criteriaWeights"].items()}
    return {
        "issueName": issue_name,
        "issueDescription": fixture["description"],
        "selectedModelId": model_id,
        "alternatives": [{"name": item["name"], "description": item.get("description", "")} for item in fixture["alternatives"]],
        "criteria": [
            {
                "id": "criterion-root",
                "name": "Supplier evaluation",
                "type": "group",
                "children": criteria,
            }
        ],
        "addedExperts": expert_emails,
        "expressionDomainConfig": {"mode": "global", "globalDomainId": domain_id},
        "closureDate": None,
        "isConsensus": False,
        "simulateConsensus": False,
        "paramValues": {
            "orderedCategories": fixture["orderedCategories"],
            "boundaryProfiles": boundary_profiles,
        },
        "criteriaWeightingParameters": {},
        "criteriaWeightingConfig": {
            "mode": "creatorManual",
            "source": "creator",
            "method": "manual",
            "structureKey": "manualCriteriaWeights",
            "payload": {"weightsByCriterion": weights_by_source_id},
        },
    }


def _validate_evaluation_context(response: Any, issue_id: str, model_id: str, fixture: dict[str, Any]) -> dict[str, Any]:
    if (
        not isinstance(response, dict)
        or response.get("stage") != STAGE
        or response.get("structureKey") != "alternativeCriteriaMatrix"
        or response.get("consensusPhase") != 0
        or response.get("completed") is not False
    ):
        raise ScenarioLabError("expert evaluation context is incompatible")
    decision_context = response.get("decisionContext")
    if not isinstance(decision_context, dict):
        raise ScenarioLabError("expert evaluation response is missing decisionContext")
    issue, structure, model = decision_context.get("issue"), decision_context.get("structure"), decision_context.get("model")
    if (
        _id(issue) != issue_id
        or issue.get("currentStage") != STAGE
        or issue.get("isConsensus") is not False
        or not isinstance(structure, dict)
        or structure.get("key") != "alternativeCriteriaMatrix"
        or not isinstance(model, dict)
        or _id(model) != model_id
        or model.get("apiModelKey") != MODEL_KEY
    ):
        raise ScenarioLabError("expert evaluation context does not identify the TOPSIS-Sort issue")
    alternatives, criteria = _items(decision_context, "alternatives"), _items(decision_context, "leafCriteria")
    if {item.get("name") for item in alternatives} != {item["name"] for item in fixture["alternatives"]}:
        raise ScenarioLabError("persisted alternatives do not match the fixture")
    criteria_by_name = {item.get("name"): item for item in criteria}
    if set(criteria_by_name) != {item["name"] for item in fixture["criteria"]}:
        raise ScenarioLabError("persisted leaf criteria do not match the fixture")
    for expected in fixture["criteria"]:
        criterion = criteria_by_name[expected["name"]]
        if criterion.get("type") != expected["type"] or not _id(criterion):
            raise ScenarioLabError(f"persisted criterion {expected['name']} has the wrong ID or direction")
        domain = criterion.get("expressionDomain")
        if not isinstance(domain, dict) or domain.get("typeKey") not in {"numericDiscrete", "numericContinuous"}:
            raise ScenarioLabError(f"persisted criterion {expected['name']} has no numeric expression domain")
        values = [row[expected["key"]] for row in fixture["evaluations"].values()]
        values.extend(profile["valuesByCriterionId"][expected["key"]] for profile in fixture["boundaryProfiles"]["profiles"])
        if any(not _domain_accepts(domain, value) for value in values):
            raise ScenarioLabError(f"persisted criterion {expected['name']} domain cannot represent the fixture values")
    _validate_empty_matrix(response.get("payload"), alternatives, criteria)
    return decision_context


def _validate_empty_matrix(payload: Any, alternatives: list[dict[str, Any]], criteria: list[dict[str, Any]]) -> None:
    alternative_ids = {_id(item) for item in alternatives}
    criterion_ids = {_id(item) for item in criteria}
    if not isinstance(payload, dict) or set(payload) != alternative_ids:
        raise ScenarioLabError("evaluation payload is not an empty matrix for persisted alternatives")
    if any(
        not isinstance(payload[alternative_id], dict)
        or set(payload[alternative_id]) != criterion_ids
        or any(value != "" for value in payload[alternative_id].values())
        for alternative_id in alternative_ids
    ):
        raise ScenarioLabError("evaluation payload is not an empty matrix for persisted criteria")


def _validate_remapped_configuration(active_issue: dict[str, Any], decision_context: dict[str, Any], fixture: dict[str, Any]) -> dict[str, str]:
    criteria_by_name = {item.get("name"): _id(item) for item in _items(decision_context, "leafCriteria")}
    alternatives_by_name = {item.get("name"): _id(item) for item in _items(decision_context, "alternatives")}
    if any(not identifier for identifier in [*criteria_by_name.values(), *alternatives_by_name.values()]):
        raise ScenarioLabError("Backend did not persist canonical alternative and criterion IDs")
    parameters = active_issue.get("modelParameters")
    if not isinstance(parameters, dict) or parameters.get("orderedCategories") != fixture["orderedCategories"]:
        raise ScenarioLabError("persisted orderedCategories differ from the fixture")
    profiles = (parameters.get("boundaryProfiles") or {}).get("profiles")
    expected_profiles = []
    for profile in fixture["boundaryProfiles"]["profiles"]:
        criterion_values = {
            criteria_by_name[next(item["name"] for item in fixture["criteria"] if item["key"] == key)]: value
            for key, value in profile["valuesByCriterionId"].items()
        }
        expected_profiles.append(
            {
                "profileId": profile["profileId"],
                "categoryId": profile["categoryId"],
                "valuesByCriterionId": criterion_values,
            }
        )
    if profiles != expected_profiles:
        raise ScenarioLabError("persisted boundaryProfiles do not contain remapped criterion IDs and original-scale values")
    expected_source_ids = {f"criterion-{key}" for key in fixture["criteriaWeights"]}
    if any(expected_source_ids & set(profile["valuesByCriterionId"]) for profile in profiles):
        raise ScenarioLabError("temporary fixture criterion IDs were not replaced in boundaryProfiles")
    final_weights = active_issue.get("finalWeights")
    if not isinstance(final_weights, dict) or any(
        not _finite(final_weights.get(item["name"])) or abs(final_weights[item["name"]] - fixture["criteriaWeights"][item["key"]]) > 1e-9
        for item in fixture["criteria"]
    ):
        raise ScenarioLabError("persisted final criteria weights are not 0.6/0.4")
    return alternatives_by_name


def _evaluation_matrix(context: dict[str, Any], fixture: dict[str, Any]) -> dict[str, dict[str, float]]:
    alternatives = {item.get("name"): _id(item) for item in _items(context, "alternatives")}
    criteria = {item.get("name"): item for item in _items(context, "leafCriteria")}
    matrix: dict[str, dict[str, float]] = {}
    for alternative in fixture["alternatives"]:
        alternative_id = alternatives.get(alternative["name"])
        if not alternative_id:
            raise ScenarioLabError(f"persisted alternative ID missing for {alternative['name']}")
        matrix[alternative_id] = {}
        for criterion in fixture["criteria"]:
            persisted_criterion = criteria.get(criterion["name"])
            criterion_id = _id(persisted_criterion) if isinstance(persisted_criterion, dict) else None
            if not criterion_id:
                raise ScenarioLabError(f"persisted criterion ID missing for {criterion['name']}")
            matrix[alternative_id][criterion_id] = fixture["evaluations"][alternative["key"]][criterion["key"]]
    if len(matrix) != 3 or any(len(row) != 2 for row in matrix.values()):
        raise ScenarioLabError("fixture did not produce a complete persisted three-by-two evaluation matrix")
    return matrix


def _validate_sorting_result(result: Any, *, categories: list[dict[str, Any]], expected_by_alternative_id: dict[str, str]) -> dict[str, str]:
    if not isinstance(result, dict) or result.get("categories") != categories:
        raise ScenarioLabError("TOPSIS-Sort result categories differ from the configured categories")
    if result.get("categoryOrderSemantics") != "lower-order-is-less-preferred":
        raise ScenarioLabError("TOPSIS-Sort result category order semantics are missing or incompatible")
    assignments = result.get("assignments")
    if not isinstance(assignments, list) or len(assignments) != len(expected_by_alternative_id):
        raise ScenarioLabError("TOPSIS-Sort result must contain one assignment per alternative")
    actual: dict[str, str] = {}
    category_ids = {category["categoryId"] for category in categories}
    for assignment in assignments:
        if not isinstance(assignment, dict) or set(assignment) != {"alternativeId", "categoryId"}:
            raise ScenarioLabError("sorting assignment contains unknown or ranking fields")
        alternative_id, category_id = assignment["alternativeId"], assignment["categoryId"]
        if alternative_id not in expected_by_alternative_id or alternative_id in actual or category_id not in category_ids:
            raise ScenarioLabError("sorting assignment has a duplicate/unknown alternative or category ID")
        actual[alternative_id] = category_id
    if actual != expected_by_alternative_id:
        raise ScenarioLabError("TOPSIS-Sort assignments differ from the independently defined fixture expectations")
    if not isinstance(result.get("diagnostics"), dict):
        raise ScenarioLabError("TOPSIS-Sort result diagnostics are missing")
    if any(key in result for key in ("rank", "score", "rankedAlternatives")):
        raise ScenarioLabError("sorting result must not contain ranking fields")
    return actual


def _validate_finished(detail: Any, issue_id: str, issue_name: str, fixture: dict[str, Any], alternative_ids_by_name: dict[str, str]) -> dict[str, str]:
    if not isinstance(detail, dict):
        raise ScenarioLabError("finished issue detail must be an object")
    issue = detail.get("issue")
    lifecycle = detail.get("lifecycle")
    models = detail.get("models")
    base_model = models.get("base") if isinstance(models, dict) else None
    technical = base_model.get("technical") if isinstance(base_model, dict) else None
    if (
        _id(issue) != issue_id
        or issue.get("name") != issue_name
        or not isinstance(lifecycle, dict)
        or lifecycle.get("currentStage") != "finished"
        or lifecycle.get("active") is not False
        or not isinstance(technical, dict)
        or technical.get("apiModelKey") != MODEL_KEY
    ):
        raise ScenarioLabError("Finished Issue identity, lifecycle, model, or result structure is incompatible")
    consensus = detail.get("consensus")
    if not isinstance(consensus, dict) or consensus.get("enabled") is not False or consensus.get("rounds") not in (None, []):
        raise ScenarioLabError("Finished Issue unexpectedly reports consensus")

    expected_by_id = {
        alternative_ids_by_name[next(item["name"] for item in fixture["alternatives"] if item["key"] == key)]: category
        for key, category in fixture["expectedAssignments"].items()
    }
    phase_results = [item for item in _items(detail, "phaseResults") if item.get("stage") == STAGE and item.get("phase") == 0]
    if (
        len(phase_results) != 1
        or phase_results[0].get("resultStructureKey") != RESULT_STRUCTURE_KEY
        or phase_results[0].get("resultStructureVersion") != RESULT_STRUCTURE_VERSION
    ):
        raise ScenarioLabError("Finished Issue must contain exactly one sorting@1 final phase result")
    phase_result = phase_results[0]
    standardized = phase_result.get("standardizedOutput")
    actual = _validate_sorting_result(standardized, categories=fixture["orderedCategories"], expected_by_alternative_id=expected_by_id)
    criteria = detail.get("criteria")
    nodes = _items(criteria, "nodes") if isinstance(criteria, dict) else []
    final_weights = criteria.get("finalWeights") if isinstance(criteria, dict) else None
    weights_by_id = final_weights.get("byCriterionId") if isinstance(final_weights, dict) else None
    criterion_ids_by_name = {item.get("name"): _id(item) for item in nodes if item.get("isLeaf") is True}
    if not isinstance(weights_by_id, dict) or any(
        not criterion_ids_by_name.get(criterion["name"])
        or not _finite(weights_by_id.get(criterion_ids_by_name[criterion["name"]]))
        or abs(weights_by_id[criterion_ids_by_name[criterion["name"]]] - fixture["criteriaWeights"][criterion["key"]]) > 1e-9
        for criterion in fixture["criteria"]
    ):
        raise ScenarioLabError("Finished Issue final criteria weights do not match the configured 0.6/0.4")
    if not isinstance(phase_result.get("rawOutput"), dict) or not isinstance(phase_result.get("modelSpecificOutput"), dict):
        raise ScenarioLabError("Finished Issue must preserve execution output and model diagnostics")
    for key in ("rank", "score", "rankedAlternatives"):
        if key in phase_result or key in standardized:
            raise ScenarioLabError("Finished sorting result must not contain ranking fields")
    participants = _items(detail, "participants")
    accepted = [item for item in participants if item.get("invitationStatus") == "accepted"]
    if len(accepted) != 2 or any(item.get("evaluationCompleted") is not True for item in accepted):
        raise ScenarioLabError("Finished Issue must contain two accepted experts with completed evaluations")
    return {alternative["name"]: actual[alternative_ids_by_name[alternative["name"]]] for alternative in fixture["alternatives"]}


def _new_generation_id(store: ManifestStore) -> str:
    for _ in range(10):
        generation_id = secrets.token_hex(5)
        if store.find(generation_id) is None:
            return generation_id
    raise ScenarioLabError("could not allocate a unique local generation id")


def generate(
    sessions: SessionPool,
    store: ManifestStore,
    *,
    owner_alias: str = "owner",
    expert_a_alias: str = "expert_a",
    expert_b_alias: str = "expert_b",
) -> GenerationResult:
    fixture = load_fixture()
    aliases = (owner_alias, expert_a_alias, expert_b_alias)
    if len(set(aliases)) != 3 or any(alias not in sessions.users for alias in aliases):
        raise ScenarioLabError(f"{SCENARIO_ID} requires distinct configured aliases: owner, expert_a, expert_b")
    emails = [sessions.users[alias].email for alias in aliases]
    if len({email.casefold() for email in emails}) != 3:
        raise ScenarioLabError("owner and expert emails must be distinct")

    generation_id, issue_id = _new_generation_id(store), None
    issue_name = f"[AUTO:{generation_id}] TOPSIS-Sort 2016 synthetic classification"
    try:
        for alias in aliases:
            sessions.login(alias)
        owner_api = IssuesApi(sessions.client_for(owner_alias))
        model = _compatible_model(owner_api.models())
        catalog_users = _items(owner_api.users(), "users")
        for email in emails[1:]:
            if not any(str(item.get("email", "")).casefold() == email.casefold() for item in catalog_users):
                raise ScenarioLabError(f"configured expert is absent from the Backend user catalogue: {email}")
        supported = _supported_domain_type_keys(model)
        domain = _compatible_domain(owner_api.expression_domains(), supported, fixture)

        create_response = owner_api.create_issue(_issue_payload(issue_name, _id(model) or "", emails[1:], _id(domain) or "", fixture))
        if isinstance(create_response, dict):
            issue_id = _id(create_response) or _id(create_response.get("issue") or {})
        active_issues = _items(owner_api.active_issues(), "issues")
        matches = [item for item in active_issues if item.get("name") == issue_name]
        if len(matches) != 1 or not _id(matches[0]):
            raise ScenarioLabError("created issue could not be resolved uniquely from owner active issues")
        issue = matches[0]
        issue_id = _id(issue)
        if (
            issue.get("currentStage") != STAGE
            or issue.get("isConsensus") is not False
            or issue.get("isIssueOwner") is not True
            or issue.get("evaluationStructureKey") != "alternativeCriteriaMatrix"
            or issue.get("resultStructureKey") != RESULT_STRUCTURE_KEY
            or issue.get("resultStructureVersion") != RESULT_STRUCTURE_VERSION
        ):
            raise ScenarioLabError("resolved active issue does not match the non-consensus sorting@1 contract")

        for alias in aliases[1:]:
            IssuesApi(sessions.client_for(alias)).respond_to_invitation(issue_id, "accepted")

        contexts: list[dict[str, Any]] = []
        persisted_alternative_ids: dict[str, str] | None = None
        for alias in aliases[1:]:
            evaluation_response = IssuesApi(sessions.client_for(alias)).evaluation(issue_id, STAGE)
            decision_context = _validate_evaluation_context(evaluation_response, issue_id, _id(model) or "", fixture)
            active_issue = next((item for item in _items(owner_api.active_issues(), "issues") if _id(item) == issue_id), None)
            if not isinstance(active_issue, dict):
                raise ScenarioLabError("created issue disappeared from owner active issues")
            current_alternative_ids = _validate_remapped_configuration(active_issue, decision_context, fixture)
            if persisted_alternative_ids is not None and current_alternative_ids != persisted_alternative_ids:
                raise ScenarioLabError("expert contexts use different persisted alternative IDs")
            persisted_alternative_ids = current_alternative_ids
            contexts.append(decision_context)
            matrix = _evaluation_matrix(decision_context, fixture)
            submission = IssuesApi(sessions.client_for(alias)).submit_evaluation(issue_id, STAGE, matrix)
            if not isinstance(submission, dict) or submission.get("completed") is not True or submission.get("currentStage") != STAGE:
                raise ScenarioLabError(f"{alias} evaluation submission did not complete correctly")

        if contexts[0].get("issue", {}).get("isConsensus") is not False or contexts[1].get("issue", {}).get("isConsensus") is not False:
            raise ScenarioLabError("expert contexts must keep consensus disabled")
        computed = owner_api.compute_evaluation(issue_id, STAGE)
        result = computed.get("result") if isinstance(computed, dict) else None
        if not isinstance(computed, dict) or computed.get("stage") != STAGE or computed.get("currentStage") != "finished":
            raise ScenarioLabError("TOPSIS-Sort computation did not finish the issue")
        expected_by_alternative_id = {
            persisted_alternative_ids[next(item["name"] for item in fixture["alternatives"] if item["key"] == key)]: category
            for key, category in fixture["expectedAssignments"].items()
        }
        _validate_sorting_result(result, categories=fixture["orderedCategories"], expected_by_alternative_id=expected_by_alternative_id)

        finished_issues = _items(owner_api.finished_issues(), "issues")
        finished_matches = [item for item in finished_issues if _id(item) == issue_id or item.get("name") == issue_name]
        if len(finished_matches) != 1:
            raise ScenarioLabError("computed issue could not be resolved uniquely from Finished Issues")
        detail = owner_api.finished_issue(issue_id)
        assignments = _validate_finished(detail, issue_id, issue_name, fixture, persisted_alternative_ids)
        entry = GeneratedIssue(
            generationId=generation_id,
            scenarioId=SCENARIO_ID,
            issueId=issue_id,
            issueName=issue_name,
            ownerAlias=owner_alias,
            visibleUserAliases=list(aliases),
        )
        try:
            store.add(entry)
        except ManifestError as error:
            raise ScenarioLabError(f"issue finished but manifest persistence failed; issueId={issue_id}, issueName={issue_name}: {error}") from error
        return GenerationResult(generation_id, issue_id, issue_name, owner_alias, (expert_a_alias, expert_b_alias), str(store.path), assignments)
    except Exception as error:
        if issue_id:
            raise ScenarioLabError(
                f"{SCENARIO_ID} failed after issue creation (generationId={generation_id}, issueName={issue_name}, issueId={issue_id}): {error}"
            ) from error
        if isinstance(error, ScenarioLabError):
            raise
        raise ScenarioLabError(f"{SCENARIO_ID} preflight failed (generationId={generation_id}, issueName={issue_name}): {error}") from error


__all__ = [
    "FIXTURE_PATH",
    "MODEL_KEY",
    "RESULT_STRUCTURE_KEY",
    "RESULT_STRUCTURE_VERSION",
    "SCENARIO_ID",
    "_compatible_domain",
    "_compatible_model",
    "_issue_payload",
    "_validate_finished",
    "_validate_sorting_result",
    "generate",
    "load_fixture",
    "validate_fixture",
]
