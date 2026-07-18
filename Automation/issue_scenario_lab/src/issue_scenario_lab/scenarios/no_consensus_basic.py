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
    if not all(checks.values()) or not _id(model):
        failed = ", ".join(key for key, valid in checks.items() if not valid) or "missing model id"
        raise ScenarioLabError(f"BORDA model is incompatible: {failed}")
    return model


def _compatible_domain(domains_data: Any, supported: set[str]) -> dict[str, Any]:
    domains = (
        [
            item
            for key in ("globalDomains", "expressionDomains", "domains")
            for item in _items(domains_data.get(key) if isinstance(domains_data, dict) else None)
        ]
        if isinstance(domains_data, dict)
        else _items(domains_data)
    )
    preferred = [("global", "numericDiscrete"), ("owner", "numericDiscrete"), ("global", "numericContinuous"), ("owner", "numericContinuous")]
    for visibility, type_key in preferred:
        for domain in domains:
            if domain.get("typeKey") != type_key or type_key not in supported or not _id(domain):
                continue
            if domain.get("scope", domain.get("visibility", "global")) not in {visibility, "global" if visibility == "global" else "owner"}:
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


def _matrix(context_payload: dict[str, Any], expert_b: bool = False) -> dict[str, Any]:
    context = context_payload.get("context") if isinstance(context_payload.get("context"), dict) else context_payload
    alternatives = _items(context, "alternatives")
    criteria = _items(context, "criteria", "leafCriteria")
    by_name = {item.get("name"): item for item in alternatives}
    quality, cost = _find_name(criteria, "Quality"), _find_name(criteria, "Cost")
    if set(by_name) < {"Balanced choice", "Premium choice", "Budget choice"} or not quality or not cost:
        raise ScenarioLabError("evaluation context is missing the expected persisted alternatives or criteria")
    quality_id, cost_id = _id(quality), _id(cost)
    if not quality_id or not cost_id:
        raise ScenarioLabError("evaluation context contains a missing persisted criterion id")
    low, medium, high = numeric_levels(quality.get("expressionDomain", {}))
    cost_low, cost_medium, cost_high = numeric_levels(cost.get("expressionDomain", {}))
    quality_values = {"Premium choice": high, "Balanced choice": medium, "Budget choice": low}
    cost_values = {"Budget choice": cost_low, "Balanced choice": cost_medium, "Premium choice": cost_high}
    if expert_b:
        quality_values = {"Balanced choice": high, "Premium choice": medium, "Budget choice": low}
        cost_values = {"Budget choice": cost_low, "Premium choice": cost_medium, "Balanced choice": cost_high}
    return {
        item_id: {quality_id: {"value": quality_values[name]}, cost_id: {"value": cost_values[name]}}
        for name, item in by_name.items()
        if (item_id := _id(item))
    }


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
            if not user or user.get("confirmed") is False or user.get("selectable") is False:
                raise ScenarioLabError(f"configured expert is not a confirmed selectable user: {email}")
        domain = _compatible_domain(owner_api.expression_domains(), set(model.get("supportedExpressionDomains") or []))
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
        matrices = []
        for index, alias in enumerate(aliases[1:]):
            context = IssuesApi(sessions.client_for(alias)).evaluation(issue_id, STAGE)
            if (
                context.get("stage") != STAGE
                or context.get("structureKey") != "alternativeCriteriaMatrix"
                or context.get("consensusPhase") != 0
                or context.get("completed") is not False
            ):
                raise ScenarioLabError("expert evaluation context is incompatible")
            matrix = _matrix(context.get("payload", {}), expert_b=index == 1)
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
        if computed.get("currentStage") != "finished" or not isinstance(ranked, list) or len(ranked) != 3 or computed.get("consensusLifecycle") not in (None,):
            raise ScenarioLabError("BORDA computation did not finish with three ranked alternatives")
        finished = _items(owner_api.finished_issues(), "issues")
        if not any(_id(item) == issue_id or item.get("name") == issue_name for item in finished):
            raise ScenarioLabError("computed issue is absent from finished issues")
        detail = owner_api.finished_issue(issue_id)
        if not isinstance(detail, dict) or not detail or detail.get("isConsensus") is True:
            raise ScenarioLabError("finished issue detail is invalid")
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
