from __future__ import annotations

import math
from typing import Any

from issue_scenario_lab.api.issues import IssuesApi
from issue_scenario_lab.api.session_pool import SessionPool
from issue_scenario_lab.errors import ManifestError, ScenarioLabError
from issue_scenario_lab.manifest.models import GeneratedIssue
from issue_scenario_lab.manifest.store import ManifestStore
from issue_scenario_lab.scenarios.no_consensus_basic import (
    GenerationResult,
    _context_identity,
    _id,
    _items,
    _new_generation_id,
    _validate_evaluation_response,
    supported_domain_type_keys,
)
from issue_scenario_lab.scenarios.no_consensus_criteria_weighting import _required_parameters, _validate_ranking
from issue_scenario_lab.scenarios.numeric_values import positive_numeric_levels

SCENARIO_ID = "no-consensus-expert-weights"
STAGE = "alternativeEvaluation"
MODEL_KEY = "waspas"
EXPERT_WEIGHTS = {"expert_a": 0.75, "expert_b": 0.25}
CRITERIA_WEIGHTS = {"Quality": 0.60, "Cost": 0.40}
LAMBDA = 0.5
_NAMES = {"Balanced choice", "Premium choice", "Budget choice"}


def _finite(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _lambda_parameter(model: dict[str, Any]) -> dict[str, Any]:
    parameters = model.get("parameters")
    matches = [item for item in parameters if isinstance(item, dict) and item.get("key") == "lambda"] if isinstance(parameters, list) else []
    if len(matches) != 1:
        raise ScenarioLabError("WASPAS metadata must contain exactly one lambda parameter")
    parameter = matches[0]
    restrictions = parameter.get("restrictions")
    if (
        parameter.get("scope") != "global"
        or parameter.get("parameterStructureKey") != "numberGlobal"
        or parameter.get("required") is not True
        or not isinstance(restrictions, dict)
    ):
        raise ScenarioLabError("WASPAS lambda parameter is incompatible")
    minimum, maximum = restrictions.get("min"), restrictions.get("max")
    allowed = restrictions.get("allowed")
    if (_finite(minimum) and LAMBDA < minimum) or (_finite(maximum) and LAMBDA > maximum) or (isinstance(allowed, list) and LAMBDA not in allowed):
        raise ScenarioLabError("WASPAS lambda restrictions exclude 0.5")
    return parameter


def _select_model(models_data: Any) -> dict[str, Any]:
    model = next((item for item in _items(models_data, "models") if item.get("apiModelKey") == MODEL_KEY), None)
    if model is None:
        raise ScenarioLabError("WASPAS (apiModelKey 'waspas') is unavailable")
    checks = {
        "id": bool(_id(model)),
        "modelKind": model.get("modelKind") == "issue",
        "visibleInIssueCreation": model.get("visibleInIssueCreation") is not False,
        "manifestSync.isStale": (model.get("manifestSync") or {}).get("isStale") is not True,
        "implementationStatus": model.get("implementationStatus") in (None, "ready"),
        "publicUsable": model.get("publicUsable") is not False,
        "supportsConsensus": model.get("supportsConsensus") is False,
        "supportsConsensusSimulation": model.get("supportsConsensusSimulation") in (None, False),
        "usesCriteriaWeights": model.get("usesCriteriaWeights") is True,
        "usesExpertWeights": model.get("usesExpertWeights") is True,
        "usesFuzzyCriteriaWeights": model.get("usesFuzzyCriteriaWeights") is False,
        "usesCriterionTypes": model.get("usesCriterionTypes") is True,
        "isMultiCriteria": model.get("isMultiCriteria") in (None, True),
        "evaluationStructureKey": model.get("evaluationStructureKey") == "alternativeCriteriaMatrix",
        "requiredParameters": not _required_parameters(model, {"lambda": LAMBDA}),
    }
    try:
        _lambda_parameter(model)
        checks["lambda"] = True
        checks["supportedExpressionDomains"] = bool({"numericDiscrete", "numericContinuous"} & supported_domain_type_keys(model))
    except ScenarioLabError:
        checks["lambda"] = False
    if not all(checks.values()):
        raise ScenarioLabError(f"WASPAS model is incompatible: {', '.join(key for key, valid in checks.items() if not valid)}")
    return model


def _positive_domain(domains_data: Any, supported: set[str]) -> dict[str, Any]:
    if not isinstance(domains_data, dict):
        raise ScenarioLabError("expression domain response must be an object")
    for collection_name, type_key in (
        ("globals", "numericDiscrete"),
        ("userDomains", "numericDiscrete"),
        ("globals", "numericContinuous"),
        ("userDomains", "numericContinuous"),
    ):
        collection = domains_data.get(collection_name)
        if not isinstance(collection, list):
            raise ScenarioLabError("expression domain globals and userDomains must be arrays")
        for domain in _items(collection):
            if domain.get("typeKey") == type_key and type_key in supported and _id(domain):
                try:
                    positive_numeric_levels(domain)
                    return domain
                except ScenarioLabError:
                    continue
    raise ScenarioLabError("no numeric expression domain can provide three distinct positive levels for WASPAS")


def _expert_selections(emails: list[str]) -> list[dict[str, Any]]:
    normalized = [email.strip().casefold() for email in emails]
    values = [EXPERT_WEIGHTS["expert_a"], EXPERT_WEIGHTS["expert_b"]]
    if (
        len(normalized) != 2
        or len(set(normalized)) != 2
        or any(not email for email in normalized)
        or any(not _finite(weight) or not 0 <= weight <= 1 for weight in values)
        or abs(sum(values) - 1) > 0.0015
        or values[0] <= values[1]
    ):
        raise ScenarioLabError("configured expert weights are incompatible")
    return [{"email": normalized[index], "weight": values[index]} for index in range(2)]


def _issue_payload(issue_name: str, model_id: str, expert_emails: list[str], domain_id: str) -> dict[str, Any]:
    return {
        "issueName": issue_name,
        "issueDescription": "Generated local non-consensus WASPAS comparison with unequal expert weights.",
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
        "addedExperts": _expert_selections(expert_emails),
        "expressionDomainConfig": {"mode": "global", "globalDomainId": domain_id},
        "closureDate": None,
        "isConsensus": False,
        "simulateConsensus": False,
        "paramValues": {"lambda": LAMBDA},
        "criteriaWeightingParameters": {},
        "criteriaWeightingConfig": {
            "mode": "creatorManual",
            "source": "creator",
            "method": "manual",
            "structureKey": "manualCriteriaWeights",
            "payload": {"weightsByCriterion": {"criterion-quality": 0.60, "criterion-cost": 0.40}},
        },
    }


def _matrix(context: dict[str, Any], *, expert_b: bool) -> dict[str, Any]:
    alternatives = {item.get("name"): item for item in _items(context, "alternatives")}
    criteria = {item.get("name"): item for item in _items(context, "leafCriteria")}
    if set(alternatives) != _NAMES or set(criteria) != set(CRITERIA_WEIGHTS):
        raise ScenarioLabError("WASPAS context identities are incompatible")
    quality_id, cost_id = _id(criteria["Quality"]), _id(criteria["Cost"])
    if not quality_id or not cost_id:
        raise ScenarioLabError("WASPAS context criterion identities are missing")
    q_low, q_medium, q_high = positive_numeric_levels(criteria["Quality"].get("expressionDomain", {}))
    c_low, c_medium, c_high = positive_numeric_levels(criteria["Cost"].get("expressionDomain", {}))
    quality = (
        {"Balanced choice": q_low, "Premium choice": q_high, "Budget choice": q_medium}
        if expert_b
        else {"Balanced choice": q_high, "Premium choice": q_medium, "Budget choice": q_low}
    )
    cost = (
        {"Balanced choice": c_high, "Premium choice": c_low, "Budget choice": c_medium}
        if expert_b
        else {"Balanced choice": c_low, "Premium choice": c_high, "Budget choice": c_medium}
    )
    matrix = {_id(item) or "": {quality_id: {"value": quality[name]}, cost_id: {"value": cost[name]}} for name, item in alternatives.items()}
    if "" in matrix or any(
        set(row) != {quality_id, cost_id} or any(set(cell) != {"value"} or not _finite(cell["value"]) or cell["value"] <= 0 for cell in row.values())
        for row in matrix.values()
    ):
        raise ScenarioLabError("WASPAS matrix is not a complete positive persisted matrix")
    return matrix


def _weighted(first: dict[str, Any], second: dict[str, Any]) -> dict[str, dict[str, float]]:
    return {
        alternative_id: {
            criterion_id: first[alternative_id][criterion_id]["value"] * 0.75 + second[alternative_id][criterion_id]["value"] * 0.25
            for criterion_id in first[alternative_id]
        }
        for alternative_id in first
    }


def _validate_collective(actual: Any, expected: dict[str, dict[str, float]]) -> None:
    if not isinstance(actual, dict) or set(actual) != set(expected):
        raise ScenarioLabError("WASPAS collective matrix does not use persisted alternative identities")
    for alternative_id, expected_row in expected.items():
        row = actual.get(alternative_id)
        if (
            not isinstance(row, dict)
            or set(row) != set(expected_row)
            or any(not _finite(row[key]) or abs(row[key] - value) > 1e-9 for key, value in expected_row.items())
        ):
            raise ScenarioLabError("WASPAS collective matrix does not match 0.75/0.25 expert weighting")


def _validate_active_experts(active: dict[str, Any], emails: list[str], *, completed: bool) -> None:
    participants = active.get("expertParticipants")
    if participants is None:
        return
    if not isinstance(participants, list):
        raise ScenarioLabError("active issue expertParticipants is incompatible")
    by_email = {str(item.get("email", "")).casefold(): item for item in participants if isinstance(item, dict)}
    expected = dict(zip(emails, EXPERT_WEIGHTS.values(), strict=True))
    if set(by_email) != set(expected) or any(
        not _finite(by_email[email].get("weight")) or abs(by_email[email]["weight"] - weight) > 1e-9 for email, weight in expected.items()
    ):
        raise ScenarioLabError("active issue expert participant weights are incompatible")
    if completed and isinstance(active.get("progress"), dict) and active["progress"].get("evalsDone") not in (None, 2):
        raise ScenarioLabError("active issue does not report two completed alternative evaluations")


def _validate_compute(response: Any, expected: dict[str, dict[str, float]], alternative_ids: set[str]) -> None:
    result = response.get("result") if isinstance(response, dict) else None
    if (
        not isinstance(response, dict)
        or response.get("stage") != STAGE
        or response.get("structureKey") != "alternativeCriteriaMatrix"
        or response.get("consensusPhase") != 0
        or response.get("currentStage") != "finished"
        or not isinstance(result, dict)
        or result.get("consensusMeasure") is not None
        or result.get("consensusLifecycle") is not None
    ):
        raise ScenarioLabError("WASPAS computation did not finish with the expected lifecycle")
    _validate_ranking(result.get("rankedAlternatives"), alternative_ids)
    _validate_collective(result.get("collectiveEvaluations"), expected)
    snapshot = result.get("expertWeights")
    if (
        not isinstance(snapshot, list)
        or len(snapshot) != 2
        or any(not isinstance(item, dict) or not _finite(item.get("weight")) for item in snapshot)
        or sorted(item["weight"] for item in snapshot) != [0.25, 0.75]
    ):
        raise ScenarioLabError("WASPAS computation expert weight snapshot is incompatible")
    raw = result.get("rawOutput")
    required = {
        "collective_matrix",
        "matrix_used",
        "collective_scores",
        "collective_ranking",
        "wsm_scores",
        "wpm_scores",
        "waspas_scores",
        "lambda",
        "weights_used",
        "expert_weights_used",
    }
    if (
        not isinstance(raw, dict)
        or not required <= set(raw)
        or raw.get("lambda") != LAMBDA
        or sorted(raw.get("weights_used", [])) != [0.4, 0.6]
        or sorted(raw.get("expert_weights_used", [])) != [0.25, 0.75]
        or any(
            not isinstance(raw.get(key), list) or len(raw[key]) != 3 or any(not _finite(value) for value in raw[key])
            for key in ("collective_scores", "wsm_scores", "wpm_scores", "waspas_scores")
        )
    ):
        raise ScenarioLabError("WASPAS raw output is incompatible")


def _validate_finished(detail: Any, issue_id: str, issue_name: str, expected: dict[str, dict[str, float]], expert_weights_by_email: dict[str, float]) -> None:
    if (
        not isinstance(detail, dict)
        or _id(detail.get("issue") or {}) != issue_id
        or (detail.get("issue") or {}).get("name") != issue_name
        or (detail.get("lifecycle") or {}).get("currentStage") != "finished"
        or (detail.get("lifecycle") or {}).get("active") is not False
    ):
        raise ScenarioLabError("finished WASPAS issue lifecycle is incompatible")
    models, configuration, consensus, criteria = detail.get("models"), detail.get("configuration"), detail.get("consensus"), detail.get("criteria")
    base = (models or {}).get("base") if isinstance(models, dict) else None
    technical, capabilities = (base or {}).get("technical"), (base or {}).get("capabilities")
    if (
        not isinstance(base, dict)
        or (technical or {}).get("apiModelKey") != MODEL_KEY
        or any((capabilities or {}).get(key) is not True for key in ("usesExpertWeights", "usesCriteriaWeights", "usesCriterionTypes"))
        or base.get("evaluationStructureKey") != "alternativeCriteriaMatrix"
        or (models or {}).get("criteriaWeighting") is not None
        or (base.get("effectiveParameters") or {}).get("lambda") != LAMBDA
    ):
        raise ScenarioLabError("finished issue does not identify the WASPAS expert-weight contract")
    weighting = (configuration or {}).get("criteriaWeighting")
    if (
        not isinstance(weighting, dict)
        or weighting.get("required") is not True
        or weighting.get("source") != "directModelParameters"
        or weighting.get("structureKey") != "manualCriteriaWeights"
        or weighting.get("modelId") is not None
        or not isinstance(consensus, dict)
        or consensus.get("enabled") is not False
        or consensus.get("rounds") not in (None, [])
    ):
        raise ScenarioLabError("finished issue configuration is incompatible")
    participants = [item for item in _items(detail, "participants") if item.get("invitationStatus") == "accepted"]
    by_email = {((item.get("expert") or {}).get("email") or "").casefold(): item for item in participants}
    if (
        len(participants) != 2
        or set(by_email) != set(expert_weights_by_email)
        or any(item.get("evaluationCompleted") is not True or item.get("weightsCompleted") is not True for item in participants)
        or abs(sum(item.get("currentWeight", -1) for item in participants) - 1) > 0.0015
        or any(
            not _finite(item.get("currentWeight")) or abs(item["currentWeight"] - weight) > 1e-9
            for email, weight in expert_weights_by_email.items()
            for item in [by_email[email]]
        )
    ):
        raise ScenarioLabError("finished issue expert participants are incompatible")
    final = (criteria or {}).get("finalWeights") if isinstance(criteria, dict) else None
    weights = (final or {}).get("byCriterionId") if isinstance(final, dict) else None
    nodes = _items(criteria, "nodes")
    leaves = {item.get("name"): item for item in nodes if item.get("name") in CRITERIA_WEIGHTS}
    if (
        set(leaves) != set(CRITERIA_WEIGHTS)
        or leaves["Quality"].get("type") != "benefit"
        or leaves["Cost"].get("type") != "cost"
        or not isinstance(weights, dict)
        or set(weights) != {_id(leaves["Quality"]), _id(leaves["Cost"])}
        or any(abs(weights[_id(leaves[name]) or ""] - value) > 1e-9 for name, value in CRITERIA_WEIGHTS.items())
        or (final.get("source") or {}).get("kind") != "directModelParameters"
    ):
        raise ScenarioLabError("finished issue direct criteria weights are incompatible")
    phase_results = [item for item in _items(detail, "phaseResults") if item.get("stage") == STAGE and item.get("phase") == 0]
    collective = [item for item in _items(detail.get("evaluations"), "collective") if item.get("stage") == STAGE and item.get("phase") == 0]
    if len(phase_results) != 1 or len(collective) != 1 or collective[0].get("phaseResultId") != phase_results[0].get("id"):
        raise ScenarioLabError("finished issue WASPAS phase results are incompatible")
    _validate_collective(collective[0].get("rawPayload"), expected)
    individual = _items(detail.get("evaluations"), "individual")
    contexts = [item for item in _items(detail.get("evaluations"), "contexts") if item.get("stage") == STAGE and item.get("phase") == 0]
    if (
        len(individual) != 2
        or any(
            item.get("stage") != STAGE
            or item.get("phase") != 0
            or item.get("completed") is not True
            or item.get("structureKey") != "alternativeCriteriaMatrix"
            or not item.get("submittedAt")
            for item in individual
        )
        or len({_id(item) for item in individual}) != 2
        or len(contexts) != 1
    ):
        raise ScenarioLabError("finished issue WASPAS evaluations are incompatible")
    serialized = contexts[0].get("decisionContext")
    active_model = serialized.get("model") if isinstance(serialized, dict) else None
    context_alternative_ids = {_id(item) for item in _items(serialized, "alternatives")} if isinstance(serialized, dict) else set()
    context_criterion_ids = {_id(item) for item in _items(serialized, "leafCriteria")} if isinstance(serialized, dict) else set()
    if (
        not isinstance(serialized, dict)
        or _id(serialized.get("issue") or {}) != issue_id
        or (serialized.get("structure") or {}).get("key") != "alternativeCriteriaMatrix"
        or (active_model or {}).get("apiModelKey") != MODEL_KEY
        or context_alternative_ids != set(expected)
        or context_criterion_ids != set(weights)
    ):
        raise ScenarioLabError("finished issue WASPAS context is incompatible")
    _validate_ranking(phase_results[0].get("rankedAlternatives"), set(expected))
    snapshot = phase_results[0].get("expertWeightSnapshot")
    participants_by_id = {_id(item.get("expert") or {}): item for item in participants}
    if (
        not isinstance(snapshot, list)
        or len(snapshot) != 2
        or {item.get("expertId") for item in snapshot if isinstance(item, dict)} != set(participants_by_id)
        or any(
            not _finite(item.get("weight")) or abs(item["weight"] - participants_by_id[item["expertId"]].get("currentWeight", -1)) > 1e-9
            for item in snapshot
            if isinstance(item, dict)
        )
    ):
        raise ScenarioLabError("finished issue WASPAS expert weight snapshot is incompatible")
    raw = phase_results[0].get("rawOutput")
    if (
        not isinstance(raw, dict)
        or raw.get("lambda") != LAMBDA
        or sorted(raw.get("weights_used", [])) != [0.4, 0.6]
        or sorted(raw.get("expert_weights_used", [])) != [0.25, 0.75]
    ):
        raise ScenarioLabError("finished issue WASPAS raw output is incompatible")


def generate(
    sessions: SessionPool, store: ManifestStore, *, owner_alias: str = "owner", expert_a_alias: str = "expert_a", expert_b_alias: str = "expert_b"
) -> GenerationResult:
    aliases = (owner_alias, expert_a_alias, expert_b_alias)
    if len(set(aliases)) != 3 or any(alias not in sessions.users for alias in aliases):
        raise ScenarioLabError(f"{SCENARIO_ID} requires distinct configured aliases: owner, expert_a, expert_b")
    emails = [sessions.users[alias].email.strip().casefold() for alias in aliases]
    if len(set(emails)) != 3:
        raise ScenarioLabError("owner and expert emails must be distinct")
    generation_id, issue_id = _new_generation_id(store), None
    issue_name = f"[AUTO:{generation_id}] No consensus · expert weights"
    try:
        for alias in aliases:
            sessions.login(alias)
        owner = IssuesApi(sessions.client_for(owner_alias))
        model = _select_model(owner.models())
        catalogue = {str(item.get("email", "")).casefold() for item in _items(owner.users(), "users")}
        if not set(emails[1:]) <= catalogue:
            raise ScenarioLabError("configured expert is absent from the Backend user catalogue")
        domain = _positive_domain(owner.expression_domains(), supported_domain_type_keys(model))
        owner.create_issue(_issue_payload(issue_name, _id(model) or "", emails[1:], _id(domain) or ""))
        matches = [item for item in _items(owner.active_issues(), "issues") if item.get("name") == issue_name]
        if len(matches) != 1 or not _id(matches[0]):
            raise ScenarioLabError("created issue could not be resolved uniquely from owner active issues")
        issue_id, active = _id(matches[0]), matches[0]
        if (
            active.get("currentStage") != STAGE
            or active.get("isConsensus") is not False
            or active.get("isIssueOwner") is not True
            or active.get("usesExpertWeights") is not True
            or active.get("evaluationStructureKey") != "alternativeCriteriaMatrix"
            or active.get("criteriaWeightsStructureKey") != "manualCriteriaWeights"
        ):
            raise ScenarioLabError("created issue does not use the WASPAS direct-weight lifecycle")
        if isinstance(active.get("model"), dict) and active["model"].get("apiModelKey") not in (None, MODEL_KEY):
            raise ScenarioLabError("active issue does not identify WASPAS")
        if isinstance(active.get("modelParameters"), dict) and active["modelParameters"].get("lambda") != LAMBDA:
            raise ScenarioLabError("active issue does not expose lambda 0.5")
        if isinstance(active.get("finalWeights"), dict) and any(
            abs(active["finalWeights"].get(name, -1) - weight) > 1e-9 for name, weight in CRITERIA_WEIGHTS.items()
        ):
            raise ScenarioLabError("active issue does not expose creator criteria weights")
        _validate_active_experts(active, emails[1:], completed=False)
        for alias in aliases[1:]:
            IssuesApi(sessions.client_for(alias)).respond_to_invitation(issue_id, "accepted")
        accepted = next((item for item in _items(owner.active_issues(), "issues") if _id(item) == issue_id), None)
        if not isinstance(accepted, dict) or accepted.get("currentStage") != STAGE:
            raise ScenarioLabError("issue left alternativeEvaluation after expert invitations")
        _validate_active_experts(accepted, emails[1:], completed=False)
        matrices, identity = [], None
        for index, alias in enumerate(aliases[1:]):
            response = IssuesApi(sessions.client_for(alias)).evaluation(issue_id, STAGE)
            if response.get("submittedAt") is not None:
                raise ScenarioLabError("new WASPAS evaluation unexpectedly has submittedAt")
            context = _validate_evaluation_response(response, issue_id, model_key=MODEL_KEY)
            current = _context_identity(context)
            if identity is not None and current != identity:
                raise ScenarioLabError("expert evaluation contexts do not use compatible persisted identities")
            identity = current
            matrix = _matrix(context, expert_b=index == 1)
            matrices.append(matrix)
            submitted = IssuesApi(sessions.client_for(alias)).submit_evaluation(issue_id, STAGE, matrix)
            if (
                not isinstance(submitted, dict)
                or submitted.get("completed") is not True
                or submitted.get("stage") not in (None, STAGE)
                or submitted.get("currentStage") != STAGE
            ):
                raise ScenarioLabError("expert alternative evaluation submission did not complete correctly")
        if matrices[0] == matrices[1] or identity is None:
            raise ScenarioLabError("expert matrices must differ")
        progress = next((item for item in _items(owner.active_issues(), "issues") if _id(item) == issue_id), None)
        if not isinstance(progress, dict) or progress.get("currentStage") != STAGE:
            raise ScenarioLabError("issue left alternativeEvaluation before WASPAS computation")
        _validate_active_experts(progress, emails[1:], completed=True)
        expected = _weighted(matrices[0], matrices[1])
        equal = {
            alternative_id: {
                criterion_id: (matrices[0][alternative_id][criterion_id]["value"] + matrices[1][alternative_id][criterion_id]["value"]) / 2
                for criterion_id in row
            }
            for alternative_id, row in expected.items()
        }
        if expected == equal:
            raise ScenarioLabError("expert-weighted matrix unexpectedly equals the equal-weight counterfactual")
        alternative_ids = {persisted_id for name, persisted_id in identity if name in _NAMES}
        _validate_compute(owner.compute_evaluation(issue_id, STAGE), expected, alternative_ids)
        finished = [item for item in _items(owner.finished_issues(), "issues") if _id(item) == issue_id or item.get("name") == issue_name]
        if len(finished) != 1:
            raise ScenarioLabError("computed issue could not be resolved uniquely from finished issues")
        _validate_finished(owner.finished_issue(issue_id), issue_id, issue_name, expected, dict(zip(emails[1:], EXPERT_WEIGHTS.values(), strict=True)))
        try:
            store.add(
                GeneratedIssue(
                    generationId=generation_id,
                    scenarioId=SCENARIO_ID,
                    issueId=issue_id,
                    issueName=issue_name,
                    ownerAlias=owner_alias,
                    visibleUserAliases=list(aliases),
                )
            )
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
