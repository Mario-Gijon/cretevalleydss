from __future__ import annotations

import math
from typing import Any

from issue_scenario_lab.api.issues import IssuesApi
from issue_scenario_lab.api.session_pool import SessionPool
from issue_scenario_lab.errors import ManifestError, ScenarioLabError
from issue_scenario_lab.manifest.models import GeneratedIssue
from issue_scenario_lab.manifest.store import ManifestStore
from issue_scenario_lab.scenarios.no_consensus_basic import GenerationResult, _id, _items, _new_generation_id
from issue_scenario_lab.scenarios.no_consensus_criteria_weighting import _required_parameters, _validate_ranking

SCENARIO_ID = "consensus-first-round"
STAGE = "alternativeEvaluation"
MODEL_KEY = "herrera_viedma_crp"
THRESHOLD = 0.9
MAX_PHASES = 3
PARAMETERS = {"ag_lq": [0.3, 0.8], "ex_lq": [0.5, 1.0], "b": 1, "beta": 0.8}
CRITERIA_WEIGHTS = {"Overall preference": 1.0}
NAMES = {"Balanced choice", "Premium choice", "Budget choice"}


def _finite(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _parameter(model: dict[str, Any], key: str, structure: str) -> dict[str, Any]:
    entries = [item for item in model.get("parameters", []) if isinstance(item, dict) and item.get("key") == key]
    if (
        len(entries) != 1
        or entries[0].get("scope") != "global"
        or entries[0].get("parameterStructureKey") != structure
        or entries[0].get("required") is not True
    ):
        raise ScenarioLabError(f"Herrera-Viedma parameter {key} is incompatible")
    return entries[0]


def _validate_parameters(model: dict[str, Any]) -> None:
    for key in ("ag_lq", "ex_lq"):
        parameter = _parameter(model, key, "intervalGlobal")
        values, restrictions = PARAMETERS[key], parameter.get("restrictions")
        if (
            not isinstance(restrictions, dict)
            or not all(_finite(value) and 0 <= value <= 1 for value in values)
            or not values[0] < values[1]
            or restrictions.get("ordered") != "strictIncreasing"
        ):
            raise ScenarioLabError(f"Herrera-Viedma parameter {key} rejects the explicit interval")
    b = _parameter(model, "b", "selectGlobal")
    beta = _parameter(model, "beta", "numberGlobal")
    if 1 not in ((b.get("restrictions") or {}).get("allowed") or []) or not (0 <= PARAMETERS["beta"] <= 1) or _required_parameters(model, PARAMETERS):
        raise ScenarioLabError("Herrera-Viedma explicit parameters are incompatible")
    if not isinstance(beta.get("restrictions"), dict):
        raise ScenarioLabError("Herrera-Viedma beta restrictions are incompatible")


def _select_model(data: Any) -> dict[str, Any]:
    model = next((item for item in _items(data, "models") if item.get("apiModelKey") == MODEL_KEY), None)
    if model is None:
        raise ScenarioLabError("Herrera Viedma CRP (apiModelKey 'herrera_viedma_crp') is unavailable")
    checks = {
        "id": bool(_id(model)),
        "modelKind": model.get("modelKind") == "issue",
        "visible": model.get("visibleInIssueCreation") is not False,
        "stale": (model.get("manifestSync") or {}).get("isStale") is not True,
        "ready": model.get("implementationStatus") in (None, "ready"),
        "public": model.get("publicUsable") is not False,
        "consensus": model.get("supportsConsensus") is True,
        "simulation": model.get("supportsConsensusSimulation") is True,
        "criteriaWeights": model.get("usesCriteriaWeights") is True,
        "multiCriteria": model.get("isMultiCriteria") is False,
        "expertWeights": model.get("usesExpertWeights") is False,
        "criterionTypes": model.get("usesCriterionTypes") is False,
        "structure": model.get("evaluationStructureKey") == "alternativePairwiseByCriterion",
    }
    domains = model.get("supportedExpressionDomains")
    numeric = (
        next((item for item in domains if isinstance(item, dict) and item.get("typeKey") == "numericContinuous"), None) if isinstance(domains, list) else None
    )
    constraints = numeric.get("constraints") if isinstance(numeric, dict) else None
    checks["domain"] = isinstance(constraints, dict) and constraints.get("min") == 0 and constraints.get("max") == 1
    try:
        _validate_parameters(model)
    except ScenarioLabError:
        checks["parameters"] = False
    if not all(checks.values()):
        raise ScenarioLabError(f"Herrera Viedma CRP model is incompatible: {', '.join(key for key, value in checks.items() if not value)}")
    return model


def _domain(data: Any) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise ScenarioLabError("expression domain response must be an object")
    for collection_name in ("globals", "userDomains"):
        collection = data.get(collection_name)
        if not isinstance(collection, list):
            raise ScenarioLabError("expression domain globals and userDomains must be arrays")
        for domain in _items(collection):
            definition = domain.get("definition")
            if (
                _id(domain)
                and domain.get("typeKey") == "numericContinuous"
                and isinstance(definition, dict)
                and definition.get("min") == 0
                and definition.get("max") == 1
            ):
                return domain
    raise ScenarioLabError("no exact numericContinuous [0, 1] expression domain is available for Herrera Viedma CRP")


def _payload(name: str, model_id: str, emails: list[str], domain_id: str) -> dict[str, Any]:
    return {
        "issueName": name,
        "issueDescription": "Generated local phase-zero Herrera Viedma consensus comparison.",
        "selectedModelId": model_id,
        "alternatives": [
            {"name": "Balanced choice", "description": "A balanced option with broadly preferred performance."},
            {"name": "Premium choice", "description": "A strong option that is slightly less preferred overall."},
            {"name": "Budget choice", "description": "A lower-ranked option in the initial consensus round."},
        ],
        "criteria": [
            {
                "id": "criterion-root",
                "name": "Decision factors",
                "type": "group",
                "children": [
                    {"id": "criterion-overall", "name": "Overall preference", "type": "benefit", "children": []},
                ],
            }
        ],
        "addedExperts": emails,
        "expressionDomainConfig": {"mode": "global", "globalDomainId": domain_id},
        "closureDate": None,
        "isConsensus": True,
        "simulateConsensus": False,
        "consensusThreshold": THRESHOLD,
        "consensusMaxPhases": MAX_PHASES,
        "paramValues": PARAMETERS,
        "criteriaWeightingParameters": {},
        "criteriaWeightingConfig": {
            "mode": "creatorManual",
            "source": "creator",
            "method": "manual",
            "structureKey": "manualCriteriaWeights",
            "payload": {"weightsByCriterion": {"criterion-overall": 1.0}},
        },
    }


def _context(response: Any, issue_id: str) -> dict[str, Any]:
    if (
        not isinstance(response, dict)
        or response.get("stage") != STAGE
        or response.get("structureKey") != "alternativePairwiseByCriterion"
        or response.get("consensusPhase") != 0
        or response.get("completed") is not False
        or response.get("submittedAt") is not None
    ):
        raise ScenarioLabError("Herrera-Viedma pairwise evaluation response is incompatible")
    context, payload = response.get("decisionContext"), response.get("payload")
    if (
        not isinstance(context, dict)
        or not isinstance(payload, dict)
        or _id(context.get("issue") or {}) != issue_id
        or (context.get("issue") or {}).get("currentStage") != STAGE
        or (context.get("issue") or {}).get("isConsensus") is not True
    ):
        raise ScenarioLabError("Herrera-Viedma pairwise evaluation context is incompatible")
    model = context.get("model")
    if isinstance(model, dict) and model.get("apiModelKey") not in (None, MODEL_KEY):
        raise ScenarioLabError("Herrera-Viedma pairwise context model is incompatible")
    _validate_empty(payload, context)
    return context


def _validate_active(active: Any) -> None:
    if (
        not isinstance(active, dict)
        or active.get("currentStage") != STAGE
        or active.get("isConsensus") is not True
        or active.get("simulateConsensus") is not False
        or active.get("consensusCurrentPhase") != 0
        or active.get("consensusThreshold") != THRESHOLD
        or active.get("consensusMaxPhases") != MAX_PHASES
        or active.get("isIssueOwner") is not True
        or active.get("evaluationStructureKey") != "alternativePairwiseByCriterion"
        or active.get("criteriaWeightsStructureKey") != "manualCriteriaWeights"
    ):
        raise ScenarioLabError("created issue does not use the phase-zero Herrera-Viedma lifecycle")


def _ids(context: dict[str, Any]) -> tuple[dict[str, str], dict[str, str]]:
    alternatives = {item.get("name"): _id(item) for item in _items(context, "alternatives")}
    criteria = {item.get("name"): _id(item) for item in _items(context, "leafCriteria")}
    if set(alternatives) != NAMES or set(criteria) != set(CRITERIA_WEIGHTS) or any(not value for value in [*alternatives.values(), *criteria.values()]):
        raise ScenarioLabError("pairwise context does not use the expected persisted identities")
    for criterion in _items(context, "leafCriteria"):
        definition = (criterion.get("expressionDomain") or {}).get("definition")
        if (
            (criterion.get("expressionDomain") or {}).get("typeKey") != "numericContinuous"
            or not isinstance(definition, dict)
            or definition.get("min") != 0
            or definition.get("max") != 1
        ):
            raise ScenarioLabError("pairwise context domain is not numericContinuous [0, 1]")
    return alternatives, criteria


def _persisted_identity(context: dict[str, Any]) -> tuple[tuple[str, str], ...]:
    alternatives, criteria = _ids(context)
    return tuple(sorted([*alternatives.items(), *criteria.items()]))


def _validate_empty(payload: Any, context: dict[str, Any]) -> None:
    alternatives, criteria = _ids(context)
    alternative_ids, criterion_ids = set(alternatives.values()), set(criteria.values())
    if set(payload) != criterion_ids:
        raise ScenarioLabError("pairwise payload does not contain exactly persisted criterion IDs")
    for matrix in payload.values():
        if not isinstance(matrix, dict) or set(matrix) != alternative_ids:
            raise ScenarioLabError("pairwise payload does not contain exactly persisted alternative rows")
        for row_id, row in matrix.items():
            if not isinstance(row, dict) or set(row) != alternative_ids - {row_id} or any(cell != {"value": ""} for cell in row.values()):
                raise ScenarioLabError("pairwise payload is not the canonical empty directed matrix")


def _pairwise(context: dict[str, Any], *, expert_b: bool) -> dict[str, Any]:
    alternatives, criteria = _ids(context)
    b, p, u = alternatives["Balanced choice"], alternatives["Premium choice"], alternatives["Budget choice"]
    values = (0.62, 0.78, 0.68) if expert_b else (0.60, 0.80, 0.70)
    output: dict[str, Any] = {}
    for criterion_id in criteria.values():
        bp, bu, pu = values
        output[criterion_id] = {
            b: {p: {"value": bp}, u: {"value": bu}},
            p: {b: {"value": 1 - bp}, u: {"value": pu}},
            u: {b: {"value": 1 - bu}, p: {"value": 1 - pu}},
        }
    _validate_pairwise(output, set(criteria.values()), {b, p, u})
    return output


def _validate_pairwise(payload: Any, criterion_ids: set[str], alternative_ids: set[str]) -> None:
    if not isinstance(payload, dict) or set(payload) != criterion_ids:
        raise ScenarioLabError("pairwise submission criterion identities are incompatible")
    for matrix in payload.values():
        if not isinstance(matrix, dict) or set(matrix) != alternative_ids:
            raise ScenarioLabError("pairwise submission alternative identities are incompatible")
        for row_id, row in matrix.items():
            if not isinstance(row, dict) or set(row) != alternative_ids - {row_id}:
                raise ScenarioLabError("pairwise submission has missing or diagonal cells")
            for col_id, cell in row.items():
                value = cell.get("value") if isinstance(cell, dict) and set(cell) == {"value"} else None
                reverse = matrix.get(col_id, {}).get(row_id, {}).get("value")
                if not _finite(value) or not 0 <= value <= 1 or not _finite(reverse) or abs(value + reverse - 1) > 1e-9:
                    raise ScenarioLabError("pairwise submission values are not finite reciprocal [0, 1] values")


def _collective(context: dict[str, Any]) -> dict[str, Any]:
    alternatives, criteria = _ids(context)
    b, p, u = alternatives["Balanced choice"], alternatives["Premium choice"], alternatives["Budget choice"]
    overall = criteria["Overall preference"]
    return {overall: {b: {p: 0.61, u: 0.79}, p: {b: 0.39, u: 0.69}, u: {b: 0.21, p: 0.31}}}


def _validate_collective(actual: Any, expected: dict[str, Any]) -> None:
    if not isinstance(actual, dict) or set(actual) != set(expected):
        raise ScenarioLabError("collective pairwise matrix does not use the aggregated first criterion")
    for criterion_id, rows in expected.items():
        if not isinstance(actual.get(criterion_id), dict) or set(actual[criterion_id]) != set(rows):
            raise ScenarioLabError("collective pairwise matrix rows are incompatible")
        for row_id, expected_row in rows.items():
            row = actual[criterion_id][row_id]
            if (
                not isinstance(row, dict)
                or set(row) != set(expected_row)
                or any(not _finite(row.get(col)) or abs(row[col] - value) > 1e-9 for col, value in expected_row.items())
            ):
                raise ScenarioLabError("collective pairwise matrix does not match the expected phase-zero consensus")


def _lifecycle(value: Any) -> None:
    if (
        not isinstance(value, dict)
        or value.get("consensusReached") is not True
        or value.get("maxPhasesReached") is not False
        or value.get("finalizationReason") != "consensusReached"
        or value.get("currentConsensusPhase") != 0
        or value.get("nextConsensusPhase") != 0
        or value.get("threshold") != THRESHOLD
        or value.get("maxPhases") != MAX_PHASES
        or not _finite(value.get("consensusMeasure"))
    ):
        raise ScenarioLabError("consensus lifecycle did not finalize in phase zero")


def _validate_compute(response: Any, expected: dict[str, Any], alternative_ids: set[str]) -> None:
    result = response.get("result") if isinstance(response, dict) else None
    if (
        not isinstance(response, dict)
        or response.get("stage") != STAGE
        or response.get("structureKey") != "alternativePairwiseByCriterion"
        or response.get("consensusPhase") != 0
        or response.get("currentStage") != "finished"
        or not isinstance(result, dict)
        or not _finite(result.get("consensusMeasure"))
        or result["consensusMeasure"] < THRESHOLD
    ):
        raise ScenarioLabError("Herrera-Viedma computation did not reach phase-zero consensus")
    _validate_ranking(result.get("rankedAlternatives"), alternative_ids)
    if [item.get("name") for item in result["rankedAlternatives"]] != ["Balanced choice", "Premium choice", "Budget choice"]:
        raise ScenarioLabError("Herrera-Viedma phase-zero ranking is not deterministic")
    _validate_collective(result.get("collectiveEvaluations"), expected)
    _lifecycle(result.get("consensusLifecycle"))
    raw = result.get("rawOutput")
    if (
        not isinstance(raw, dict)
        or not _finite(raw.get("cm"))
        or abs(raw["cm"] - result["consensusMeasure"]) > 1e-9
        or not isinstance(raw.get("collective_scores"), list)
        or len(raw["collective_scores"]) != 3
        or any(not _finite(value) for value in raw["collective_scores"])
        or raw.get("suggested_next_evaluations") != {}
        or not isinstance(raw.get("collective_evaluations"), dict)
    ):
        raise ScenarioLabError("Herrera-Viedma phase-zero output is incompatible")


def _validate_finished_weights(detail: dict[str, Any], effective_parameters: Any) -> None:
    criteria = detail.get("criteria")
    nodes = criteria.get("nodes") if isinstance(criteria, dict) else None
    if not isinstance(nodes, list) or len(nodes) != 2 or any(not isinstance(node, dict) for node in nodes):
        raise ScenarioLabError("finished issue criteria tree is incompatible")
    nodes_by_name = {node.get("name"): node for node in nodes}
    if len(nodes_by_name) != 2 or set(nodes_by_name) != {"Decision factors", *CRITERIA_WEIGHTS}:
        raise ScenarioLabError("finished issue criteria tree is incompatible")
    group = nodes_by_name["Decision factors"]
    leaves = {name: nodes_by_name[name] for name in CRITERIA_WEIGHTS}
    group_id, leaf_ids = _id(group), {name: _id(node) for name, node in leaves.items()}
    if (
        group.get("isLeaf") is not False
        or group.get("type") != "group"
        or not group_id
        or any(node.get("isLeaf") is not True or not leaf_ids[name] for name, node in leaves.items())
        or len({group_id, *leaf_ids.values()}) != 2
    ):
        raise ScenarioLabError("finished issue criteria tree is incompatible")
    final_weights = criteria.get("finalWeights") if isinstance(criteria, dict) else None
    source = final_weights.get("source") if isinstance(final_weights, dict) else None
    by_criterion_id = final_weights.get("byCriterionId") if isinstance(final_weights, dict) else None
    expected = {leaf_ids[name]: weight for name, weight in CRITERIA_WEIGHTS.items()}
    if (
        not isinstance(final_weights, dict)
        or not isinstance(source, dict)
        or source.get("kind") != "directModelParameters"
        or source.get("stageResultId") is not None
        or not isinstance(by_criterion_id, dict)
        or set(by_criterion_id) != set(expected)
        or any(by_criterion_id.get(key) != value for key, value in expected.items())
    ):
        raise ScenarioLabError("finished issue canonical criteria weights are incompatible")
    weights = effective_parameters.get("weights") if isinstance(effective_parameters, dict) else None
    if weights is not None and (
        not isinstance(weights, dict)
        or set(weights) != set(expected)
        or any(weights.get(key) != value for key, value in expected.items())
    ):
        raise ScenarioLabError("finished issue effective criteria weights are incompatible")


def _validate_finished(detail: Any, issue_id: str, issue_name: str, expected: dict[str, Any], emails: set[str]) -> None:
    issue, lifecycle, models, configuration, consensus = (
        (detail.get("issue"), detail.get("lifecycle"), detail.get("models"), detail.get("configuration"), detail.get("consensus"))
        if isinstance(detail, dict)
        else (None,) * 5
    )
    base = (models or {}).get("base") if isinstance(models, dict) else None
    capabilities = (base or {}).get("capabilities")
    effective_parameters = (base or {}).get("effectiveParameters")
    if (
        not isinstance(issue, dict)
        or _id(issue) != issue_id
        or issue.get("name") != issue_name
        or (lifecycle or {}).get("currentStage") != "finished"
        or (lifecycle or {}).get("active") is not False
        or ((base or {}).get("technical") or {}).get("apiModelKey") != MODEL_KEY
        or any(
            (capabilities or {}).get(key) is not value
            for key, value in (("supportsConsensus", True), ("supportsConsensusSimulation", True), ("usesCriteriaWeights", True), ("usesExpertWeights", False))
        )
        or (base or {}).get("evaluationStructureKey") != "alternativePairwiseByCriterion"
        or not isinstance(effective_parameters, dict)
        or any(effective_parameters.get(key) != value for key, value in PARAMETERS.items())
        or (models or {}).get("criteriaWeighting") is not None
    ):
        raise ScenarioLabError("finished issue model and lifecycle are incompatible")
    _validate_finished_weights(detail, effective_parameters)
    weighting = (configuration or {}).get("criteriaWeighting")
    if (
        not isinstance(weighting, dict)
        or weighting.get("source") != "directModelParameters"
        or weighting.get("structureKey") != "manualCriteriaWeights"
        or weighting.get("modelId") is not None
        or not isinstance(consensus, dict)
        or consensus.get("enabled") is not True
        or consensus.get("simulated") is not False
        or consensus.get("threshold") != THRESHOLD
        or consensus.get("maxPhases") != MAX_PHASES
        or consensus.get("finalPhase") != 0
        or consensus.get("reachedPhase") != 0
        or consensus.get("finalizationReason") != "consensusReached"
        or len(consensus.get("rounds", [])) != 1
        or consensus["rounds"][0].get("phase") != 0
    ):
        raise ScenarioLabError("finished issue consensus serializer is incompatible")
    participants = [item for item in _items(detail, "participants") if item.get("invitationStatus") == "accepted"]
    participant_emails = {str((item.get("expert") or {}).get("email", "")).casefold() for item in participants}
    history = detail.get("participantHistory")
    if (
        len(participants) != 2
        or participant_emails != emails
        or any(item.get("evaluationCompleted") is not True for item in participants)
        or not isinstance(history, dict)
        or history.get("summary") != {"total": 2, "participated": 2, "notParticipated": 0, "participatedPercentage": 100}
        or len(_items(history, "records")) != 2
        or any(
            item.get("participated") is not True or item.get("participationKey") != "participated" or item.get("weight") is not None
            for item in history["records"]
        )
    ):
        raise ScenarioLabError("finished issue participant history is incompatible")
    evaluations = detail.get("evaluations") if isinstance(detail, dict) else None
    individual = _items(evaluations, "individual")
    contexts = [item for item in _items(evaluations, "contexts") if item.get("stage") == STAGE and item.get("phase") == 0]
    collective = [item for item in _items(evaluations, "collective") if item.get("stage") == STAGE and item.get("phase") == 0]
    phases = [item for item in _items(detail, "phaseResults") if item.get("stage") == STAGE]
    if (
        len(individual) != 2
        or any(
            item.get("stage") != STAGE
            or item.get("phase") != 0
            or item.get("completed") is not True
            or item.get("structureKey") != "alternativePairwiseByCriterion"
            or not item.get("submittedAt")
            for item in individual
        )
        or len(contexts) != 1
        or len(collective) != 1
        or len(phases) != 1
        or phases[0].get("phase") != 0
        or collective[0].get("phaseResultId") != phases[0].get("id")
    ):
        raise ScenarioLabError("finished issue phase-zero evaluation evidence is incompatible")
    _validate_collective(collective[0].get("rawPayload"), expected)
    _validate_ranking(phases[0].get("rankedAlternatives"), {row_id for rows in expected.values() for row_id in rows})
    _lifecycle((phases[0].get("modelSpecificOutput") or {}).get("consensusLifecycle"))


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
    issue_name = f"[AUTO:{generation_id}] Consensus · first round"
    try:
        for alias in aliases:
            sessions.login(alias)
        owner = IssuesApi(sessions.client_for(owner_alias))
        model = _select_model(owner.models())
        if not set(emails[1:]) <= {str(item.get("email", "")).casefold() for item in _items(owner.users(), "users")}:
            raise ScenarioLabError("configured expert is absent from the Backend user catalogue")
        domain = _domain(owner.expression_domains())
        owner.create_issue(_payload(issue_name, _id(model) or "", emails[1:], _id(domain) or ""))
        matches = [item for item in _items(owner.active_issues(), "issues") if item.get("name") == issue_name]
        if len(matches) != 1 or not _id(matches[0]):
            raise ScenarioLabError("created issue could not be resolved uniquely from owner active issues")
        issue_id, active = _id(matches[0]), matches[0]
        _validate_active(active)
        for alias in aliases[1:]:
            IssuesApi(sessions.client_for(alias)).respond_to_invitation(issue_id, "accepted")
        contexts, matrices, identity = [], [], None
        for index, alias in enumerate(aliases[1:]):
            context = _context(IssuesApi(sessions.client_for(alias)).evaluation(issue_id, STAGE), issue_id)
            current = _persisted_identity(context)
            if identity is not None and current != identity:
                raise ScenarioLabError("expert pairwise contexts do not use compatible persisted identities")
            identity = current
            contexts.append(context)
            matrix = _pairwise(context, expert_b=index == 1)
            matrices.append(matrix)
            submitted = IssuesApi(sessions.client_for(alias)).submit_evaluation(issue_id, STAGE, matrix)
            if (
                not isinstance(submitted, dict)
                or submitted.get("completed") is not True
                or submitted.get("stage") != STAGE
                or submitted.get("structureKey") != "alternativePairwiseByCriterion"
                or submitted.get("consensusPhase") != 0
                or submitted.get("currentStage") != STAGE
            ):
                raise ScenarioLabError("pairwise evaluation submission did not remain in phase zero")
        if matrices[0] == matrices[1] or identity is None:
            raise ScenarioLabError("expert pairwise matrices must differ")
        expected = _collective(contexts[0])
        alternative_ids = {_id(item) for item in _items(contexts[0], "alternatives")}
        _validate_compute(owner.compute_evaluation(issue_id, STAGE), expected, alternative_ids)
        finished = [item for item in _items(owner.finished_issues(), "issues") if _id(item) == issue_id or item.get("name") == issue_name]
        if len(finished) != 1:
            raise ScenarioLabError("computed issue could not be resolved uniquely from finished issues")
        _validate_finished(owner.finished_issue(issue_id), issue_id, issue_name, expected, set(emails[1:]))
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
