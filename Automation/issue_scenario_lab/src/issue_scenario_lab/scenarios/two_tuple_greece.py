from __future__ import annotations

import json
import math
import secrets
from pathlib import Path
from typing import Any

from issue_scenario_lab.api.issues import IssuesApi
from issue_scenario_lab.api.session_pool import SessionPool
from issue_scenario_lab.errors import ScenarioLabError
from issue_scenario_lab.manifest.models import GeneratedIssue
from issue_scenario_lab.manifest.store import ManifestStore
from issue_scenario_lab.scenarios.no_consensus_basic import _id, _items

SCENARIO_ID = "two-tuple-greece"
CRITERIA_STAGE = "criteriaWeighting"
ALTERNATIVE_STAGE = "alternativeEvaluation"
MODEL_KEY = "two_tuple"
WEIGHTING_KEY = "preference_order_criteria_weights"
FIXTURE_PATH = Path(__file__).parents[3] / "data" / "two_tuple_greece.json"
LEAF_KEYS = [child["key"] for parent in json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))["parents"] for child in parent["children"]]
COST_KEYS = {"c6_land_rent", "c6_installation_cost", "c6_maintenance_cost"}


def load_fixture(path: Path = FIXTURE_PATH) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ScenarioLabError(f"unable to load two-tuple Greece fixture: {path}") from error
    if not isinstance(data, dict) or len(data.get("parents", [])) != 7 or len(data.get("alternatives", [])) != 5:
        raise ScenarioLabError("two-tuple Greece fixture must contain seven parents and five alternatives")
    if len(LEAF_KEYS) != 18 or any(len(row) != 18 for row in data.get("sourceValues", {}).values()):
        raise ScenarioLabError("two-tuple Greece fixture must contain an 18-column source matrix")
    if set(data.get("sourceValues", {})) != {item["key"] for item in data["alternatives"]}:
        raise ScenarioLabError("source matrix must contain every authoritative alternative")
    return data


def _model(models: Any, key: str, *, kind: str | None = None) -> dict[str, Any]:
    groups = [models.get("models", []), models.get("criteriaWeightingModels", [])] if isinstance(models, dict) else []
    for entry in (item for group in groups for item in _items(group)):
        if entry.get("apiModelKey") == key and _id(entry) and (kind is None or entry.get("modelKind") == kind):
            if entry.get("publicUsable") is not False and entry.get("implementationStatus") not in {"scaffold", "experimental"}:
                return entry
    raise ScenarioLabError(f"required model {key} is unavailable or not publicly usable")


def _domain(domains: Any) -> dict[str, Any]:
    for group_name in ("globals", "userDomains"):
        for item in _items(domains.get(group_name, []) if isinstance(domains, dict) else []):
            if item.get("typeKey") != "linguistic2Tuple" or not _id(item):
                continue
            labels = (item.get("definition") or {}).get("labels", [])
            names = [label.get("label", "").casefold() for label in labels if isinstance(label, dict)]
            if len(labels) == 5 and names == [name.casefold() for name in ["Very Low", "Low", "Medium", "High", "Very High"]]:
                return item
    raise ScenarioLabError("no compatible five-label linguistic2Tuple domain is available")


def _tree(data: dict[str, Any], *, leaves_only: bool = False) -> list[dict[str, Any]]:
    if leaves_only:
        return [
            {"id": f"criterion-{child['key']}", "name": child["name"], "type": "benefit", "children": []}
            for parent in data["parents"]
            for child in parent["children"]
        ]
    return [
        {
            "id": f"criterion-{parent['key']}",
            "name": parent["name"],
            "type": "group",
            "children": [{"id": f"criterion-{child['key']}", "name": child["name"], "type": "benefit", "children": []} for child in parent["children"]],
        }
        for parent in data["parents"]
    ]


def _payload(data: dict[str, Any], *, name: str, model_id: str, domain_id: str, emails: list[str], config: dict[str, Any]) -> dict[str, Any]:
    return {
        "issueName": name,
        "issueDescription": data["issue"]["description"],
        "selectedModelId": model_id,
        "alternatives": [{"name": item["name"], "description": item["sourceSiteId"]} for item in data["alternatives"]],
        "criteria": [{"id": "criteria-root", "name": "Greece decision criteria", "type": "group", "children": _tree(data)}],
        "addedExperts": [{"email": email, "weight": 1 / len(emails)} for email in emails],
        "expressionDomainConfig": {"mode": "global", "globalDomainId": domain_id},
        "closureDate": None,
        "isConsensus": False,
        "simulateConsensus": False,
        "paramValues": {
            "expertAggregation": {"method": "arithmetic_mean", "options": {}},
            "criteriaAggregation": {"method": "weighted_average", "options": {}},
        },
        "criteriaWeightingParameters": {},
        "criteriaWeightingConfig": config,
    }


def _find_issue(api: IssuesApi, name: str) -> str:
    issue = next((item for item in _items(api.active_issues(), "issues") if item.get("name") == name), None)
    if not issue or not _id(issue):
        raise ScenarioLabError("created issue could not be resolved from active issues")
    return _id(issue) or ""


def _context(response: Any, issue_id: str, stage: str, model_key: str) -> dict[str, Any]:
    context = response.get("decisionContext") if isinstance(response, dict) else None
    issue = context.get("issue") if isinstance(context, dict) else None
    model = context.get("model") if isinstance(context, dict) else None
    if (
        not isinstance(context, dict)
        or not isinstance(issue, dict)
        or _id(issue) != issue_id
        or response.get("stage") != stage
        or issue.get("currentStage") != stage
        or not isinstance(model, dict)
        or model.get("apiModelKey") != model_key
    ):
        raise ScenarioLabError(f"{stage} response is incompatible with persisted issue")
    return context


def _parent_weights(data: dict[str, Any], sessions: SessionPool, owner: IssuesApi, model_id: str, domain_id: str, generation_id: str) -> dict[str, float]:
    experts = data["participants"]["criteriaWeightingExperts"]
    temp_name = f"[AUTO:{generation_id}] internal parent weighting"
    temp = _payload(
        data,
        name=temp_name,
        model_id=model_id,
        domain_id=domain_id,
        emails=[sessions.users[a].email for a in experts],
        config={"mode": "expertApiModel", "source": "experts", "method": "apiModel", "criteriaWeightingModelKey": WEIGHTING_KEY, "payload": {}},
    )
    temp["criteria"] = [
        {
            "id": "criteria-root",
            "name": "Parent criteria",
            "type": "group",
            "children": [{"id": f"criterion-{p['key']}", "name": p["name"], "type": "benefit", "children": []} for p in data["parents"]],
        }
    ]
    temp["paramValues"] = {}
    owner.create_issue(temp)
    issue_id = _find_issue(owner, temp_name)
    criterion_ids: dict[str, str] = {}
    try:
        for alias in experts:
            api = IssuesApi(sessions.client_for(alias))
            api.respond_to_invitation(issue_id, "accepted")
            response = api.evaluation(issue_id, CRITERIA_STAGE)
            context = _context(response, issue_id, CRITERIA_STAGE, WEIGHTING_KEY)
            criteria = {item.get("name"): _id(item) for item in _items(context, "leafCriteria")}
            criterion_ids.update({name: value for name, value in criteria.items()})
            order = [criteria[next(p["name"] for p in data["parents"] if p["key"] == key)] for key in data["rankings"][alias]]
            api.submit_evaluation(issue_id, CRITERIA_STAGE, {"criterionOrder": order})
        computed = owner.compute_evaluation(issue_id, CRITERIA_STAGE)
        weights = (computed.get("result") or {}).get("weightsByCriterion")
        if computed.get("currentStage") != ALTERNATIVE_STAGE or not isinstance(weights, dict) or len(weights) != 7:
            raise ScenarioLabError("parent criteria weighting did not finalize seven weights")
        values = [float(value) for value in weights.values()]
        if any(not math.isfinite(value) or value < 0 for value in values) or abs(sum(values) - 1) > 1e-6:
            raise ScenarioLabError("parent criteria weights are not finite non-negative values summing to one")
        by_name = {parent["name"]: float(weights[criterion_ids[parent["name"]]]) for parent in data["parents"]}
        return {parent["key"]: by_name[parent["name"]] for parent in data["parents"]}
    finally:
        owner.delete_active_issue(issue_id)


def _leaf_weights(data: dict[str, Any], parents: dict[str, float]) -> dict[str, float]:
    weights = {child["key"]: parents[parent["key"]] / len(parent["children"]) for parent in data["parents"] for child in parent["children"]}
    if abs(sum(weights.values()) - 1) > 1e-6 or any(not math.isfinite(value) or value < 0 for value in weights.values()):
        raise ScenarioLabError("propagated leaf weights are invalid")
    return weights


def _matrix(data: dict[str, Any], context: dict[str, Any]) -> dict[str, dict[str, dict[str, Any]]]:
    labels = {
        label.casefold(): label.get("key")
        for label in ((next(iter(_items(context, "leafCriteria")), {}).get("expressionDomain") or {}).get("definition", {}).get("labels", []))
        if isinstance(label, dict)
    }
    expected = [name.casefold() for name in data["expressionDomain"]["labels"]]
    if set(labels) != set(expected) or any(not isinstance(value, str) for value in labels.values()):
        raise ScenarioLabError("final context lacks the required five-label linguistic domain")
    alternatives = {item.get("name"): _id(item) for item in _items(context, "alternatives")}
    criteria = {item.get("name"): _id(item) for item in _items(context, "leafCriteria")}
    matrix: dict[str, dict[str, dict[str, Any]]] = {}
    for alt in data["alternatives"]:
        row: dict[str, dict[str, Any]] = {}
        for parent in data["parents"]:
            for child in parent["children"]:
                raw = data["sourceValues"][alt["key"]][LEAF_KEYS.index(child["key"])]
                level = 6 - raw if child["key"] in COST_KEYS else raw
                if child["key"] == "c3_clustering_possible":
                    level = {"Yes": 5, "Unsure": 3, "No": 1}[raw]
                if not isinstance(level, (int, float)) or not 1 <= level <= 5 or not alternatives.get(alt["name"]) or not criteria.get(child["name"]):
                    raise ScenarioLabError("source matrix cannot be mapped to persisted issue identities")
                row[criteria[child["name"]]] = {"labelKey": labels[expected[int(level) - 1]], "alpha": 0}
        matrix[alternatives[alt["name"]]] = row
    return matrix


def generate(sessions: SessionPool, store: ManifestStore, *, owner_alias: str = "owner", fixture_path: Path = FIXTURE_PATH) -> Any:
    data = load_fixture(fixture_path)
    aliases = [owner_alias, *data["participants"]["criteriaWeightingExperts"]]
    if any(alias not in sessions.users for alias in aliases) or len({sessions.users[a].email.casefold() for a in aliases}) != len(aliases):
        raise ScenarioLabError("two-tuple-greece requires distinct configured owner and expert aliases")
    generation_id = secrets.token_hex(5)
    name = f"[AUTO:{generation_id}] {data['issue']['name']}"
    issue_id: str | None = None
    sessions.login(owner_alias)
    for alias in data["participants"]["criteriaWeightingExperts"]:
        sessions.login(alias)
    owner = IssuesApi(sessions.client_for(owner_alias))
    try:
        models = owner.models()
        main = _model(models, MODEL_KEY, kind="issue")
        weighting = _model(models, WEIGHTING_KEY, kind="criteriaWeighting")
        if weighting.get("supportsExpertCriteriaWeighting") is not True:
            raise ScenarioLabError("preference_order_criteria_weights does not support expert criteria weighting")
        issue_models = [item for item in _items(models.get("models", [])) if item.get("modelKind") == "issue"]
        temp_model = next(
            (item for item in issue_models if item.get("apiModelKey") == "topsis_2tuple" and item.get("supportsExpertCriteriaWeighting") is True), None
        )
        if temp_model is None:
            temp_model = next(
                (
                    item
                    for item in issue_models
                    if item.get("supportsExpertCriteriaWeighting") is True and item.get("evaluationStructureKey") == "alternativeCriteriaMatrix"
                ),
                None,
            )
        if temp_model is None:
            raise ScenarioLabError("no issue model supports the temporary expert criteria-weighting stage")
        domain = _domain(owner.expression_domains())
        parents = _parent_weights(data, sessions, owner, _id(temp_model) or "", _id(domain) or "", generation_id)
        leaves = _leaf_weights(data, parents)
        final = _payload(
            data,
            name=name,
            model_id=_id(main) or "",
            domain_id=_id(domain) or "",
            emails=[sessions.users[data["participants"]["finalExpert"]].email],
            config={
                "mode": "creatorManual",
                "source": "creator",
                "method": "manual",
                "structureKey": "manualCriteriaWeights",
                "payload": {"weightsByCriterion": {f"criterion-{key}": value for key, value in leaves.items()}},
            },
        )
        owner.create_issue(final)
        issue_id = _find_issue(owner, name)
        expert = IssuesApi(sessions.client_for(data["participants"]["finalExpert"]))
        expert.respond_to_invitation(issue_id, "accepted")
        response = expert.evaluation(issue_id, ALTERNATIVE_STAGE)
        context = _context(response, issue_id, ALTERNATIVE_STAGE, MODEL_KEY)
        persisted_leaf_ids = {_id(item) for item in _items(context, "leafCriteria")}
        if persisted_leaf_ids != {f"criterion-{key}" for key in leaves}:
            raise ScenarioLabError("final issue did not preserve the resolved leaf criterion identities used for weights")
        matrix = _matrix(data, context)
        expert.submit_evaluation(issue_id, ALTERNATIVE_STAGE, matrix)
        finished = owner.compute_evaluation(issue_id, ALTERNATIVE_STAGE)
        if finished.get("currentStage") != "finished":
            raise ScenarioLabError("two-tuple Greece issue did not finish")
        entry = GeneratedIssue(
            generationId=generation_id,
            scenarioId=SCENARIO_ID,
            issueId=issue_id,
            issueName=name,
            ownerAlias=owner_alias,
            visibleUserAliases=[owner_alias, data["participants"]["finalExpert"]],
        )
        store.add(entry)
        return type(
            "GenerationResult",
            (),
            {
                "generation_id": generation_id,
                "issue_id": issue_id,
                "issue_name": name,
                "owner_alias": owner_alias,
                "expert_aliases": (data["participants"]["finalExpert"],),
                "manifest_path": str(store.path),
            },
        )()
    except Exception as error:
        if issue_id:
            raise ScenarioLabError(f"{SCENARIO_ID} failed after issue creation (generationId={generation_id}, issueId={issue_id}): {error}") from error
        raise ScenarioLabError(f"{SCENARIO_ID} preflight failed: {error}") from error
