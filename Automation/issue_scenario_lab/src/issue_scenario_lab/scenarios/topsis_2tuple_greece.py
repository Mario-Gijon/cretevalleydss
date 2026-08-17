from __future__ import annotations

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

SCENARIO_ID = "topsis-2tuple-greece"
CRITERIA_STAGE = "criteriaWeighting"
ALTERNATIVE_STAGE = "alternativeEvaluation"
MAIN_MODEL_KEY = "topsis_2tuple"
WEIGHTING_MODEL_KEY = "preference_order_criteria_weights"
FIXTURE_PATH = Path(__file__).parents[3] / "data" / "topsis_2tuple_greece.json"


@dataclass(frozen=True)
class GenerationResult:
    generation_id: str
    issue_id: str
    issue_name: str
    owner_alias: str
    expert_aliases: tuple[str, ...]
    manifest_path: str
    finalized_weights: dict[str, float]
    remaining_expert: str


def load_fixture(path: Path = FIXTURE_PATH) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ScenarioLabError(f"unable to load TOPSIS 2-tuple Greece fixture: {path}") from error
    if not isinstance(value, dict):
        raise ScenarioLabError("TOPSIS 2-tuple Greece fixture must be an object")
    validate_fixture(value)
    return value


def validate_fixture(data: dict[str, Any]) -> None:
    participants, criteria, alternatives = data.get("participants"), data.get("criteria"), data.get("alternatives")
    if not isinstance(participants, dict) or not isinstance(criteria, list) or not isinstance(alternatives, list):
        raise ScenarioLabError("fixture participants, criteria, and alternatives are required")
    experts, remaining = participants.get("criteriaWeightingExperts"), participants.get("remainingExpert")
    if not isinstance(experts, list) or len(experts) != 5 or any(not isinstance(alias, str) or not alias for alias in experts) or len(set(experts)) != 5:
        raise ScenarioLabError("fixture must contain exactly five unique criteriaWeightingExperts")
    if remaining not in experts:
        raise ScenarioLabError("fixture remainingExpert must be one of criteriaWeightingExperts")
    criterion_keys = [item.get("key") for item in criteria if isinstance(item, dict)]
    alternative_keys = [item.get("key") for item in alternatives if isinstance(item, dict)]
    if not criterion_keys or len(criterion_keys) != len(criteria) or len(set(criterion_keys)) != len(criteria):
        raise ScenarioLabError("fixture criteria require unique keys")
    if any(not isinstance(item.get("name"), str) or item.get("type") not in {"benefit", "cost"} for item in criteria):
        raise ScenarioLabError("fixture criteria require names and benefit/cost types")
    if not alternative_keys or len(alternative_keys) != len(alternatives) or len(set(alternative_keys)) != len(alternatives):
        raise ScenarioLabError("fixture alternatives require unique keys")
    rankings = (data.get("criteriaWeighting") or {}).get("rankings")
    if not isinstance(rankings, dict) or set(rankings) != set(experts):
        raise ScenarioLabError("fixture rankings must contain exactly one ranking for every weighting expert")
    for alias, ranking in rankings.items():
        if not isinstance(ranking, list) or len(ranking) != len(criterion_keys) or set(ranking) != set(criterion_keys):
            raise ScenarioLabError(f"fixture ranking for {alias} must contain every criterion exactly once")
    evaluations = ((data.get("alternativeEvaluation") or {}).get("evaluations"))
    if not isinstance(evaluations, dict) or set(evaluations) != set(alternative_keys):
        raise ScenarioLabError("fixture alternative evaluation matrix must contain every alternative exactly once")
    for alternative, row in evaluations.items():
        if not isinstance(row, dict) or set(row) != set(criterion_keys):
            raise ScenarioLabError(f"fixture alternative evaluation row {alternative} must contain every criterion exactly once")
        for value in row.values():
            if not isinstance(value, dict) or not isinstance(value.get("labelKey"), str) or not isinstance(value.get("alpha"), (int, float)) or not math.isfinite(float(value["alpha"])):
                raise ScenarioLabError("fixture linguistic values require labelKey and numeric alpha")
    domain = data.get("expressionDomain")
    if not isinstance(domain, dict) or domain.get("typeKey") != "linguistic2Tuple" or domain.get("labelCount") != 5:
        raise ScenarioLabError("fixture requires a five-label linguistic2Tuple expression domain")
    if (data.get("criteriaWeighting") or {}).get("model") != WEIGHTING_MODEL_KEY or (data.get("alternativeEvaluation") or {}).get("model") != MAIN_MODEL_KEY:
        raise ScenarioLabError("fixture model keys are incompatible with this scenario")


def removal_aliases(data: dict[str, Any]) -> list[str]:
    return [alias for alias in data["participants"]["criteriaWeightingExperts"] if alias != data["participants"]["remainingExpert"]]


def _model(models: Any, key: str, kind: str, structure: str) -> dict[str, Any]:
    entries = [*_items(models.get("models") if isinstance(models, dict) else []), *_items(models.get("criteriaWeightingModels") if isinstance(models, dict) else [])]
    item = next((entry for entry in entries if entry.get("apiModelKey") == key), None)
    if not item or not _id(item) or item.get("modelKind") != kind or item.get("evaluationStructureKey") != structure or item.get("publicUsable") is False:
        raise ScenarioLabError(f"required model {key} is unavailable or incompatible")
    return item


def _domain(domains: Any, expected: dict[str, Any]) -> dict[str, Any]:
    for group in (domains.get("globals", []), domains.get("userDomains", [])) if isinstance(domains, dict) else ():
        for item in _items(group):
            if item.get("typeKey") == expected.get("typeKey") and _id(item):
                labels = (item.get("definition") or {}).get("labels")
                if expected.get("labelCount") is None or (isinstance(labels, list) and len(labels) == expected["labelCount"]):
                    return item
    raise ScenarioLabError("no compatible linguistic2Tuple expression domain is available")


def _issue_payload(data: dict[str, Any], *, name: str, model_id: str, domain_id: str, expert_emails: list[str]) -> dict[str, Any]:
    leaves = [{"id": f"criterion-{item['key']}", "name": item["name"], "type": item["type"], "children": []} for item in data["criteria"]]
    return {"issueName": name, "issueDescription": data["issue"]["description"], "selectedModelId": model_id,
            "alternatives": [{"name": item["name"], "description": item.get("description", "")} for item in data["alternatives"]],
            "criteria": [{"id": "criteria-root", "name": "Greece decision criteria", "type": "group", "children": leaves}],
            "addedExperts": expert_emails, "expressionDomainConfig": {"mode": "global", "globalDomainId": domain_id}, "closureDate": None,
            "isConsensus": False, "simulateConsensus": False, "paramValues": {}, "criteriaWeightingParameters": {},
            "criteriaWeightingConfig": {"mode": "expertApiModel", "source": "experts", "method": "apiModel", "criteriaWeightingModelKey": WEIGHTING_MODEL_KEY, "payload": {}}}


def _context_maps(response: Any, issue_id: str, *, stage: str, structure: str, model_key: str) -> tuple[dict[str, str], dict[str, str], dict[str, Any]]:
    context = response.get("decisionContext") if isinstance(response, dict) else None
    issue = context.get("issue") if isinstance(context, dict) else None
    if not isinstance(context, dict) or not isinstance(issue, dict) or _id(issue) != issue_id or response.get("stage") != stage or response.get("structureKey") != structure or issue.get("currentStage") != stage:
        raise ScenarioLabError(f"{stage} response is incompatible with the persisted issue")
    model = context.get("model")
    if not isinstance(model, dict) or model.get("apiModelKey") != model_key:
        raise ScenarioLabError(f"{stage} response does not use {model_key}")
    criteria = {item.get("name"): _id(item) for item in _items(context, "leafCriteria")}
    alternatives = {item.get("name"): _id(item) for item in _items(context, "alternatives")}
    if not criteria or any(not value for value in criteria.values()):
        raise ScenarioLabError("evaluation context is missing persisted criterion ids")
    return criteria, alternatives, context


def _active_issue(api: IssuesApi, issue_id: str) -> dict[str, Any]:
    issue = next((item for item in _items(api.active_issues(), "issues") if _id(item) == issue_id), None)
    if not issue:
        raise ScenarioLabError("generated issue is no longer visible as active")
    return issue


def generate(sessions: SessionPool, store: ManifestStore, *, owner_alias: str = "admin", fixture_path: Path = FIXTURE_PATH) -> GenerationResult:
    data = load_fixture(fixture_path)
    participants = data["participants"]
    aliases = (owner_alias, *participants["criteriaWeightingExperts"])
    if owner_alias != participants["creator"] or any(alias not in sessions.users for alias in aliases) or len({sessions.users[alias].email.casefold() for alias in aliases}) != len(aliases):
        raise ScenarioLabError("topsis-2tuple-greece requires configured distinct aliases: admin, expert1, expert2, expert3, expert4, expert5")
    generation_id, issue_id = secrets.token_hex(5), None
    issue_name = f"[AUTO:{generation_id}] {data['issue']['name']}"
    try:
        for alias in aliases:
            sessions.login(alias)
        owner = IssuesApi(sessions.client_for(owner_alias))
        main, weighting = _model(owner.models(), MAIN_MODEL_KEY, "issue", "alternativeCriteriaMatrix"), _model(owner.models(), WEIGHTING_MODEL_KEY, "criteriaWeighting", "criteriaPreferenceOrder")
        if weighting.get("supportsExpertCriteriaWeighting") is not True:
            raise ScenarioLabError("preference_order_criteria_weights does not support expert criteria weighting")
        domain = _domain(owner.expression_domains(), data["expressionDomain"])
        emails = [sessions.users[alias].email for alias in participants["criteriaWeightingExperts"]]
        owner.create_issue(_issue_payload(data, name=issue_name, model_id=_id(main) or "", domain_id=_id(domain) or "", expert_emails=emails))
        issue_id = _id(next((item for item in _items(owner.active_issues(), "issues") if item.get("name") == issue_name), {}))
        if not issue_id:
            raise ScenarioLabError("created issue could not be resolved from active issues")
        for alias in participants["criteriaWeightingExperts"]:
            IssuesApi(sessions.client_for(alias)).respond_to_invitation(issue_id, "accepted")
        for alias in participants["criteriaWeightingExperts"]:
            api = IssuesApi(sessions.client_for(alias))
            response = api.evaluation(issue_id, CRITERIA_STAGE)
            criteria, _, _ = _context_maps(response, issue_id, stage=CRITERIA_STAGE, structure="criteriaPreferenceOrder", model_key=WEIGHTING_MODEL_KEY)
            criterion_names = {item["key"]: item["name"] for item in data["criteria"]}
            order = [criteria[criterion_names[data_key]] for data_key in data["criteriaWeighting"]["rankings"][alias]]
            api.submit_evaluation(issue_id, CRITERIA_STAGE, {"criterionOrder": order})
        computed = owner.compute_evaluation(issue_id, CRITERIA_STAGE)
        weights = ((computed.get("result") or {}).get("weightsByCriterion")) if isinstance(computed, dict) else None
        if computed.get("currentStage") != ALTERNATIVE_STAGE or not isinstance(weights, dict) or not weights:
            raise ScenarioLabError("criteria weighting did not finalize persisted collective weights")
        finalized_weights = dict(weights)
        remaining = participants["remainingExpert"]
        removed_aliases = removal_aliases(data)
        alternative_api = IssuesApi(sessions.client_for(remaining))
        for position, removed_alias in enumerate(removed_aliases, start=1):
            owner.edit_experts(issue_id, experts_to_add=[], experts_to_remove=[sessions.users[removed_alias].email])
            _active_issue(owner, issue_id)
            post_removal = alternative_api.evaluation(issue_id, ALTERNATIVE_STAGE)
            _, _, post_removal_context = _context_maps(post_removal, issue_id, stage=ALTERNATIVE_STAGE, structure="alternativeCriteriaMatrix", model_key=MAIN_MODEL_KEY)
            if post_removal_context.get("modelParameters", {}).get("weights") != finalized_weights:
                raise ScenarioLabError(f"participant removal {position} changed finalized collective criterion weights")
        active = _active_issue(owner, issue_id)
        progress = active.get("progress") if isinstance(active, dict) else {}
        if isinstance(progress, dict) and progress.get("totalAccepted") not in (None, 1):
            raise ScenarioLabError("participant removal did not leave exactly one accepted expert")
        response = alternative_api.evaluation(issue_id, ALTERNATIVE_STAGE)
        criteria, alternatives, context = _context_maps(response, issue_id, stage=ALTERNATIVE_STAGE, structure="alternativeCriteriaMatrix", model_key=MAIN_MODEL_KEY)
        current_weights = (context.get("modelParameters") or {}).get("weights")
        if current_weights != finalized_weights:
            raise ScenarioLabError("participant removal changed finalized collective criterion weights")
        matrix = {alternatives[item["name"]]: {criteria[criterion["name"]]: data["alternativeEvaluation"]["evaluations"][item["key"]][criterion["key"]] for criterion in data["criteria"]} for item in data["alternatives"]}
        alternative_api.submit_evaluation(issue_id, ALTERNATIVE_STAGE, matrix)
        finished = owner.compute_evaluation(issue_id, ALTERNATIVE_STAGE)
        if finished.get("currentStage") != "finished":
            raise ScenarioLabError("TOPSIS 2-tuple did not finish the issue")
        detail = owner.finished_issue(issue_id)
        active_participants = [entry for entry in _items(detail, "participants") if (entry.get("expert") or {}).get("email") == sessions.users[remaining].email]
        historical_weights = [entry for entry in _items((detail.get("evaluations") or {}).get("individual"), "") if entry.get("stage") == CRITERIA_STAGE]
        if len(active_participants) != 1 or len(historical_weights) != 5:
            raise ScenarioLabError("finished issue does not preserve one active participant and five historical weight submissions")
        entry = GeneratedIssue(generationId=generation_id, scenarioId=SCENARIO_ID, issueId=issue_id, issueName=issue_name, ownerAlias=owner_alias, visibleUserAliases=[owner_alias, remaining])
        store.add(entry)
        return GenerationResult(generation_id, issue_id, issue_name, owner_alias, tuple(participants["criteriaWeightingExperts"]), str(store.path), finalized_weights, remaining)
    except Exception as error:
        if issue_id:
            raise ScenarioLabError(f"{SCENARIO_ID} failed after issue creation (generationId={generation_id}, issueId={issue_id}): {error}") from error
        raise ScenarioLabError(f"{SCENARIO_ID} preflight failed: {error}") from error
