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

SCENARIO_ID = "two-tuple-greece-video"
CRITERIA_STAGE = "criteriaWeighting"
ALTERNATIVE_STAGE = "alternativeEvaluation"
MODEL_KEY = "two_tuple"
WEIGHTING_KEY = "preference_order_criteria_weights"
FIXTURE_PATH = Path(__file__).parents[3] / "data" / "two_tuple_greece_video.json"
EXPECTED_LABELS = ("Very Low", "Low", "Medium", "High", "Very High")


def _finite(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _fixture_leaves(data: dict[str, Any]) -> list[dict[str, Any]]:
    return [child for parent in data["parents"] for child in parent["children"]]


def load_fixture(path: Path = FIXTURE_PATH) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ScenarioLabError(f"unable to load two-tuple Greece video fixture: {path}") from error
    if (
        not isinstance(data, dict)
        or len(data.get("parents", [])) != 7
        or len(data.get("alternatives", [])) != 5
    ):
        raise ScenarioLabError("two-tuple Greece video fixture must contain seven parents and five alternatives")
    leaves = _fixture_leaves(data)
    participants = data.get("participants", {})
    experts = participants.get("criteriaWeightingExperts", [])
    leaf_keys = [child.get("key") for child in leaves]
    if (
        len(leaves) != 18
        or len(set(leaf_keys)) != 18
        or any(len(row) != 18 for matrix in data.get("sourceValuesByExpert", {}).values() for row in matrix.values())
    ):
        raise ScenarioLabError("two-tuple Greece video fixture must contain an 18-column source matrix")
    if set(data.get("sourceValuesByExpert", {})) != set(experts) or any(set(matrix) != {item["key"] for item in data["alternatives"]} for matrix in data["sourceValuesByExpert"].values()):
        raise ScenarioLabError("source matrix must contain every authoritative alternative")
    if data.get("expressionDomain", {}).get("labels") != list(EXPECTED_LABELS):
        raise ScenarioLabError("two-tuple Greece video fixture must declare the ordered five-label linguistic scale")
    if not isinstance(experts, list) or len(experts) != 5 or len(set(experts)) != 5:
        raise ScenarioLabError("two-tuple Greece video fixture must contain five unique weighting experts")
    if participants.get("finalExpert") not in experts:
        raise ScenarioLabError("two-tuple Greece video fixture finalExpert must be a criteria-weighting expert")
    rankings = data.get("rankings", {})
    parent_keys = [parent.get("key") for parent in data["parents"]]
    if set(rankings) != set(experts) or any(
        not isinstance(ranking, list)
        or len(ranking) != 7
        or set(ranking) != set(parent_keys)
        for ranking in rankings.values()
    ):
        raise ScenarioLabError("two-tuple Greece video fixture rankings must cover all seven parents for every expert")
    for criterion in [*data["parents"], *leaves]:
        name, description = criterion.get("name"), criterion.get("description")
        if not isinstance(name, str) or not name.strip() or len(name) > 60:
            raise ScenarioLabError("two-tuple Greece video fixture criterion names must be non-empty and at most 60 characters")
        if description is not None and (not isinstance(description, str) or len(description) > 500):
            raise ScenarioLabError("two-tuple Greece video fixture criterion descriptions must be strings of at most 500 characters")
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
        "usesExpertWeights": model.get("usesExpertWeights") is True,
    }
    parameters = {item.get("key"): item for item in model.get("parameters", []) if isinstance(item, dict)}
    for key, method in (("expertAggregation", "arithmetic_mean"), ("criteriaAggregation", "weighted_average")):
        methods = (parameters.get(key, {}).get("restrictions") or {}).get("methods")
        checks[f"{key} metadata"] = isinstance(methods, list) and any(
            isinstance(item, dict) and item.get("key") == method for item in methods
        )
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


def _tree(data: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {
            "id": f"criterion-{parent['key']}",
            "name": parent["name"],
            "type": "group",
            "children": [_leaf_node(child) for child in parent["children"]],
        }
        for parent in data["parents"]
    ]


def _payload(data: dict[str, Any], *, name: str, model_id: str, domain_id: str, emails: list[str]) -> dict[str, Any]:
    return {
        "issueName": name,
        "issueDescription": data["issue"]["description"],
        "selectedModelId": model_id,
        "alternatives": [{"name": item["name"], "description": item["sourceSiteId"]} for item in data["alternatives"]],
        "criteria": _tree(data),
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
        "criteriaWeightingConfig": {
            "mode": "expertApiModel",
            "source": "experts",
            "method": "apiModel",
            "criteriaWeightingModelKey": WEIGHTING_KEY,
            "payload": {},
            "level": "parent",
        },
    }


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


def _active_issue(api: IssuesApi, issue_id: str) -> dict[str, Any]:
    issue = next((item for item in _items(api.active_issues(), "issues") if _id(item) == issue_id), None)
    if not issue:
        raise ScenarioLabError("generated issue is no longer visible as active")
    return issue


def _parent_ids(data: dict[str, Any], context: dict[str, Any]) -> dict[str, str]:
    criteria = context.get("criteriaWeightingCriteria")
    if not isinstance(criteria, list) or len(criteria) != 7:
        raise ScenarioLabError("criteria-weighting context must expose exactly seven parent criteria")
    expected_names = [parent["name"] for parent in data["parents"]]
    if [item.get("name") for item in criteria] != expected_names:
        raise ScenarioLabError("criteria-weighting parent criteria are not in fixture hierarchy order")
    resolved = {parent["key"]: _id(item) for parent, item in zip(data["parents"], criteria, strict=True)}
    if any(not value for value in resolved.values()) or len(set(resolved.values())) != 7:
        raise ScenarioLabError("criteria-weighting context is missing unique persisted parent ids")
    return resolved


def _validate_parent_weights(weights: Any, parent_ids: dict[str, str]) -> dict[str, float]:
    if not isinstance(weights, dict) or set(weights) != set(parent_ids.values()):
        raise ScenarioLabError("criteria weighting did not finalize exactly seven persisted parent weights")
    values = {key: float(value) for key, value in weights.items()}
    if any(not _finite(value) or value < 0 for value in values.values()) or abs(sum(values.values()) - 1) > 1e-6:
        raise ScenarioLabError("parent criteria weights are not finite non-negative values summing to one")
    return values


def _expected_leaf_weights(data: dict[str, Any], parent_ids: dict[str, str], parent_weights: dict[str, float]) -> dict[str, float]:
    expected: dict[str, float] = {}
    for parent in data["parents"]:
        parent_weight = parent_weights[parent_ids[parent["key"]]]
        share = parent_weight / len(parent["children"])
        for child in parent["children"]:
            expected[child["key"]] = share
    if abs(sum(expected.values()) - 1) > 1e-6 or any(not _finite(value) or value < 0 for value in expected.values()):
        raise ScenarioLabError("expected propagated leaf weights are invalid")
    return expected


def _leaf_context_maps(data: dict[str, Any], context: dict[str, Any], expected_weights: dict[str, float]) -> tuple[dict[str, str], dict[str, str]]:
    leaves = context.get("leafCriteria")
    if not isinstance(leaves, list) or len(leaves) != 18:
        raise ScenarioLabError("alternative-evaluation context must expose exactly 18 leaf criteria")
    expected_names = [leaf["name"] for leaf in _fixture_leaves(data)]
    if [item.get("name") for item in leaves] != expected_names:
        raise ScenarioLabError("alternative-evaluation leaf criteria are not in fixture order")
    criterion_ids = {leaf["key"]: _id(item) for leaf, item in zip(_fixture_leaves(data), leaves, strict=True)}
    if any(not value for value in criterion_ids.values()) or len(set(criterion_ids.values())) != 18:
        raise ScenarioLabError("alternative-evaluation context is missing unique persisted leaf ids")
    alternatives = {item.get("name"): _id(item) for item in _items(context, "alternatives")}
    if set(alternatives) != {item["name"] for item in data["alternatives"]} or any(not value for value in alternatives.values()):
        raise ScenarioLabError("alternative-evaluation context is missing persisted alternatives")
    model_parameters = context.get("modelParameters")
    weights = model_parameters.get("weights") if isinstance(model_parameters, dict) else None
    if not isinstance(weights, dict) or set(weights) != set(criterion_ids.values()):
        raise ScenarioLabError("alternative-evaluation context must expose operational weights for all leaves")
    if any(not _finite(value) or value < 0 for value in weights.values()) or abs(sum(weights.values()) - 1) > 1e-6:
        raise ScenarioLabError("operational leaf weights are invalid")
    if any(abs(float(weights[criterion_ids[key]]) - value) > 1e-9 for key, value in expected_weights.items()):
        raise ScenarioLabError("native leaf weights do not match equal parent-to-child propagation")
    for parent in data["parents"]:
        total = sum(float(weights[criterion_ids[child["key"]]]) for child in parent["children"])
        expected_parent = expected_weights[parent["children"][0]["key"]] * len(parent["children"])
        if abs(total - expected_parent) > 1e-9:
            raise ScenarioLabError(f"native leaf weights do not reconstruct parent {parent['key']}")
    return alternatives, criterion_ids


def _label_keys(context: dict[str, Any]) -> dict[str, str]:
    leaves = context.get("leafCriteria")
    resolved: dict[str, str] | None = None
    expected = tuple(label.casefold() for label in EXPECTED_LABELS)
    for criterion in leaves if isinstance(leaves, list) else []:
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
        if tuple(mapping) != expected or (resolved is not None and mapping != resolved):
            raise ScenarioLabError("final context does not use one homogeneous linguistic domain")
        resolved = mapping
    if resolved is None:
        raise ScenarioLabError("final context is missing linguistic expression domains")
    return resolved


def _matrix(data: dict[str, Any], context: dict[str, Any], *, expert_alias: str, alternatives: dict[str, str], criteria: dict[str, str]) -> dict[str, dict[str, dict[str, Any]]]:
    labels = _label_keys(context)
    ordered_labels = [label.casefold() for label in EXPECTED_LABELS]
    leaves = _fixture_leaves(data)
    matrix: dict[str, dict[str, dict[str, Any]]] = {}
    for alternative in data["alternatives"]:
        row: dict[str, dict[str, Any]] = {}
        for parent in data["parents"]:
            for child in parent["children"]:
                raw = data["sourceValuesByExpert"][expert_alias][alternative["key"]][leaves.index(child)]
                level = 6 - raw if child["key"] in {"c6_land_rent", "c6_installation_cost", "c6_maintenance_cost"} else raw
                if child["key"] == "c3_clustering_possible":
                    level = {"Yes": 5, "Unsure": 3, "No": 1}[raw]
                if not isinstance(level, (int, float)) or not 1 <= level <= 5:
                    raise ScenarioLabError("source matrix contains an invalid preference level")
                row[criteria[child["key"]]] = {"labelKey": labels[ordered_labels[int(level) - 1]], "alpha": 0}
        matrix[alternatives[alternative["name"]]] = row
    return matrix


def _validate_finished(response: Any, alternative_ids: dict[str, str], criterion_ids: dict[str, str]) -> None:
    result = response.get("result") if isinstance(response, dict) else None
    if not isinstance(response, dict) or response.get("currentStage") != "finished" or not isinstance(result, dict):
        raise ScenarioLabError("two-tuple Greece video computation did not finish")
    ranking = result.get("rankedAlternatives")
    if not isinstance(ranking, list) or len(ranking) != 5:
        raise ScenarioLabError("final result must rank exactly five alternatives")
    ranking_ids = [item.get("alternativeId") for item in ranking if isinstance(item, dict)]
    ranks = [item.get("rank") for item in ranking if isinstance(item, dict)]
    if (
        set(ranking_ids) != set(alternative_ids.values())
        or len(set(ranking_ids)) != 5
        or any(item.get("alternativeId") != alternative_ids.get(item.get("name")) for item in ranking if isinstance(item, dict))
        or any(not _finite(item.get("score")) for item in ranking if isinstance(item, dict))
        or set(ranks) != {1, 2, 3, 4, 5}
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


def _validate_finished_audit(
    detail: Any,
    data: dict[str, Any],
    sessions: SessionPool,
    parent_ids: dict[str, str],
    parent_weights: dict[str, float],
) -> None:
    configuration = detail.get("configuration") if isinstance(detail, dict) else None
    weighting_configuration = configuration.get("criteriaWeighting") if isinstance(configuration, dict) else None
    if not isinstance(weighting_configuration, dict) or weighting_configuration.get("level") != "parent":
        raise ScenarioLabError("finished issue configuration does not preserve parent criteria weighting")
    source_weights = weighting_configuration.get("sourceWeightsByCriterionId")
    expected_source_weights = {
        parent_ids[key]: parent_weights[parent_ids[key]] for key in parent_ids
    }
    if (
        not isinstance(source_weights, dict)
        or source_weights != expected_source_weights
        or any(not _finite(value) for value in source_weights.values())
    ):
        raise ScenarioLabError("finished issue does not preserve seven source parent weights")
    participants = _items(detail, "participants")
    expected_emails = {sessions.users[alias].email.casefold() for alias in data["participants"]["criteriaWeightingExperts"]}
    accepted_emails = {((item.get("expert") or {}).get("email") or "").casefold() for item in participants if item.get("invitationStatus") == "accepted"}
    if accepted_emails != expected_emails:
        raise ScenarioLabError("finished issue does not preserve five accepted experts")
    evaluations = detail.get("evaluations") if isinstance(detail, dict) else None
    individual = evaluations.get("individual") if isinstance(evaluations, dict) else None
    participation = evaluations.get("participation") if isinstance(evaluations, dict) else None
    if not isinstance(individual, list) or not isinstance(participation, dict):
        raise ScenarioLabError("finished issue evaluation audit is incomplete")
    expert_ids_by_email = {
        (entry.get("email") or "").casefold(): entry.get("expertId")
        for entry in _items(participation, "experts")
        if isinstance(entry.get("email"), str) and entry.get("expertId")
    }
    expected_ids = {expert_ids_by_email.get(email) for email in expected_emails}
    if None in expected_ids or len(expected_ids) != 5:
        raise ScenarioLabError("finished issue audit cannot resolve all weighting expert identities")
    criteria_evaluations = [item for item in individual if item.get("stage") == CRITERIA_STAGE and item.get("completed") is True]
    alternative_evaluations = [item for item in individual if item.get("stage") == ALTERNATIVE_STAGE and item.get("completed") is True]
    if {item.get("expertId") for item in criteria_evaluations} != expected_ids or len(criteria_evaluations) != 5:
        raise ScenarioLabError("finished issue does not preserve five completed criteria-weighting evaluations")
    if {item.get("expertId") for item in alternative_evaluations} != expected_ids or len(alternative_evaluations) != 5:
        raise ScenarioLabError("finished issue does not preserve five alternative evaluations")
    for alias in data["participants"]["criteriaWeightingExperts"]:
        expert_id = expert_ids_by_email.get(sessions.users[alias].email.casefold())
        evidence = [item for item in criteria_evaluations if item.get("expertId") == expert_id and isinstance(item.get("rawPayload"), dict)]
        if not evidence or not isinstance(evidence[0]["rawPayload"].get("criterionOrder"), list):
            raise ScenarioLabError(f"finished issue is missing criteria-weighting evidence for {alias}")
def generate(sessions: SessionPool, store: ManifestStore, *, owner_alias: str = "owner", fixture_path: Path = FIXTURE_PATH) -> Any:
    data = load_fixture(fixture_path)
    experts = data["participants"]["criteriaWeightingExperts"]
    aliases = [owner_alias, *experts]
    if (
        owner_alias != data["participants"].get("creator")
        or any(alias not in sessions.users for alias in aliases)
        or len({sessions.users[alias].email.casefold() for alias in aliases}) != len(aliases)
    ):
        raise ScenarioLabError("two-tuple-greece-video requires configured distinct aliases: owner, expert_a, expert_b, expert_c, expert_d, expert_e")
    generation_id, issue_id = secrets.token_hex(5), None
    #issue_name = f"[AUTO:{generation_id}] {data['issue']['name']}"
    issue_name = f"{data['issue']['name']}"
    try:
        for alias in aliases:
            sessions.login(alias)
        owner = IssuesApi(sessions.client_for(owner_alias))
        main = _model(owner.models(), MODEL_KEY, kind="issue")
        _validate_main_model(main)
        weighting = _model(owner.models(), WEIGHTING_KEY, kind="criteriaWeighting")
        if weighting.get("supportsExpertCriteriaWeighting") is not True:
            raise ScenarioLabError("preference_order_criteria_weights does not support expert criteria weighting")
        domain = _domain(owner.expression_domains())
        emails = [sessions.users[alias].email for alias in experts]
        owner.create_issue(_payload(data, name=issue_name, model_id=_id(main) or "", domain_id=_id(domain) or "", emails=emails))
        issue_id = _id(next((item for item in _items(owner.active_issues(), "issues") if item.get("name") == issue_name), {}))
        if not issue_id:
            raise ScenarioLabError("created issue could not be resolved from active issues")
        for alias in experts:
            IssuesApi(sessions.client_for(alias)).respond_to_invitation(issue_id, "accepted")
        parent_ids: dict[str, str] | None = None
        for alias in experts:
            api = IssuesApi(sessions.client_for(alias))
            context = _context(api.evaluation(issue_id, CRITERIA_STAGE), issue_id, CRITERIA_STAGE, WEIGHTING_KEY)
            if context.get("issue", {}).get("criteriaWeightingLevel") != "parent":
                raise ScenarioLabError("criteria-weighting context does not expose parent level")
            current_ids = _parent_ids(data, context)
            if parent_ids is None:
                parent_ids = current_ids
            elif current_ids != parent_ids:
                raise ScenarioLabError("criteria-weighting parent identities changed between experts")
            order = [parent_ids[key] for key in data["rankings"][alias]]
            api.submit_evaluation(issue_id, CRITERIA_STAGE, {"criterionOrder": order})
        if parent_ids is None:
            raise ScenarioLabError("criteria-weighting parent identities were not resolved")
        computed = owner.compute_evaluation(issue_id, CRITERIA_STAGE)
        parent_weights = _validate_parent_weights((computed.get("result") or {}).get("weightsByCriterion"), parent_ids)
        if computed.get("currentStage") != ALTERNATIVE_STAGE:
            raise ScenarioLabError("criteria weighting did not advance the issue to alternative evaluation")
        expected_leaf = _expected_leaf_weights(data, parent_ids, parent_weights)
        expert_alias = data["participants"]["finalExpert"]
        expert = IssuesApi(sessions.client_for(expert_alias))
        context = _context(expert.evaluation(issue_id, ALTERNATIVE_STAGE), issue_id, ALTERNATIVE_STAGE, MODEL_KEY)
        if context.get("issue", {}).get("criteriaWeightingLevel") != "parent":
            raise ScenarioLabError("alternative-evaluation context does not preserve parent weighting level")
        source_weights = context.get("issue", {}).get("criteriaWeightingSourceWeights")
        if isinstance(source_weights, dict) and source_weights != {parent_ids[key]: parent_weights[parent_ids[key]] for key in parent_ids}:
            raise ScenarioLabError("alternative-evaluation context source parent weights are inconsistent")
        alternatives, criterion_ids = _leaf_context_maps(data, context, expected_leaf)
        for alias in experts:
            expert_api = IssuesApi(sessions.client_for(alias))
            expert_context = _context(expert_api.evaluation(issue_id, ALTERNATIVE_STAGE), issue_id, ALTERNATIVE_STAGE, MODEL_KEY)
            expert_alternatives, expert_criteria = _leaf_context_maps(data, expert_context, expected_leaf)
            expert_api.submit_evaluation(issue_id, ALTERNATIVE_STAGE, _matrix(data, expert_context, expert_alias=alias, alternatives=expert_alternatives, criteria=expert_criteria))
        finished = owner.compute_evaluation(issue_id, ALTERNATIVE_STAGE)
        _validate_finished(finished, alternatives, criterion_ids)
        detail = owner.finished_issue(issue_id)
        _validate_finished_audit(detail, data, sessions, parent_ids, parent_weights)
        entry = GeneratedIssue(
            generationId=generation_id,
            scenarioId=SCENARIO_ID,
            issueId=issue_id,
            issueName=issue_name,
            ownerAlias=owner_alias,
            visibleUserAliases=aliases,
        )
        store.add(entry)
        return type(
            "GenerationResult",
            (),
            {
                "generation_id": generation_id,
                "issue_id": issue_id,
                "issue_name": issue_name,
                "owner_alias": owner_alias,
                "expert_aliases": (expert_alias,),
                "manifest_path": str(store.path),
            },
        )()
    except Exception as error:
        if issue_id:
            raise ScenarioLabError(f"{SCENARIO_ID} failed after issue creation (generationId={generation_id}, issueId={issue_id}): {error}") from error
        raise ScenarioLabError(f"{SCENARIO_ID} preflight failed: {error}") from error
