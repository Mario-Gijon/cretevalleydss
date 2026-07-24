from __future__ import annotations

import secrets
from collections.abc import Iterable
from dataclasses import dataclass
from typing import Any

from issue_scenario_lab.api.issues import IssuesApi
from issue_scenario_lab.api.session_pool import SessionPool
from issue_scenario_lab.errors import ManifestError, ScenarioLabError
from issue_scenario_lab.manifest.models import GeneratedIssue
from issue_scenario_lab.manifest.store import ManifestStore
from issue_scenario_lab.scenarios.numeric_values import numeric_levels

SCENARIO_ID = "no-consensus-basic"
STAGE = "alternativeEvaluation"


@dataclass(frozen=True)
class GenerationResult:
    generation_id: str
    issue_id: str
    issue_name: str
    owner_alias: str
    expert_aliases: tuple[str, str]
    manifest_path: str


def _items(value: Any, *keys: str) -> list[dict[str, Any]]:
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    if isinstance(value, dict):
        for key in keys:
            if isinstance(value.get(key), list):
                return _items(value[key])
    return []


def _id(value: dict[str, Any]) -> str | None:
    candidate = value.get("id") or value.get("_id")
    return candidate if isinstance(candidate, str) and candidate else None


def _find_name(items: Iterable[dict[str, Any]], name: str) -> dict[str, Any] | None:
    return next((item for item in items if item.get("name") == name), None)


def _compatible_model(models_data: Any) -> dict[str, Any]:
    model = next(
        (item for item in _items(models_data, "models", "compatibleModels", "compatible") if item.get("apiModelKey") == "borda"),
        None,
    )
    if model is None:
        raise ScenarioLabError("BORDA (apiModelKey 'borda') is unavailable")
    checks = {
        "modelKind": (model.get("modelKind") in (None, "issue")),
        "visibleInIssueCreation": (model.get("visibleInIssueCreation") is not False),
        "manifestSync.isStale": (model.get("manifestSync") or {}).get("isStale") is not True,
        "supportsConsensus": model.get("supportsConsensus") is False,
        "supportsConsensusSimulation": model.get("supportsConsensusSimulation") is False,
        "usesCriteriaWeights": model.get("usesCriteriaWeights") is False,
        "usesExpertWeights": model.get("usesExpertWeights") is False,
        "evaluationStructureKey": model.get("evaluationStructureKey") == "alternativeCriteriaMatrix",
    }
    if not ({"numericDiscrete", "numericContinuous"} & supported_domain_type_keys(model)):
        checks["supportedExpressionDomains"] = False
    if not all(checks.values()) or not _id(model):
        failed = ", ".join(key for key, valid in checks.items() if not valid) or "missing model id"
        raise ScenarioLabError(f"BORDA model is incompatible: {failed}")
    return model


def supported_domain_type_keys(model: dict[str, Any]) -> set[str]:
    entries = model.get("supportedExpressionDomains")
    if not isinstance(entries, list):
        raise ScenarioLabError("BORDA metadata supportedExpressionDomains must be an array")
    if any(not isinstance(entry, dict) or not isinstance(entry.get("typeKey"), str) or not entry["typeKey"].strip() for entry in entries):
        raise ScenarioLabError("BORDA metadata contains malformed supportedExpressionDomains entries")
    return {entry["typeKey"].strip() for entry in entries}


def _compatible_domain(domains_data: Any, supported: set[str]) -> dict[str, Any]:
    if not isinstance(domains_data, dict):
        raise ScenarioLabError("expression domain response must be an object")
    globals_, user_domains = domains_data.get("globals", []), domains_data.get("userDomains", [])
    if not isinstance(globals_, list) or not isinstance(user_domains, list):
        raise ScenarioLabError("expression domain globals and userDomains must be arrays")
    preferred = [(globals_, "numericDiscrete"), (user_domains, "numericDiscrete"), (globals_, "numericContinuous"), (user_domains, "numericContinuous")]
    for collection, type_key in preferred:
        for domain in _items(collection):
            if domain.get("typeKey") != type_key or type_key not in supported or not _id(domain):
                continue
            try:
                numeric_levels(domain)
            except ScenarioLabError:
                continue
            return domain
    raise ScenarioLabError("no compatible numeric expression domain is available for BORDA")


def _issue_payload(issue_name: str, model_id: str, emails: list[str], domain_id: str) -> dict[str, Any]:
    return {
        "issueName": issue_name,
        "issueDescription": "Generated local non-consensus BORDA comparison.",
        "selectedModelId": model_id,
        "alternatives": [
            {"name": "Balanced choice", "description": "A balanced option with moderate cost and strong quality."},
            {"name": "Premium choice", "description": "The highest-quality option with the highest cost."},
            {"name": "Budget choice", "description": "The lowest-cost option with more limited quality."},
        ],
        "criteria": [
            {
                "id": "criterion-root",
                "name": "Decision factors",
                "type": "group",
                "children": [
                    {"id": "criterion-quality", "name": "Quality", "type": "benefit", "children": []},
                    {"id": "criterion-cost", "name": "Cost", "type": "cost", "children": []},
                ],
            }
        ],
        "addedExperts": emails,
        "expressionDomainConfig": {"mode": "global", "globalDomainId": domain_id},
        "closureDate": None,
        "isConsensus": False,
        "simulateConsensus": False,
        "paramValues": {},
        "criteriaWeightingParameters": {},
    }


_ALTERNATIVE_NAMES = {"Balanced choice", "Premium choice", "Budget choice"}
_CRITERION_TYPES = {"Quality": "benefit", "Cost": "cost"}


def _evaluation_items(evaluation_context: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    alternatives = _items(evaluation_context, "alternatives")
    criteria = _items(evaluation_context, "leafCriteria")
    alternatives_by_name = {item.get("name"): item for item in alternatives}
    criteria_by_name = {item.get("name"): item for item in criteria}
    if len(alternatives) != 3 or len(alternatives_by_name) != 3 or set(alternatives_by_name) != _ALTERNATIVE_NAMES:
        raise ScenarioLabError("decisionContext alternatives do not match the expected three choices")
    if len(criteria) != 2 or len(criteria_by_name) != 2 or set(criteria_by_name) != set(_CRITERION_TYPES):
        raise ScenarioLabError("decisionContext leafCriteria do not match Quality and Cost")
    if any(not _id(item) for item in alternatives) or len({_id(item) for item in alternatives}) != 3:
        raise ScenarioLabError("decisionContext contains a missing persisted alternative id")
    if any(not _id(item) for item in criteria) or len({_id(item) for item in criteria}) != 2:
        raise ScenarioLabError("decisionContext contains a missing persisted criterion id")
    for name, expected_type in _CRITERION_TYPES.items():
        criterion = criteria_by_name[name]
        if criterion.get("type") != expected_type:
            raise ScenarioLabError(f"decisionContext criterion {name} has an unexpected type")
        numeric_levels(criterion.get("expressionDomain", {}))
    return alternatives, criteria_by_name


def _matrix(decision_context: dict[str, Any], expert_b: bool = False) -> dict[str, Any]:
    alternatives, criteria_by_name = _evaluation_items(decision_context)
    quality, cost = criteria_by_name["Quality"], criteria_by_name["Cost"]
    quality_id, cost_id = _id(quality), _id(cost)
    assert quality_id and cost_id
    low, medium, high = numeric_levels(quality.get("expressionDomain", {}))
    cost_low, cost_medium, cost_high = numeric_levels(cost.get("expressionDomain", {}))
    quality_values = {"Premium choice": high, "Balanced choice": medium, "Budget choice": low}
    cost_values = {"Budget choice": cost_low, "Balanced choice": cost_medium, "Premium choice": cost_high}
    if expert_b:
        quality_values = {"Balanced choice": high, "Premium choice": medium, "Budget choice": low}
        cost_values = {"Budget choice": cost_low, "Premium choice": cost_medium, "Balanced choice": cost_high}
    matrix = {
        item_id: {quality_id: quality_values[name], cost_id: cost_values[name]}
        for name, item in ((item["name"], item) for item in alternatives)
        if (item_id := _id(item))
    }
    if len(matrix) != 3 or any(set(row) != {quality_id, cost_id} for row in matrix.values()):
        raise ScenarioLabError("evaluation matrix is not a complete persisted three-by-two matrix")
    return matrix


def _context_identity(decision_context: dict[str, Any]) -> tuple[tuple[str, str], ...]:
    """Capture the persisted IDs the two experts must evaluate against."""

    alternatives, criteria_by_name = _evaluation_items(decision_context)
    return tuple(sorted((str(item["name"]), _id(item) or "") for item in [*alternatives, *criteria_by_name.values()]))


def _validate_empty_matrix(payload: Any, decision_context: dict[str, Any]) -> None:
    alternatives, criteria_by_name = _evaluation_items(decision_context)
    alternative_ids = {_id(item) for item in alternatives}
    criterion_ids = {_id(item) for item in criteria_by_name.values()}
    if not isinstance(payload, dict) or set(payload) != alternative_ids:
        raise ScenarioLabError("evaluation payload is not an empty matrix for the persisted alternatives")
    for alternative_id in alternative_ids:
        row = payload[alternative_id]
        if not isinstance(row, dict) or set(row) != criterion_ids:
            raise ScenarioLabError("evaluation payload row is not an empty matrix for the persisted criteria")
        if any(value != "" for value in row.values()):
            raise ScenarioLabError("evaluation payload contains an unexpected stored value")


def _validate_evaluation_response(response: Any, issue_id: str, *, model_key: str = "borda") -> dict[str, Any]:
    if not isinstance(response, dict):
        raise ScenarioLabError("expert evaluation response must be an object")
    if (
        response.get("stage") != STAGE
        or response.get("structureKey") != "alternativeCriteriaMatrix"
        or response.get("consensusPhase") != 0
        or response.get("completed") is not False
    ):
        raise ScenarioLabError("expert evaluation context is incompatible")
    decision_context = response.get("decisionContext")
    if not isinstance(decision_context, dict):
        raise ScenarioLabError("expert evaluation response is missing decisionContext")
    structure, issue = decision_context.get("structure"), decision_context.get("issue")
    if not isinstance(structure, dict) or structure.get("key") != "alternativeCriteriaMatrix" or structure.get("stage") != STAGE:
        raise ScenarioLabError("decisionContext structure is incompatible")
    if (
        not isinstance(issue, dict)
        or _id(issue) != issue_id
        or issue.get("currentStage") != STAGE
        or issue.get("isConsensus") is not False
    ):
        raise ScenarioLabError("decisionContext issue is incompatible")
    model = decision_context.get("model")
    if model is not None and (not isinstance(model, dict) or ("apiModelKey" in model and model.get("apiModelKey") != model_key)):
        raise ScenarioLabError(f"decisionContext model is incompatible with {model_key}")
    _context_identity(decision_context)
    _validate_empty_matrix(response.get("payload"), decision_context)
    return decision_context


def _validate_finished_detail(detail: Any, issue_id: str) -> None:
    if not isinstance(detail, dict):
        raise ScenarioLabError("finished issue detail must be an object")
    issue = detail.get("issue")
    alternatives = _items(detail, "alternatives")
    criteria = _items(detail.get("criteria"), "nodes") if isinstance(detail.get("criteria"), dict) else []
    phase_results = _items(detail, "phaseResults")
    consensus = detail.get("consensus")
    model_key = ((detail.get("models") or {}).get("base") or {}).get("technical", {}).get("apiModelKey") if isinstance(detail.get("models"), dict) else None
    if not isinstance(issue, dict) or _id(issue) != issue_id or model_key != "borda":
        raise ScenarioLabError("finished issue detail does not identify the generated BORDA issue")
    if issue.get("isConsensus") is True or (
        isinstance(consensus, dict) and (consensus.get("enabled") is not False or consensus.get("rounds") not in (None, []))
    ):
        raise ScenarioLabError("finished issue detail incorrectly reports consensus rounds")
    if {item.get("name") for item in alternatives} != {"Balanced choice", "Premium choice", "Budget choice"}:
        raise ScenarioLabError("finished issue detail is missing the expected alternatives")
    if not {"Quality", "Cost"}.issubset({item.get("name") for item in criteria}):
        raise ScenarioLabError("finished issue detail is missing Quality or Cost")
    alternative_results = [item for item in phase_results if item.get("stage") == STAGE]
    if len(alternative_results) != 1 or len(_items(alternative_results[0], "rankedAlternatives")) != 3:
        raise ScenarioLabError("finished issue detail does not contain a three-alternative final ranking")


def _new_generation_id(store: ManifestStore) -> str:
    for _ in range(10):
        generation_id = secrets.token_hex(5)
        if store.find(generation_id) is None:
            return generation_id
    raise ScenarioLabError("could not allocate a unique local generation id")


def generate(
    sessions: SessionPool, store: ManifestStore, *, owner_alias: str = "owner", expert_a_alias: str = "expert_a", expert_b_alias: str = "expert_b"
) -> GenerationResult:
    aliases = (owner_alias, expert_a_alias, expert_b_alias)
    if len(set(aliases)) != 3 or any(alias not in sessions.users for alias in aliases):
        raise ScenarioLabError("no-consensus-basic requires distinct configured aliases: owner, expert_a, expert_b")
    emails = [sessions.users[alias].email for alias in aliases]
    if len({email.casefold() for email in emails}) != 3:
        raise ScenarioLabError("owner and expert emails must be distinct")
    generation_id, issue_id = _new_generation_id(store), None
    issue_name = f"[AUTO:{generation_id}] No consensus · basic"
    try:
        for alias in aliases:
            sessions.login(alias)
        owner_api = IssuesApi(sessions.client_for(owner_alias))
        model = _compatible_model(owner_api.models())
        catalog_users = _items(owner_api.users(), "users")
        for email in emails[1:]:
            user = next((item for item in catalog_users if str(item.get("email", "")).casefold() == email.casefold()), None)
            if not user:
                raise ScenarioLabError(f"configured expert is absent from the Backend user catalogue: {email}")
        domain = _compatible_domain(owner_api.expression_domains(), supported_domain_type_keys(model))
        owner_api.create_issue(_issue_payload(issue_name, _id(model) or "", emails[1:], _id(domain) or ""))
        active = _items(owner_api.active_issues(), "issues")
        matches = [item for item in active if item.get("name") == issue_name]
        if len(matches) != 1 or not _id(matches[0]):
            raise ScenarioLabError("created issue could not be resolved uniquely from owner active issues")
        issue = matches[0]
        issue_id = _id(issue)
        if (
            issue.get("currentStage") != STAGE
            or issue.get("isConsensus") is not False
            or issue.get("isIssueOwner") is not True
            or issue.get("evaluationStructureKey") != "alternativeCriteriaMatrix"
        ):
            raise ScenarioLabError("resolved active issue does not match the no-consensus BORDA contract")
        for alias in aliases[1:]:
            IssuesApi(sessions.client_for(alias)).respond_to_invitation(issue_id, "accepted")
        accepted_issue = next((item for item in _items(owner_api.active_issues(), "issues") if _id(item) == issue_id), None)
        if accepted_issue and accepted_issue.get("currentStage") not in (None, STAGE):
            raise ScenarioLabError("issue left alternativeEvaluation before expert submissions")
        progress = accepted_issue.get("progress") if isinstance(accepted_issue, dict) else None
        if isinstance(progress, dict) and progress.get("totalAccepted") not in (None, 2):
            raise ScenarioLabError("accepted participant count is not two after invitations")
        matrices, context_identity = [], None
        for index, alias in enumerate(aliases[1:]):
            context = IssuesApi(sessions.client_for(alias)).evaluation(issue_id, STAGE)
            evaluation_context = _validate_evaluation_response(context, issue_id)
            current_identity = _context_identity(evaluation_context)
            if context_identity is not None and current_identity != context_identity:
                raise ScenarioLabError("expert evaluation contexts do not use compatible persisted identities")
            context_identity = current_identity
            matrix = _matrix(evaluation_context, expert_b=index == 1)
            matrices.append(matrix)
            response = IssuesApi(sessions.client_for(alias)).submit_evaluation(issue_id, STAGE, matrix)
            if response.get("completed") is not True or response.get("currentStage") != STAGE:
                raise ScenarioLabError("expert evaluation submission did not complete correctly")
        if matrices[0] == matrices[1]:
            raise ScenarioLabError("expert matrices must differ")
        progress_issue = next((item for item in _items(owner_api.active_issues(), "issues") if _id(item) == issue_id), None)
        progress = progress_issue.get("progress") if isinstance(progress_issue, dict) else None
        if isinstance(progress, dict) and progress.get("evalsDone") not in (None, 2):
            raise ScenarioLabError("completed alternative evaluation count is not two before compute")
        computed = owner_api.compute_evaluation(issue_id, STAGE)
        result = computed.get("result") if isinstance(computed, dict) else None
        ranked = result.get("rankedAlternatives") if isinstance(result, dict) else None
        if (
            computed.get("stage") != STAGE
            or computed.get("currentStage") != "finished"
            or not isinstance(result, dict)
            or not isinstance(ranked, list)
            or len(ranked) != 3
            or result.get("consensusLifecycle") is not None
            or result.get("consensusMeasure") is not None
        ):
            raise ScenarioLabError("BORDA computation did not finish with three ranked alternatives")
        finished = _items(owner_api.finished_issues(), "issues")
        finished_matches = [item for item in finished if _id(item) == issue_id or item.get("name") == issue_name]
        if len(finished_matches) != 1:
            raise ScenarioLabError("computed issue could not be resolved uniquely from finished issues")
        detail = owner_api.finished_issue(issue_id)
        _validate_finished_detail(detail, issue_id)
        entry = GeneratedIssue(
            generationId=generation_id, scenarioId=SCENARIO_ID, issueId=issue_id, issueName=issue_name, ownerAlias=owner_alias, visibleUserAliases=list(aliases)
        )
        try:
            store.add(entry)
        except ManifestError as error:
            raise ScenarioLabError(f"issue finished but manifest persistence failed; issueId={issue_id}, issueName={issue_name}: {error}") from error
        return GenerationResult(generation_id, issue_id, issue_name, owner_alias, (expert_a_alias, expert_b_alias), str(store.path))
    except Exception as error:
        if issue_id:
            raise ScenarioLabError(
                f"{SCENARIO_ID} failed after issue creation (generationId={generation_id}, issueName={issue_name}, issueId={issue_id}): {error}"
            ) from error
        if isinstance(error, ScenarioLabError):
            raise
        raise ScenarioLabError(f"{SCENARIO_ID} preflight failed (generationId={generation_id}, issueName={issue_name}): {error}") from error
