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
EXPECTED_LABELS = ("Very Low", "Low", "Medium", "High", "Very High")


def _finite(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _fixture_leaves(data: dict[str, Any]) -> list[dict[str, str]]:
    return [child for parent in data["parents"] for child in parent["children"]]


def load_fixture(path: Path = FIXTURE_PATH) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ScenarioLabError(f"unable to load two-tuple Greece fixture: {path}") from error
    if not isinstance(data, dict) or len(data.get("parents", [])) != 7 or len(data.get("alternatives", [])) != 5:
        raise ScenarioLabError("two-tuple Greece fixture must contain seven parents and five alternatives")
    leaves = _fixture_leaves(data)
    if len(leaves) != 18 or [leaf.get("key") for leaf in leaves] != LEAF_KEYS or any(len(row) != 18 for row in data.get("sourceValues", {}).values()):
        raise ScenarioLabError("two-tuple Greece fixture must contain an 18-column source matrix")
    if set(data.get("sourceValues", {})) != {item["key"] for item in data["alternatives"]}:
        raise ScenarioLabError("source matrix must contain every authoritative alternative")
    if data.get("expressionDomain", {}).get("labels") != list(EXPECTED_LABELS):
        raise ScenarioLabError("two-tuple Greece fixture must declare the ordered five-label linguistic scale")
    if set(data.get("rankings", {})) != set(data.get("participants", {}).get("criteriaWeightingExperts", [])):
        raise ScenarioLabError("two-tuple Greece fixture must contain rankings for all weighting experts")
    for criterion in [*data["parents"], *leaves]:
        name, description = criterion.get("name"), criterion.get("description")
        if not isinstance(name, str) or not name.strip() or len(name) > 60:
            raise ScenarioLabError("two-tuple Greece fixture criterion names must be non-empty and at most 60 characters")
        if description is not None and (not isinstance(description, str) or len(description) > 500):
            raise ScenarioLabError("two-tuple Greece fixture criterion descriptions must be strings of at most 500 characters")
    return data


def _model(models: Any, key: str, *, kind: str | None = None) -> dict[str, Any]:
    groups = [models.get("models", []), models.get("criteriaWeightingModels", [])] if isinstance(models, dict) else []
    for entry in (item for group in groups for item in _items(group)):
        if entry.get("apiModelKey") == key and _id(entry) and (kind is None or entry.get("modelKind") == kind):
            if entry.get("publicUsable") is not False and entry.get("implementationStatus") not in {"scaffold", "experimental"}:
                return entry
    raise ScenarioLabError(f"required model {key} is unavailable or not publicly usable")


def _validate_main_model(model: dict[str, Any]) -> None:
    checks = {
        "apiModelKey": model.get("apiModelKey") == MODEL_KEY,
        "modelKind": model.get("modelKind") == "issue",
        "implementationStatus": model.get("implementationStatus") == "ready",
        "publicUsable": model.get("publicUsable") is True,
        "evaluationStructureKey": model.get("evaluationStructureKey") == "alternativeCriteriaMatrix",
        "requiresHomogeneousExpressionDomains": model.get("requiresHomogeneousExpressionDomains") is True,
        "usesCriterionTypes": model.get("usesCriterionTypes") is False,
        "usesCriteriaWeights": model.get("usesCriteriaWeights") is True,
    }
    parameters = {item.get("key"): item for item in model.get("parameters", []) if isinstance(item, dict)}
    for key, method in (("expertAggregation", "arithmetic_mean"), ("criteriaAggregation", "weighted_average")):
        methods = (parameters.get(key, {}).get("restrictions") or {}).get("methods")
        checks[f"{key} metadata"] = isinstance(methods, list) and any(isinstance(item, dict) and item.get("key") == method for item in methods)
    if not all(checks.values()):
        raise ScenarioLabError(f"two_tuple model is incompatible: {', '.join(key for key, valid in checks.items() if not valid)}")


def _domain(domains: Any) -> dict[str, Any]:
    for group_name in ("globals", "userDomains"):
        for item in _items(domains.get(group_name, []) if isinstance(domains, dict) else []):
            if item.get("typeKey") != "linguistic2Tuple" or not _id(item):
                continue
            labels = (item.get("definition") or {}).get("labels", [])
            names = [label.get("label", "").strip().casefold() for label in labels if isinstance(label, dict)]
            if len(labels) == 5 and names == [name.casefold() for name in EXPECTED_LABELS]:
                return item
    raise ScenarioLabError("no compatible five-label linguistic2Tuple domain is available")


def _leaf_node(child: dict[str, Any]) -> dict[str, Any]:
    node = {"id": f"criterion-{child['key']}", "name": child["name"], "type": "benefit", "children": []}
    if child.get("description") is not None:
        node["description"] = child["description"]
    return node


def _tree(data: dict[str, Any], *, leaves_only: bool = False) -> list[dict[str, Any]]:
    if leaves_only:
        return [_leaf_node(child) for parent in data["parents"] for child in parent["children"]]
    return [
        {
            "id": f"criterion-{parent['key']}",
            "name": parent["name"],
            "type": "group",
            "children": [_leaf_node(child) for child in parent["children"]],
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


def _delete_named_active_issue(api: IssuesApi, name: str) -> None:
    matches = [item for item in _items(api.active_issues(), "issues") if item.get("name") == name and _id(item)]
    if len(matches) != 1:
        raise ScenarioLabError(f"could not uniquely resolve generated active issue for cleanup: {name}")
    api.delete_active_issue(_id(matches[0]) or "")


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
    owner.create_issue(temp)
    try:
        issue_id = _find_issue(owner, temp_name)
    except Exception as error:
        try:
            _delete_named_active_issue(owner, temp_name)
        except Exception as cleanup_error:
            raise ScenarioLabError(f"temporary parent-weighting issue could not be resolved and cleanup failed: {cleanup_error}") from cleanup_error
        raise ScenarioLabError("temporary parent-weighting issue could not be resolved after creation and was deleted") from error
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
    if set(parents) != {parent["key"] for parent in data["parents"]}:
        raise ScenarioLabError("parent weights do not match the seven fixture parents")
    weights = {child["key"]: parents[parent["key"]] / len(parent["children"]) for parent in data["parents"] for child in parent["children"]}
    if abs(sum(weights.values()) - 1) > 1e-6 or any(not math.isfinite(value) or value < 0 for value in weights.values()):
        raise ScenarioLabError("propagated leaf weights are invalid")
    for parent in data["parents"]:
        children_total = sum(weights[child["key"]] for child in parent["children"])
        if abs(children_total - parents[parent["key"]]) > 1e-9:
            raise ScenarioLabError(f"propagated weights do not reconstruct parent {parent['key']}")
    return weights


def _label_keys(context: dict[str, Any]) -> dict[str, str]:
    leaf_criteria = _items(context, "leafCriteria")
    if len(leaf_criteria) != 18:
        raise ScenarioLabError("final context must expose exactly 18 leaf criteria")
    resolved: dict[str, str] | None = None
    expected = tuple(label.casefold() for label in EXPECTED_LABELS)
    for criterion in leaf_criteria:
        labels = ((criterion.get("expressionDomain") or {}).get("definition") or {}).get("labels")
        if not isinstance(labels, list) or len(labels) != 5:
            raise ScenarioLabError("final context has an incompatible linguistic domain")
        mapping: dict[str, str] = {}
        for label in labels:
            human_label = label.get("label") if isinstance(label, dict) else None
            key = label.get("key") if isinstance(label, dict) else None
            normalized = human_label.strip().casefold() if isinstance(human_label, str) else ""
            if normalized in mapping or normalized not in expected or not isinstance(key, str) or not key.strip():
                raise ScenarioLabError("final context has malformed linguistic label definitions")
            mapping[normalized] = key.strip()
        if tuple(mapping) != expected:
            raise ScenarioLabError("final context linguistic labels are not in the required semantic order")
        if resolved is not None and mapping != resolved:
            raise ScenarioLabError("final context does not use one homogeneous linguistic domain")
        resolved = mapping
    assert resolved is not None
    return resolved


def _final_identities(data: dict[str, Any], context: dict[str, Any], expected_weights: dict[str, float]) -> tuple[dict[str, str], dict[str, str]]:
    fixture_leaves = _fixture_leaves(data)
    criteria = _items(context, "leafCriteria")
    actual_names = [item.get("name") for item in criteria]
    expected_names = [item["name"] for item in fixture_leaves]
    persisted_ids = [_id(item) for item in criteria]
    if actual_names != expected_names or len(persisted_ids) != 18 or any(not item for item in persisted_ids) or len(set(persisted_ids)) != 18:
        raise ScenarioLabError("final leaf criteria do not preserve the fixture hierarchy order and unique persisted identities")
    leaf_ids = {leaf["key"]: persisted_ids[index] for index, leaf in enumerate(fixture_leaves)}
    alternatives = {item.get("name"): _id(item) for item in _items(context, "alternatives")}
    expected_alternatives = [item["name"] for item in data["alternatives"]]
    if set(alternatives) != set(expected_alternatives) or any(not value for value in alternatives.values()) or len(set(alternatives.values())) != 5:
        raise ScenarioLabError("final alternatives do not have the expected persisted identities")
    model_parameters = context.get("modelParameters")
    weights = model_parameters.get("weights") if isinstance(model_parameters, dict) else None
    if not isinstance(weights, dict) or set(weights) != set(persisted_ids):
        raise ScenarioLabError("final persisted weights do not use exactly the resolved leaf criterion identities")
    if any(not _finite(value) or value < 0 for value in weights.values()) or abs(sum(weights.values()) - 1) > 1e-6:
        raise ScenarioLabError("final persisted weights are not finite non-negative values summing to one")
    if any(abs(weights[criterion_id] - expected_weights[key]) > 1e-9 for key, criterion_id in leaf_ids.items()):
        raise ScenarioLabError("final persisted weights do not match propagated parent weights")
    if (
        model_parameters.get("expertAggregation", {}).get("method") != "arithmetic_mean"
        or model_parameters.get("criteriaAggregation", {}).get("method") != "weighted_average"
    ):
        raise ScenarioLabError("final model parameters do not preserve the requested aggregation methods")
    return alternatives, leaf_ids


def _matrix(data: dict[str, Any], context: dict[str, Any], *, alternatives: dict[str, str], criteria: dict[str, str]) -> dict[str, dict[str, dict[str, Any]]]:
    labels = _label_keys(context)
    expected = [name.casefold() for name in EXPECTED_LABELS]
    matrix: dict[str, dict[str, dict[str, Any]]] = {}
    for alt in data["alternatives"]:
        row: dict[str, dict[str, Any]] = {}
        for parent in data["parents"]:
            for child in parent["children"]:
                raw = data["sourceValues"][alt["key"]][LEAF_KEYS.index(child["key"])]
                level = 6 - raw if child["key"] in COST_KEYS else raw
                if child["key"] == "c3_clustering_possible":
                    level = {"Yes": 5, "Unsure": 3, "No": 1}[raw]
                if not isinstance(level, (int, float)) or not 1 <= level <= 5 or not alternatives.get(alt["name"]) or not criteria.get(child["key"]):
                    raise ScenarioLabError("source matrix cannot be mapped to persisted issue identities")
                row[criteria[child["key"]]] = {"labelKey": labels[expected[int(level) - 1]], "alpha": 0}
        matrix[alternatives[alt["name"]]] = row
    return matrix


def _validate_finished(response: Any, alternative_ids: dict[str, str], criterion_ids: dict[str, str]) -> None:
    result = response.get("result") if isinstance(response, dict) else None
    if not isinstance(response, dict) or response.get("currentStage") != "finished" or not isinstance(result, dict):
        raise ScenarioLabError("two-tuple Greece computation did not finish")
    ranking = result.get("rankedAlternatives")
    if not isinstance(ranking, list) or len(ranking) != 5:
        raise ScenarioLabError("final result must rank exactly five alternatives")
    ranking_ids = [item.get("alternativeId") for item in ranking if isinstance(item, dict)]
    ranks = [item.get("rank") for item in ranking if isinstance(item, dict)]
    if (
        set(ranking_ids) != set(alternative_ids.values())
        or len(set(ranking_ids)) != 5
        or any(item.get("name") not in alternative_ids for item in ranking if isinstance(item, dict))
        or any(item.get("alternativeId") != alternative_ids.get(item.get("name")) for item in ranking if isinstance(item, dict))
        or any(not _finite(item.get("score")) for item in ranking if isinstance(item, dict))
        or set(ranks) != {1, 2, 3, 4, 5}
        or any(not isinstance(rank, int) or isinstance(rank, bool) for rank in ranks)
    ):
        raise ScenarioLabError("final ranking is incompatible with persisted alternatives")
    collective = result.get("collectiveEvaluations")
    if not isinstance(collective, dict) or set(collective) != set(alternative_ids.values()):
        raise ScenarioLabError("final collective evaluations do not contain exactly five persisted alternatives")
    for row in collective.values():
        if not isinstance(row, dict) or set(row) != set(criterion_ids.values()):
            raise ScenarioLabError("final collective evaluations do not contain every persisted leaf criterion")
        for cell in row.values():
            if not isinstance(cell, dict) or set(cell) != {"labelKey", "alpha"} or not isinstance(cell.get("labelKey"), str) or not _finite(cell.get("alpha")):
                raise ScenarioLabError("final collective linguistic cells are not canonical JSON values")
    try:
        json.dumps(result, allow_nan=False)
    except (TypeError, ValueError) as error:
        raise ScenarioLabError("final two-tuple result is not JSON serializable") from error


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
        _validate_main_model(main)
        weighting = _model(models, WEIGHTING_KEY, kind="criteriaWeighting")
        if weighting.get("supportsExpertCriteriaWeighting") is not True:
            raise ScenarioLabError("preference_order_criteria_weights does not support expert criteria weighting")
        domain = _domain(owner.expression_domains())
        parents = _parent_weights(data, sessions, owner, _id(main) or "", _id(domain) or "", generation_id)
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
        alternatives, criterion_ids = _final_identities(data, context, leaves)
        matrix = _matrix(data, context, alternatives=alternatives, criteria=criterion_ids)
        expert.submit_evaluation(issue_id, ALTERNATIVE_STAGE, matrix)
        finished = owner.compute_evaluation(issue_id, ALTERNATIVE_STAGE)
        _validate_finished(finished, alternatives, criterion_ids)
        detail = owner.finished_issue(issue_id)
        final_expert_email = sessions.users[data["participants"]["finalExpert"]].email.casefold()
        participants = _items(detail, "participants")
        accepted = [item for item in participants if ((item.get("expert") or {}).get("email") or "").casefold() == final_expert_email]
        if len(participants) != 1 or len(accepted) != 1:
            raise ScenarioLabError("finished issue does not have exactly one final accepted expert")
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
