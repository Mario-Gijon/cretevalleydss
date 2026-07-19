from __future__ import annotations

from typing import Any

from issue_scenario_lab.api.issues import IssuesApi
from issue_scenario_lab.api.session_pool import SessionPool
from issue_scenario_lab.errors import ManifestError, ScenarioLabError
from issue_scenario_lab.manifest.models import GeneratedIssue
from issue_scenario_lab.manifest.store import ManifestStore
from issue_scenario_lab.scenarios.consensus_first_round import (
    MAX_PHASES,
    MODEL_KEY,
    PARAMETERS,
    STAGE,
    THRESHOLD,
    _domain,
    _finite,
    _ids,
    _payload,
    _select_model,
    _validate_collective,
    _validate_finished_weights,
    _validate_pairwise,
)
from issue_scenario_lab.scenarios.no_consensus_basic import GenerationResult, _id, _items, _new_generation_id
from issue_scenario_lab.scenarios.no_consensus_criteria_weighting import _validate_ranking

SCENARIO_ID = "consensus-later-round"
PHASE_ZERO_FORWARD = ((0.90, 0.95, 0.80), (0.10, 0.05, 0.20))
PHASE_ONE_FORWARD = ((0.64, 0.65, 0.65), (0.62, 0.63, 0.64))
PHASE_ZERO_SCORES = (0.4133, 0.4266, 0.4199)
PHASE_ONE_SCORES = (0.54224, 0.41156, 0.35532)


def _context(response: Any, issue_id: str, phase: int, previous: dict[str, Any] | None = None) -> dict[str, Any]:
    if (
        not isinstance(response, dict)
        or response.get("stage") != STAGE
        or response.get("structureKey") != "alternativePairwiseByCriterion"
        or response.get("consensusPhase") != phase
        or response.get("completed") is not False
        or response.get("submittedAt") is not None
    ):
        raise ScenarioLabError("pairwise evaluation response is incompatible")
    context, payload = response.get("evaluationContext"), response.get("payload")
    if (
        not isinstance(context, dict)
        or not isinstance(payload, dict)
        or _id(context.get("issue") or {}) != issue_id
        or (context.get("issue") or {}).get("currentStage") != STAGE
        or (context.get("issue") or {}).get("isConsensus") is not True
        or (context.get("consensus") or {}).get("phase") != phase
    ):
        raise ScenarioLabError("pairwise evaluation context is incompatible")
    alternatives, criteria = _ids(context)
    if set(payload) != set(criteria.values()):
        raise ScenarioLabError("pairwise payload does not contain the persisted Overall preference criterion")
    for matrix in payload.values():
        if set(matrix) != set(alternatives.values()) or any(
            set(row) != set(alternatives.values()) - {row_id} or any(cell != {"value": ""} for cell in row.values()) for row_id, row in matrix.items()
        ):
            raise ScenarioLabError("pairwise payload is not the canonical empty directed matrix")
    if phase == 0:
        if response.get("collectiveReference") is not None or (context.get("consensus") or {}).get("previousCollectiveEvaluations") not in ({}, None):
            raise ScenarioLabError("phase-zero evaluation unexpectedly has collective evidence")
    elif previous is not None:
        reference = response.get("collectiveReference")
        if (
            not isinstance(reference, dict)
            or reference.get("consensusPhase") != phase - 1
            or reference.get("collectiveEvaluations") != previous
            or (context.get("consensus") or {}).get("previousCollectiveEvaluations") != previous
            or (context.get("consensus") or {}).get("currentCollectiveEvaluations") != {}
        ):
            raise ScenarioLabError("phase-one evaluation does not expose the phase-zero collective reference")
    return context


def _matrix(context: dict[str, Any], values: tuple[float, float, float]) -> dict[str, Any]:
    alternatives, criteria = _ids(context)
    balanced, premium, budget = (alternatives[name] for name in ("Balanced choice", "Premium choice", "Budget choice"))
    bp, bu, pu = values
    payload = {
        criteria["Overall preference"]: {
            balanced: {premium: {"value": bp}, budget: {"value": bu}},
            premium: {balanced: {"value": 1 - bp}, budget: {"value": pu}},
            budget: {balanced: {"value": 1 - bu}, premium: {"value": 1 - pu}},
        }
    }
    _validate_pairwise(payload, set(criteria.values()), {balanced, premium, budget})
    return payload


def _collective(context: dict[str, Any], values: tuple[float, float, float, float, float, float]) -> dict[str, Any]:
    alternatives, criteria = _ids(context)
    balanced, premium, budget = (alternatives[name] for name in ("Balanced choice", "Premium choice", "Budget choice"))
    bp, pb, bu, ub, pu, up = values
    return {criteria["Overall preference"]: {balanced: {premium: bp, budget: bu}, premium: {balanced: pb, budget: pu}, budget: {balanced: ub, premium: up}}}


def _validate_lifecycle(value: Any, *, phase: int, reached: bool) -> None:
    if (
        not isinstance(value, dict)
        or value.get("consensusReached") is not reached
        or value.get("maxPhasesReached") is not False
        or value.get("finalizationReason") != ("consensusReached" if reached else None)
        or value.get("currentConsensusPhase") != phase
        or value.get("nextConsensusPhase") != (phase if reached else phase + 1)
        or value.get("threshold") != THRESHOLD
        or value.get("maxPhases") != MAX_PHASES
        or not _finite(value.get("consensusMeasure"))
    ):
        raise ScenarioLabError("consensus lifecycle is incompatible")


def _validate_compute(
    response: Any, *, phase: int, collective: dict[str, Any], scores: tuple[float, float, float], reached: bool, alternative_ids: set[str]
) -> None:
    result = response.get("result") if isinstance(response, dict) else None
    if (
        not isinstance(response, dict)
        or response.get("stage") != STAGE
        or response.get("structureKey") != "alternativePairwiseByCriterion"
        or response.get("consensusPhase") != (phase if reached else phase + 1)
        or response.get("currentStage") != ("finished" if reached else STAGE)
        or not isinstance(result, dict)
        or result.get("consensusMeasure") != (1.0 if reached else 0.5)
    ):
        raise ScenarioLabError("consensus computation response is incompatible")
    _validate_collective(result.get("collectiveEvaluations"), collective)
    _validate_lifecycle(result.get("consensusLifecycle"), phase=phase, reached=reached)
    _validate_ranking(result.get("rankedAlternatives"), alternative_ids)
    names = [item.get("name") for item in result["rankedAlternatives"]]
    if names != (["Balanced choice", "Premium choice", "Budget choice"] if reached else ["Premium choice", "Budget choice", "Balanced choice"]):
        raise ScenarioLabError("consensus ranking is incompatible")
    raw = result.get("rawOutput")
    if (
        not isinstance(raw, dict)
        or raw.get("cm") != result["consensusMeasure"]
        or raw.get("collective_scores") != list(scores)
        or not isinstance(raw.get("suggested_next_evaluations"), dict)
        or (raw["suggested_next_evaluations"] != {} if reached else raw["suggested_next_evaluations"] == {})
    ):
        raise ScenarioLabError("consensus raw output is incompatible")


def _validate_phase_zero_suggestions(raw: Any, expert_ids: set[str], collective: dict[str, Any]) -> None:
    suggestions = raw.get("suggested_next_evaluations") if isinstance(raw, dict) else None
    criterion_ids, alternative_ids = set(collective), set(next(iter(collective.values()), {}))
    if not isinstance(suggestions, dict) or set(suggestions) != expert_ids:
        raise ScenarioLabError("phase-zero suggestions do not use the persisted expert identities")
    for suggestion in suggestions.values():
        payload = suggestion.get("payload") if isinstance(suggestion, dict) else None
        if not isinstance(payload, dict) or set(payload) != criterion_ids:
            raise ScenarioLabError("phase-zero suggestion payload is incompatible")
        for matrix in payload.values():
            if not isinstance(matrix, dict) or set(matrix) != alternative_ids:
                raise ScenarioLabError("phase-zero suggestion matrix is incompatible")
            for row_id, row in matrix.items():
                if not isinstance(row, dict) or set(row) != alternative_ids - {row_id}:
                    raise ScenarioLabError("phase-zero suggestion matrix is incomplete")
                if any(not isinstance(cell, dict) or not _finite(cell.get("value")) or not 0 <= cell["value"] <= 1 for cell in row.values()):
                    raise ScenarioLabError("phase-zero suggestion values are incompatible")


def _validate_active(active: Any, phase: int, emails: set[str] | None = None) -> None:
    if (
        not isinstance(active, dict)
        or active.get("currentStage") != STAGE
        or active.get("consensusCurrentPhase") != phase
        or active.get("isConsensus") is not True
        or active.get("simulateConsensus") is not False
        or active.get("consensusThreshold") != THRESHOLD
        or active.get("consensusMaxPhases") != MAX_PHASES
        or active.get("isIssueOwner") is not True
        or active.get("evaluationStructureKey") != "alternativePairwiseByCriterion"
    ):
        raise ScenarioLabError("active issue consensus lifecycle is incompatible")
    if emails is not None:
        participants = [item for item in _items(active, "expertParticipants") if item.get("invitationStatus") == "accepted"]
        if not participants:
            participants = _items(active, "expertParticipants")
        participant_emails = {str(item.get("email") or (item.get("expert") or {}).get("email", "")).casefold() for item in participants}
        progress = active.get("progress")
        if (
            len(participants) != 2
            or participant_emails != emails
            or not isinstance(progress, dict)
            or progress.get("totalAccepted") != 2
            or progress.get("evalsDone") != 0
        ):
            raise ScenarioLabError("active issue participants were not reset for the next consensus phase")


def _validate_finished(detail: Any, issue_id: str, issue_name: str, phase_zero: dict[str, Any], phase_one: dict[str, Any], emails: set[str]) -> None:
    if not isinstance(detail, dict):
        raise ScenarioLabError("finished issue detail is incompatible")
    issue, lifecycle, models, consensus = detail.get("issue"), detail.get("lifecycle"), detail.get("models"), detail.get("consensus")
    base = (models or {}).get("base") if isinstance(models, dict) else None
    effective = (base or {}).get("effectiveParameters")
    if (
        not isinstance(issue, dict)
        or _id(issue) != issue_id
        or issue.get("name") != issue_name
        or (lifecycle or {}).get("currentStage") != "finished"
        or (lifecycle or {}).get("active") is not False
        or ((base or {}).get("technical") or {}).get("apiModelKey") != MODEL_KEY
        or (base or {}).get("evaluationStructureKey") != "alternativePairwiseByCriterion"
        or not isinstance(effective, dict)
        or any(effective.get(key) != value for key, value in PARAMETERS.items())
        or (models or {}).get("criteriaWeighting") is not None
    ):
        raise ScenarioLabError("finished issue model and lifecycle are incompatible")
    _validate_finished_weights(detail, effective)
    rounds = consensus.get("rounds") if isinstance(consensus, dict) else None
    if (
        not isinstance(consensus, dict)
        or consensus.get("enabled") is not True
        or consensus.get("simulated") is not False
        or consensus.get("threshold") != THRESHOLD
        or consensus.get("maxPhases") != MAX_PHASES
        or consensus.get("finalPhase") != 1
        or consensus.get("reachedPhase") != 1
        or consensus.get("finalizationReason") != "consensusReached"
        or not isinstance(rounds, list)
        or [round_.get("phase") for round_ in rounds] != [0, 1]
    ):
        raise ScenarioLabError("finished issue consensus rounds are incompatible")
    participants = [item for item in _items(detail, "participants") if item.get("invitationStatus") == "accepted"]
    history = detail.get("participantHistory")
    if (
        len(participants) != 2
        or {str((item.get("expert") or {}).get("email", "")).casefold() for item in participants} != emails
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
    evaluations = detail.get("evaluations")
    individual = _items(evaluations, "individual")
    contexts = [item for item in _items(evaluations, "contexts") if item.get("stage") == STAGE]
    collective = [item for item in _items(evaluations, "collective") if item.get("stage") == STAGE]
    phases = [item for item in _items(detail, "phaseResults") if item.get("stage") == STAGE]
    if (
        len(individual) != 4
        or {(item.get("phase"), item.get("expertId")) for item in individual}.__len__() != 4
        or any(
            item.get("completed") is not True or item.get("structureKey") != "alternativePairwiseByCriterion" or not item.get("submittedAt")
            for item in individual
        )
        or [item.get("phase") for item in contexts] != [0, 1]
        or [item.get("phase") for item in collective] != [0, 1]
        or [item.get("phase") for item in phases] != [0, 1]
        or any(collective[index].get("phaseResultId") != phases[index].get("id") for index in range(2))
    ):
        raise ScenarioLabError("finished issue two-round evidence is incompatible")
    _validate_collective(collective[0].get("rawPayload"), phase_zero)
    _validate_collective(collective[1].get("rawPayload"), phase_one)
    alternative_ids = {row_id for rows in phase_one.values() for row_id in rows}
    _validate_ranking(phases[0].get("rankedAlternatives"), alternative_ids)
    _validate_ranking(phases[1].get("rankedAlternatives"), alternative_ids)
    _validate_lifecycle((phases[0].get("modelSpecificOutput") or {}).get("consensusLifecycle"), phase=0, reached=False)
    _validate_lifecycle((phases[1].get("modelSpecificOutput") or {}).get("consensusLifecycle"), phase=1, reached=True)


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
    issue_name = f"[AUTO:{generation_id}] Consensus · later round"
    try:
        for alias in aliases:
            sessions.login(alias)
        owner = IssuesApi(sessions.client_for(owner_alias))
        model = _select_model(owner.models())
        users = _items(owner.users(), "users")
        user_by_email = {str(item.get("email", "")).casefold(): item for item in users}
        if not set(emails[1:]) <= set(user_by_email):
            raise ScenarioLabError("configured expert is absent from the Backend user catalogue")
        expert_ids = {_id(user_by_email[email]) for email in emails[1:]}
        if None in expert_ids:
            raise ScenarioLabError("configured expert is missing a persisted user ID")
        domain = _domain(owner.expression_domains())
        owner.create_issue(_payload(issue_name, _id(model) or "", emails[1:], _id(domain) or ""))
        matches = [item for item in _items(owner.active_issues(), "issues") if item.get("name") == issue_name]
        if len(matches) != 1 or not _id(matches[0]):
            raise ScenarioLabError("created issue could not be resolved uniquely")
        issue_id, active = _id(matches[0]), matches[0]
        _validate_active(active, 0)
        for alias in aliases[1:]:
            IssuesApi(sessions.client_for(alias)).respond_to_invitation(issue_id, "accepted")
        phase_zero_contexts = [_context(IssuesApi(sessions.client_for(alias)).evaluation(issue_id, STAGE), issue_id, 0) for alias in aliases[1:]]
        if _ids(phase_zero_contexts[0]) != _ids(phase_zero_contexts[1]):
            raise ScenarioLabError("expert contexts use different persisted identities")
        phase_zero_payloads = [_matrix(context, PHASE_ZERO_FORWARD[index]) for index, context in enumerate(phase_zero_contexts)]
        for alias, payload in zip(aliases[1:], phase_zero_payloads, strict=True):
            submitted = IssuesApi(sessions.client_for(alias)).submit_evaluation(issue_id, STAGE, payload)
            if not isinstance(submitted, dict) or submitted.get("completed") is not True or submitted.get("consensusPhase") != 0:
                raise ScenarioLabError("phase-zero submission is incompatible")
        phase_zero_collective = _collective(phase_zero_contexts[0], (0.42, 0.42, 0.41, 0.41, 0.44, 0.44))
        alternative_ids = set(_ids(phase_zero_contexts[0])[0].values())
        phase_zero_result = owner.compute_evaluation(issue_id, STAGE)
        _validate_compute(
            phase_zero_result,
            phase=0,
            collective=phase_zero_collective,
            scores=PHASE_ZERO_SCORES,
            reached=False,
            alternative_ids=alternative_ids,
        )
        _validate_phase_zero_suggestions(
            (phase_zero_result.get("result") or {}).get("rawOutput"),
            {str(value) for value in expert_ids},
            phase_zero_collective,
        )
        active_after = [item for item in _items(owner.active_issues(), "issues") if _id(item) == issue_id]
        if len(active_after) != 1:
            raise ScenarioLabError("phase-zero issue is no longer active")
        _validate_active(active_after[0], 1, set(emails[1:]))
        phase_one_contexts = [
            _context(IssuesApi(sessions.client_for(alias)).evaluation(issue_id, STAGE), issue_id, 1, phase_zero_collective) for alias in aliases[1:]
        ]
        phase_one_payloads = [_matrix(context, PHASE_ONE_FORWARD[index]) for index, context in enumerate(phase_one_contexts)]
        for alias, payload in zip(aliases[1:], phase_one_payloads, strict=True):
            submitted = IssuesApi(sessions.client_for(alias)).submit_evaluation(issue_id, STAGE, payload)
            if not isinstance(submitted, dict) or submitted.get("completed") is not True or submitted.get("consensusPhase") != 1:
                raise ScenarioLabError("phase-one submission is incompatible")
        phase_one_collective = _collective(phase_one_contexts[0], (0.63, 0.37, 0.64, 0.36, 0.64, 0.35))
        _validate_compute(
            owner.compute_evaluation(issue_id, STAGE),
            phase=1,
            collective=phase_one_collective,
            scores=PHASE_ONE_SCORES,
            reached=True,
            alternative_ids=alternative_ids,
        )
        finished = [item for item in _items(owner.finished_issues(), "issues") if _id(item) == issue_id or item.get("name") == issue_name]
        if len(finished) != 1:
            raise ScenarioLabError("computed issue could not be resolved uniquely from finished issues")
        _validate_finished(owner.finished_issue(issue_id), issue_id, issue_name, phase_zero_collective, phase_one_collective, set(emails[1:]))
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
