from __future__ import annotations

from typing import Any

from issue_scenario_lab.api.issues import IssuesApi
from issue_scenario_lab.api.session_pool import SessionPool
from issue_scenario_lab.errors import ManifestError, ScenarioLabError
from issue_scenario_lab.manifest.models import GeneratedIssue
from issue_scenario_lab.manifest.store import ManifestStore
from issue_scenario_lab.scenarios.no_consensus_basic import (
    GenerationResult,
    _compatible_domain,
    _context_identity,
    _id,
    _items,
    _matrix,
    _new_generation_id,
    _validate_evaluation_response,
    supported_domain_type_keys,
)

SCENARIO_ID = "no-consensus-criteria-weighting"
CRITERIA_STAGE = "criteriaWeighting"
ALTERNATIVE_STAGE = "alternativeEvaluation"
MAIN_MODEL_KEY = "topsis"
WEIGHTING_MODEL_KEY = "manual_criteria_weights"


def _required_parameters(model: dict[str, Any]) -> bool:
    parameters = model.get("parameters", [])
    return isinstance(parameters, list) and any(
        isinstance(parameter, dict) and parameter.get("required") is True and "default" not in parameter for parameter in parameters
    )


def _select_main_model(models_data: Any) -> dict[str, Any]:
    models = _items(models_data, "models")
    model = next((item for item in models if item.get("apiModelKey") == MAIN_MODEL_KEY), None)
    if model is None:
        raise ScenarioLabError("TOPSIS (apiModelKey 'topsis') is unavailable")
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
        "usesCriterionTypes": model.get("usesCriterionTypes") is True,
        "usesExpertWeights": model.get("usesExpertWeights") is False,
        "evaluationStructureKey": model.get("evaluationStructureKey") == "alternativeCriteriaMatrix",
        "requiredParameters": not _required_parameters(model),
    }
    if not ({"numericDiscrete", "numericContinuous"} & supported_domain_type_keys(model)):
        checks["supportedExpressionDomains"] = False
    if not all(checks.values()):
        raise ScenarioLabError(f"TOPSIS model is incompatible: {', '.join(key for key, valid in checks.items() if not valid)}")
    return model


def _select_weighting_model(models_data: Any) -> dict[str, Any]:
    models = _items(models_data, "criteriaWeightingModels")
    model = next((item for item in models if item.get("apiModelKey") == WEIGHTING_MODEL_KEY), None)
    if model is None:
        raise ScenarioLabError("Manual Criteria Weights is unavailable")
    checks = {
        "id": bool(_id(model)),
        "modelKind": model.get("modelKind") == "criteriaWeighting",
        "visibleInCriteriaWeighting": model.get("visibleInCriteriaWeighting") is not False,
        "manifestSync.isStale": (model.get("manifestSync") or {}).get("isStale") is not True,
        "implementationStatus": model.get("implementationStatus") in (None, "ready"),
        "publicUsable": model.get("publicUsable") is not False,
        "supportsExpertCriteriaWeighting": model.get("supportsExpertCriteriaWeighting") is True,
        "evaluationStructureKey": model.get("evaluationStructureKey") == "manualCriteriaWeights",
        "supportsConsensus": model.get("supportsConsensus") is False,
        "requiredParameters": not _required_parameters(model),
    }
    if not all(checks.values()):
        raise ScenarioLabError(f"Manual Criteria Weights model is incompatible: {', '.join(key for key, valid in checks.items() if not valid)}")
    return model


def _issue_payload(issue_name: str, model_id: str, emails: list[str], domain_id: str) -> dict[str, Any]:
    return {
        "issueName": issue_name,
        "issueDescription": "Generated local non-consensus TOPSIS comparison with expert criteria weighting.",
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
        "criteriaWeightingConfig": {"mode": "expertManual", "source": "experts", "method": "manual", "structureKey": "manualCriteriaWeights", "payload": {}},
    }


def _weight_context(response: Any, issue_id: str) -> tuple[dict[str, Any], tuple[tuple[str, str], ...]]:
    if (
        not isinstance(response, dict)
        or response.get("stage") != CRITERIA_STAGE
        or response.get("structureKey") != "manualCriteriaWeights"
        or response.get("consensusPhase") != 0
        or response.get("completed") is not False
    ):
        raise ScenarioLabError("criteria-weighting evaluation response is incompatible")
    context, payload = response.get("evaluationContext"), response.get("payload")
    if not isinstance(context, dict) or not isinstance(payload, dict):
        raise ScenarioLabError("criteria-weighting response is missing evaluationContext or payload")
    issue, structure = context.get("issue"), context.get("structure")
    if not isinstance(issue, dict) or _id(issue) != issue_id or issue.get("currentStage") != CRITERIA_STAGE or issue.get("isConsensus") is not False:
        raise ScenarioLabError("criteria-weighting evaluationContext issue is incompatible")
    if not isinstance(structure, dict) or structure.get("key") != "manualCriteriaWeights" or structure.get("stage") != CRITERIA_STAGE:
        raise ScenarioLabError("criteria-weighting evaluationContext structure is incompatible")
    model = context.get("model")
    if model is not None and (not isinstance(model, dict) or ("apiModelKey" in model and model.get("apiModelKey") != MAIN_MODEL_KEY)):
        raise ScenarioLabError("criteria-weighting evaluationContext model is incompatible with TOPSIS")
    criteria = _items(context, "leafCriteria")
    by_name = {item.get("name"): item for item in criteria}
    if len(criteria) != 2 or set(by_name) != {"Quality", "Cost"} or any(not _id(item) for item in criteria) or len({_id(item) for item in criteria}) != 2:
        raise ScenarioLabError("criteria-weighting context does not contain exactly the persisted Quality and Cost leaves")
    weights = payload.get("weightsByCriterion")
    ids = {_id(item) for item in criteria}
    if set(payload) != {"weightsByCriterion"} or not isinstance(weights, dict) or set(weights) != ids or any(value != "" for value in weights.values()):
        raise ScenarioLabError("criteria-weighting payload is not the canonical empty persisted weight vector")
    identity = tuple(sorted((str(item["name"]), _id(item) or "") for item in criteria))
    return context, identity


def _weight_payload(context: dict[str, Any], *, expert_b: bool) -> dict[str, Any]:
    criteria = {item.get("name"): item for item in _items(context, "leafCriteria")}
    values = {"Quality": 0.45, "Cost": 0.55} if expert_b else {"Quality": 0.70, "Cost": 0.30}
    weights = {_id(criteria[name]) or "": value for name, value in values.items()}
    if (
        "" in weights
        or set(weights) != {_id(item) for item in criteria.values()}
        or any(not isinstance(value, (int, float)) or value < 0 or value > 1 for value in weights.values())
        or abs(sum(weights.values()) - 1) > 0.001
    ):
        raise ScenarioLabError("criteria-weighting submission is not a complete normalized persisted weight vector")
    return {"weightsByCriterion": weights}


def _validate_weight_compute(response: Any, criterion_ids: set[str]) -> None:
    if (
        not isinstance(response, dict)
        or response.get("stage") != CRITERIA_STAGE
        or response.get("structureKey") != "manualCriteriaWeights"
        or response.get("consensusPhase") != 0
        or response.get("currentStage") != ALTERNATIVE_STAGE
    ):
        raise ScenarioLabError("criteria-weighting computation did not transition to alternativeEvaluation")
    result = response.get("result")
    weights = result.get("weightsByCriterion") if isinstance(result, dict) else None
    collective = result.get("collectiveEvaluations") if isinstance(result, dict) else None
    if (
        not isinstance(weights, dict)
        or set(weights) != criterion_ids
        or any(not isinstance(value, (int, float)) or not (0 <= value <= 1) for value in weights.values())
        or abs(sum(weights.values()) - 1) > 0.001
    ):
        raise ScenarioLabError("criteria-weighting computation returned invalid final weights")
    if not isinstance(collective, dict) or collective.get("weightsByCriterion") != weights or result.get("consensusMeasure") not in (None,):
        raise ScenarioLabError("criteria-weighting computation returned an incompatible collective result")
    if "rawOutput" in result and not isinstance(result["rawOutput"], dict):
        raise ScenarioLabError("criteria-weighting computation rawOutput is invalid")
    if isinstance(result.get("rawOutput"), dict) and "useMcc" in result["rawOutput"] and result["rawOutput"].get("useMcc") is not True:
        raise ScenarioLabError("criteria-weighting computation did not report MCC for two experts")


def _validate_finished(detail: Any, issue_id: str, issue_name: str, criterion_ids: set[str]) -> None:
    if not isinstance(detail, dict):
        raise ScenarioLabError("finished issue detail must be an object")
    issue, lifecycle, models, configuration, criteria, consensus = (
        detail.get("issue"),
        detail.get("lifecycle"),
        detail.get("models"),
        detail.get("configuration"),
        detail.get("criteria"),
        detail.get("consensus"),
    )
    base_key = (((models or {}).get("base") or {}).get("technical") or {}).get("apiModelKey") if isinstance(models, dict) else None
    weighting_key = (((models or {}).get("criteriaWeighting") or {}).get("technical") or {}).get("apiModelKey") if isinstance(models, dict) else None
    if (
        not isinstance(issue, dict)
        or _id(issue) != issue_id
        or issue.get("name") != issue_name
        or not isinstance(lifecycle, dict)
        or lifecycle.get("currentStage") != "finished"
        or lifecycle.get("active") is not False
        or base_key != MAIN_MODEL_KEY
        or weighting_key != WEIGHTING_MODEL_KEY
    ):
        raise ScenarioLabError("finished issue does not identify the TOPSIS and Manual Criteria Weights models")
    if not isinstance(configuration, dict) or ((configuration.get("criteriaWeighting") or {}).get("source") != "expertCriteriaWeighting"):
        raise ScenarioLabError("finished issue does not identify expert criteria weighting")
    if not isinstance(consensus, dict) or consensus.get("enabled") is not False or consensus.get("rounds") not in (None, []):
        raise ScenarioLabError("finished issue incorrectly reports consensus")
    leaves = [item for item in _items(criteria, "nodes") if item.get("name") in {"Quality", "Cost"}]
    final = criteria.get("finalWeights") if isinstance(criteria, dict) else None
    phase_results = _items(detail, "phaseResults")
    weighting_results = [item for item in phase_results if item.get("stage") == CRITERIA_STAGE and item.get("phase") == 0]
    alternatives = [item for item in phase_results if item.get("stage") == ALTERNATIVE_STAGE and item.get("phase") == 0]
    if (
        len(leaves) != 2
        or {_id(item) for item in leaves} != criterion_ids
        or len(weighting_results) != 1
        or len(alternatives) != 1
        or len(_items(alternatives[0], "rankedAlternatives")) != 3
    ):
        raise ScenarioLabError("finished issue is missing expected criteria or phase results")
    weights = final.get("byCriterionId") if isinstance(final, dict) else None
    source = final.get("source") if isinstance(final, dict) else None
    if (
        not isinstance(weights, dict)
        or set(weights) != criterion_ids
        or any(not isinstance(value, (int, float)) or not (0 <= value <= 1) for value in weights.values())
        or abs(sum(weights.values()) - 1) > 0.001
        or not isinstance(source, dict)
        or source.get("kind") != "criteriaWeightingStageResult"
        or source.get("stageResultId") != weighting_results[0].get("id")
    ):
        raise ScenarioLabError("finished issue final criteria weights are incompatible")


def generate(
    sessions: SessionPool, store: ManifestStore, *, owner_alias: str = "owner", expert_a_alias: str = "expert_a", expert_b_alias: str = "expert_b"
) -> GenerationResult:
    aliases = (owner_alias, expert_a_alias, expert_b_alias)
    if len(set(aliases)) != 3 or any(alias not in sessions.users for alias in aliases):
        raise ScenarioLabError(f"{SCENARIO_ID} requires distinct configured aliases: owner, expert_a, expert_b")
    emails = [sessions.users[alias].email for alias in aliases]
    if len({email.casefold() for email in emails}) != 3:
        raise ScenarioLabError("owner and expert emails must be distinct")
    generation_id, issue_id = _new_generation_id(store), None
    issue_name = f"[AUTO:{generation_id}] No consensus · criteria weighting"
    try:
        for alias in aliases:
            sessions.login(alias)
        owner = IssuesApi(sessions.client_for(owner_alias))
        models = owner.models()
        main = _select_main_model(models)
        _select_weighting_model(models)
        catalogue = _items(owner.users(), "users")
        for email in emails[1:]:
            if not any(str(item.get("email", "")).casefold() == email.casefold() for item in catalogue):
                raise ScenarioLabError(f"configured expert is absent from the Backend user catalogue: {email}")
        domain = _compatible_domain(owner.expression_domains(), supported_domain_type_keys(main))
        owner.create_issue(_issue_payload(issue_name, _id(main) or "", emails[1:], _id(domain) or ""))
        matches = [item for item in _items(owner.active_issues(), "issues") if item.get("name") == issue_name]
        if len(matches) != 1 or not _id(matches[0]):
            raise ScenarioLabError("created issue could not be resolved uniquely from owner active issues")
        issue_id, active = _id(matches[0]), matches[0]
        if (
            active.get("currentStage") != CRITERIA_STAGE
            or active.get("isConsensus") is not False
            or active.get("isIssueOwner") is not True
            or active.get("evaluationStructureKey") != "alternativeCriteriaMatrix"
            or active.get("criteriaWeightsStructureKey") != "manualCriteriaWeights"
        ):
            raise ScenarioLabError("resolved active issue does not match the TOPSIS expert-weighting contract")
        for alias in aliases[1:]:
            IssuesApi(sessions.client_for(alias)).respond_to_invitation(issue_id, "accepted")
        weight_identity, weight_payloads = None, []
        for index, alias in enumerate(aliases[1:]):
            context, identity = _weight_context(IssuesApi(sessions.client_for(alias)).evaluation(issue_id, CRITERIA_STAGE), issue_id)
            if weight_identity is not None and identity != weight_identity:
                raise ScenarioLabError("expert criteria-weighting contexts do not use compatible persisted identities")
            weight_identity = identity
            payload = _weight_payload(context, expert_b=index == 1)
            weight_payloads.append(payload)
            response = IssuesApi(sessions.client_for(alias)).submit_evaluation(issue_id, CRITERIA_STAGE, payload)
            expected_stage = "weightsFinished" if index == 1 else CRITERIA_STAGE
            if (
                not isinstance(response, dict)
                or response.get("completed") is not True
                or response.get("stage") != CRITERIA_STAGE
                or response.get("structureKey") != "manualCriteriaWeights"
                or response.get("consensusPhase") != 0
                or response.get("currentStage") != expected_stage
            ):
                raise ScenarioLabError("criteria-weighting submission did not advance through the expected lifecycle")
        if weight_payloads[0] == weight_payloads[1] or weight_identity is None:
            raise ScenarioLabError("expert criteria-weighting payloads must differ")
        active = next((item for item in _items(owner.active_issues(), "issues") if _id(item) == issue_id), None)
        if not isinstance(active, dict) or active.get("currentStage") != "weightsFinished":
            raise ScenarioLabError("issue did not reach weightsFinished after expert criteria submissions")
        criterion_ids = {persisted_id for _, persisted_id in weight_identity}
        _validate_weight_compute(owner.compute_evaluation(issue_id, CRITERIA_STAGE), criterion_ids)
        matrices, alternative_identity = [], None
        for index, alias in enumerate(aliases[1:]):
            response = IssuesApi(sessions.client_for(alias)).evaluation(issue_id, ALTERNATIVE_STAGE)
            context = _validate_evaluation_response(response, issue_id, model_key=MAIN_MODEL_KEY)
            identity = _context_identity(context)
            if alternative_identity is not None and identity != alternative_identity:
                raise ScenarioLabError("expert alternative contexts do not use compatible persisted identities")
            alternative_identity = identity
            matrix = _matrix(context, expert_b=index == 1)
            matrices.append(matrix)
            submitted = IssuesApi(sessions.client_for(alias)).submit_evaluation(issue_id, ALTERNATIVE_STAGE, matrix)
            if not isinstance(submitted, dict) or submitted.get("completed") is not True or submitted.get("currentStage") != ALTERNATIVE_STAGE:
                raise ScenarioLabError("alternative evaluation submission did not complete correctly")
        if matrices[0] == matrices[1]:
            raise ScenarioLabError("expert alternative matrices must differ")
        computed = owner.compute_evaluation(issue_id, ALTERNATIVE_STAGE)
        result = computed.get("result") if isinstance(computed, dict) else None
        ranked = result.get("rankedAlternatives") if isinstance(result, dict) else None
        alternative_ids = {persisted_id for name, persisted_id in alternative_identity or () if name in {"Balanced choice", "Premium choice", "Budget choice"}}
        ranked_ids = {_id(item) for item in ranked if isinstance(item, dict)} if isinstance(ranked, list) else set()
        if (
            not isinstance(computed, dict)
            or computed.get("stage") != ALTERNATIVE_STAGE
            or computed.get("currentStage") != "finished"
            or not isinstance(ranked, list)
            or len(ranked) != 3
            or ranked_ids != alternative_ids
            or result.get("consensusMeasure") not in (None,)
            or result.get("consensusLifecycle") not in (None,)
        ):
            raise ScenarioLabError("TOPSIS computation did not finish with three ranked alternatives")
        finished = [item for item in _items(owner.finished_issues(), "issues") if _id(item) == issue_id or item.get("name") == issue_name]
        if len(finished) != 1:
            raise ScenarioLabError("computed issue could not be resolved uniquely from finished issues")
        _validate_finished(owner.finished_issue(issue_id), issue_id, issue_name, criterion_ids)
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
