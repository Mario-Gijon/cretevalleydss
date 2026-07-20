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
    _validate_collective,
    _validate_finished_weights,
    _validate_pairwise,
)
from issue_scenario_lab.scenarios.consensus_first_round import (
    _select_model as _select_base_model,
)
from issue_scenario_lab.scenarios.no_consensus_basic import GenerationResult, _id, _items, _new_generation_id
from issue_scenario_lab.scenarios.no_consensus_criteria_weighting import _validate_ranking

SCENARIO_ID = "consensus-max-rounds"
PHASE_FORWARDS = (
    ((0.90, 0.95, 0.80), (0.10, 0.05, 0.20)),
    ((0.90, 0.90, 0.90), (0.10, 0.10, 0.90)),
    ((0.70, 0.80, 0.70), (0.30, 0.30, 0.70)),
    ((0.70, 0.80, 0.70), (0.68, 0.78, 0.30)),
)
PHASE_MEASURES = (0.50, 0.65, 0.73, 0.80)
PHASE_SCORES = (
    (0.4133, 0.4266, 0.4199),
    (0.4200, 0.4464, 0.2056),
    (0.4732, 0.4732, 0.3330),
    (0.56204, 0.35816, 0.29116),
)
PHASE_RANKINGS = (
    ("Premium choice", "Budget choice", "Balanced choice"),
    ("Premium choice", "Balanced choice", "Budget choice"),
    ("Premium choice", "Balanced choice", "Budget choice"),
    ("Balanced choice", "Premium choice", "Budget choice"),
)
PHASE_COLLECTIVE_VALUES = (
    (0.42, 0.42, 0.41, 0.41, 0.44, 0.44),
    (0.42, 0.42, 0.42, 0.42, 0.90, 0.10),
    (0.46, 0.46, 0.50, 0.40, 0.70, 0.30),
    (0.69, 0.31, 0.79, 0.21, 0.46, 0.46),
)
_CANONICAL_NAMES = ("Balanced choice", "Premium choice", "Budget choice")
_TOLERANCE = 1e-6


def _close(actual: Any, expected: float) -> bool:
    return _finite(actual) and abs(actual - expected) <= _TOLERANCE


def _select_model(data: Any) -> dict[str, Any]:
    """Keep the shared Herrera-Viedma checks, plus this scenario's full contract."""

    candidates = [item for item in _items(data, "models") if item.get("apiModelKey") == MODEL_KEY]
    if len(candidates) != 1:
        raise ScenarioLabError("Herrera Viedma CRP catalogue must expose exactly one apiModelKey match")
    model = _select_base_model({"models": candidates})
    if model.get("usesFuzzyCriteriaWeights") is not False:
        raise ScenarioLabError("Herrera Viedma CRP must not use fuzzy criteria weights")
    return model


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
    alternative_ids, criterion_ids = set(alternatives.values()), set(criteria.values())
    if set(payload) != criterion_ids:
        raise ScenarioLabError("pairwise payload does not contain the persisted Overall preference criterion")
    for matrix in payload.values():
        if (
            not isinstance(matrix, dict)
            or set(matrix) != alternative_ids
            or any(
                not isinstance(row, dict) or set(row) != alternative_ids - {row_id} or any(cell != {"value": ""} for cell in row.values())
                for row_id, row in matrix.items()
            )
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
            raise ScenarioLabError("evaluation does not expose the immediately previous collective reference")
    return context


def _matrix(context: dict[str, Any], values: tuple[float, float, float]) -> dict[str, Any]:
    alternatives, criteria = _ids(context)
    balanced, premium, budget = (alternatives[name] for name in _CANONICAL_NAMES)
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
    balanced, premium, budget = (alternatives[name] for name in _CANONICAL_NAMES)
    bp, pb, bu, ub, pu, up = values
    return {criteria["Overall preference"]: {balanced: {premium: bp, budget: bu}, premium: {balanced: pb, budget: pu}, budget: {balanced: ub, premium: up}}}


def _validate_plots(plots_graphic: Any) -> None:
    if not isinstance(plots_graphic, dict):
        raise ScenarioLabError("consensus plotsGraphic is incompatible")
    expert_points = plots_graphic.get("expert_points")
    collective_point = plots_graphic.get("collective_point")
    if (
        not isinstance(expert_points, list)
        or len(expert_points) != 2
        or any(
            not isinstance(point, list) or len(point) != 2 or any(not _finite(coordinate) for coordinate in point)
            for point in expert_points
        )
        or not isinstance(collective_point, list)
        or len(collective_point) != 2
        or any(not _finite(coordinate) for coordinate in collective_point)
    ):
        raise ScenarioLabError("consensus plotsGraphic is incompatible")


def _validate_raw_collective(raw_collective: Any, expected: dict[str, Any], criterion_id: str) -> None:
    """Validate either canonical matrices or the model's matrix-with-diagonal form."""

    if not isinstance(raw_collective, dict) or set(raw_collective) != {criterion_id}:
        raise ScenarioLabError("consensus raw collective matrix is incompatible")
    candidate = raw_collective[criterion_id]
    if isinstance(candidate, dict):
        _validate_collective(raw_collective, expected)
        return
    if not isinstance(candidate, list) or len(candidate) != 3 or any(not isinstance(row, list) or len(row) != 3 for row in candidate):
        raise ScenarioLabError("consensus raw collective matrix is incompatible")
    expected_rows = expected[criterion_id]
    alternative_ids = tuple(expected_rows)
    for row_index, row_id in enumerate(alternative_ids):
        for column_index, column_id in enumerate(alternative_ids):
            cell = candidate[row_index][column_index]
            if not _finite(cell):
                raise ScenarioLabError("consensus raw collective matrix contains a non-finite value")
            expected_cell = 0.5 if row_index == column_index else expected_rows[row_id][column_id]
            if not _close(cell, expected_cell):
                raise ScenarioLabError("consensus raw collective matrix does not match the computed phase")


def _validate_suggestions(raw: Any, context: dict[str, Any], forbidden: set[str]) -> set[str]:
    suggestions = raw.get("suggested_next_evaluations") if isinstance(raw, dict) else None
    alternatives, criteria = _ids(context)
    alternative_ids, criterion_ids = set(alternatives.values()), set(criteria.values())
    keys = set(suggestions) if isinstance(suggestions, dict) else set()
    if not isinstance(suggestions, dict) or len(keys) != 2 or any(not isinstance(key, str) or not key.strip() or key.casefold() in forbidden for key in keys):
        raise ScenarioLabError("consensus suggestions do not use two persisted expert identity keys")
    for suggestion in suggestions.values():
        payload = suggestion.get("payload") if isinstance(suggestion, dict) else None
        if not isinstance(payload, dict) or set(payload) != criterion_ids:
            raise ScenarioLabError("consensus suggestion payload is incompatible")
        for matrix in payload.values():
            if not isinstance(matrix, dict) or set(matrix) != alternative_ids:
                raise ScenarioLabError("consensus suggestion matrix is incompatible")
            for row_id, row in matrix.items():
                if not isinstance(row, dict) or set(row) != alternative_ids - {row_id}:
                    raise ScenarioLabError("consensus suggestion matrix is incomplete")
                if any(not isinstance(cell, dict) or not _finite(cell.get("value")) or not 0 <= cell["value"] <= 1 for cell in row.values()):
                    raise ScenarioLabError("consensus suggestion values are incompatible")
    return keys


def _validate_lifecycle(value: Any, phase: int) -> None:
    final = phase == 3
    if (
        not isinstance(value, dict)
        or value.get("consensusReached") is not False
        or value.get("maxPhasesReached") is not final
        or value.get("finalizationReason") != ("maxPhasesReached" if final else None)
        or value.get("currentConsensusPhase") != phase
        or value.get("nextConsensusPhase") != (3 if final else phase + 1)
        or value.get("threshold") != THRESHOLD
        or value.get("maxPhases") != MAX_PHASES
        or not _close(value.get("consensusMeasure"), PHASE_MEASURES[phase])
    ):
        raise ScenarioLabError("consensus lifecycle is incompatible")


def _validate_compute(
    response: Any, *, phase: int, context: dict[str, Any], collective: dict[str, Any], alternative_ids: set[str], forbidden: set[str]
) -> set[str]:
    final = phase == 3
    result = response.get("result") if isinstance(response, dict) else None
    if (
        not isinstance(response, dict)
        or response.get("stage") != STAGE
        or response.get("structureKey") != "alternativePairwiseByCriterion"
        or response.get("consensusPhase") != (3 if final else phase + 1)
        or response.get("currentStage") != ("finished" if final else STAGE)
        or not isinstance(result, dict)
        or not _close(result.get("consensusMeasure"), PHASE_MEASURES[phase])
    ):
        raise ScenarioLabError("consensus computation response is incompatible")
    _validate_collective(result.get("collectiveEvaluations"), collective)
    _validate_lifecycle(result.get("consensusLifecycle"), phase)
    _validate_ranking(result.get("rankedAlternatives"), alternative_ids)
    ranked = result["rankedAlternatives"]
    if [item.get("name") for item in ranked] != list(PHASE_RANKINGS[phase]):
        raise ScenarioLabError("consensus ranking is incompatible")
    scores_by_name = {item.get("name"): item.get("score") for item in ranked}
    if any(not _close(scores_by_name.get(name), PHASE_SCORES[phase][index]) for index, name in enumerate(_CANONICAL_NAMES)):
        raise ScenarioLabError("consensus ranking scores are incompatible")
    _validate_plots(result.get("plotsGraphic"))
    raw = result.get("rawOutput")
    if (
        not isinstance(raw, dict)
        or not _close(raw.get("cm"), PHASE_MEASURES[phase])
        or not isinstance(raw.get("collective_scores"), list)
        or len(raw["collective_scores"]) != 3
        or any(not _close(value, PHASE_SCORES[phase][index]) for index, value in enumerate(raw["collective_scores"]))
    ):
        raise ScenarioLabError("consensus raw output is incompatible")
    _validate_raw_collective(raw.get("collective_evaluations"), collective, next(iter(collective)))
    if "plots_graphic" in raw:
        _validate_plots(raw["plots_graphic"])
    return _validate_suggestions(raw, context, forbidden)


def _accepted_active_participants(active: dict[str, Any]) -> list[dict[str, Any]]:
    participants = _items(active, "expertParticipants")
    if any("invitationStatus" in participant for participant in participants):
        return [participant for participant in participants if participant.get("invitationStatus") == "accepted"]
    return participants


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
        or active.get("criteriaWeightsStructureKey") != "manualCriteriaWeights"
    ):
        raise ScenarioLabError("active issue consensus lifecycle is incompatible")
    if emails is not None:
        participants = _accepted_active_participants(active)
        participant_emails = {str(item.get("email") or (item.get("expert") or {}).get("email", "")).casefold() for item in participants}
        progress = active.get("progress")
        if (
            len(participants) != 2
            or participant_emails != emails
            or not isinstance(progress, dict)
            or progress.get("totalAccepted") != 2
            or progress.get("evalsDone") != 0
            or ("pendingExperts" in active and active["pendingExperts"] != [])
            or ("notAcceptedExperts" in active and active["notAcceptedExperts"] != [])
            or any("evaluationCompleted" in item and item["evaluationCompleted"] is not False for item in participants)
        ):
            raise ScenarioLabError("active issue participants were not reset for the next consensus phase")


def _validate_initial_participants(active: Any, emails: set[str]) -> None:
    participants = _items(active, "expertParticipants")
    participant_emails = {str(item.get("email") or (item.get("expert") or {}).get("email", "")).casefold() for item in participants}
    if len(participants) != 2 or participant_emails != emails:
        raise ScenarioLabError("created issue does not contain exactly the configured expert invitations")


def _validate_finished_contexts(
    contexts: list[dict[str, Any]], issue_id: str, expected_contexts: list[dict[str, Any]], collectives: list[dict[str, Any]]
) -> None:
    if len(contexts) != 4 or [item.get("phase") for item in contexts] != [0, 1, 2, 3]:
        raise ScenarioLabError("finished issue evaluation contexts are incompatible")
    for phase, record in enumerate(contexts):
        source = record.get("serializedContext")
        alternatives, criteria = _ids(expected_contexts[phase])
        if (
            record.get("structureKey") != "alternativePairwiseByCriterion"
            or record.get("modelId") is None
            or record.get("activeModelId") != record.get("modelId")
            or set(record.get("alternativeIds") or []) != set(alternatives.values())
            or set(record.get("criterionIds") or []) != {next(iter(criteria.values()))}
            or not isinstance(source, dict)
            or _id(source.get("issue") or {}) != issue_id
            or (source.get("consensus") or {}).get("phase") != phase
            or {item.get("id") for item in _items(source, "alternatives")} != set(alternatives.values())
            or {item.get("id") for item in _items(source, "leafCriteria")} != set(criteria.values())
        ):
            raise ScenarioLabError("finished issue evaluation context identities are incompatible")
        previous = (source.get("consensus") or {}).get("previousCollectiveEvaluations")
        if phase == 0 and previous not in ({}, None):
            raise ScenarioLabError("finished phase-zero context unexpectedly has previous collective evidence")
        if phase and previous != collectives[phase - 1]:
            raise ScenarioLabError("finished evaluation context does not retain the immediate previous collective")


def _finished_participants(detail: dict[str, Any], emails: set[str]) -> dict[str, str]:
    participants = [item for item in _items(detail, "participants") if item.get("invitationStatus") == "accepted"]
    identities: dict[str, str] = {}
    for participant in participants:
        expert = participant.get("expert")
        email, expert_id = str((expert or {}).get("email", "")).casefold(), (expert or {}).get("id")
        if (
            not isinstance(expert, dict)
            or not isinstance(expert_id, str)
            or not expert_id.strip()
            or email in identities
            or participant.get("evaluationCompleted") is not True
        ):
            raise ScenarioLabError("finished participant does not expose a distinct persisted expert identity")
        identities[email] = expert_id
    history = detail.get("participantHistory")
    if (
        len(identities) != 2
        or set(identities) != emails
        or len(set(identities.values())) != 2
        or not isinstance(history, dict)
        or history.get("summary") != {"total": 2, "participated": 2, "notParticipated": 0, "participatedPercentage": 100}
        or len(_items(history, "records")) != 2
        or any(
            item.get("participated") is not True or item.get("participationKey") != "participated" or item.get("weight") is not None
            for item in history["records"]
        )
    ):
        raise ScenarioLabError("finished issue participant history is incompatible")
    return identities


def _validate_finished(
    detail: Any,
    issue_id: str,
    issue_name: str,
    contexts: list[dict[str, Any]],
    collectives: list[dict[str, Any]],
    emails: set[str],
    live_suggestion_keys: list[set[str]],
) -> None:
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
        or ("finishedAt" in (lifecycle or {}) and not lifecycle.get("finishedAt"))
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
        or consensus.get("modelSupportsConsensus") is not True
        or consensus.get("simulated") is not False
        or consensus.get("threshold") != THRESHOLD
        or consensus.get("maxPhases") != MAX_PHASES
        or consensus.get("finalPhase") != 3
        or consensus.get("reachedPhase") is not None
        or consensus.get("finalizationReason") != "maxPhasesReached"
        or not isinstance(rounds, list)
        or [round_.get("phase") for round_ in rounds] != [0, 1, 2, 3]
    ):
        raise ScenarioLabError("finished issue consensus rounds are incompatible")
    participant_ids = set(_finished_participants(detail, emails).values())
    evaluations = detail.get("evaluations")
    individual = _items(evaluations, "individual")
    finished_contexts = [item for item in _items(evaluations, "contexts") if item.get("stage") == STAGE]
    collective = [item for item in _items(evaluations, "collective") if item.get("stage") == STAGE]
    phases = [item for item in _items(detail, "phaseResults") if item.get("stage") == STAGE]
    if (
        len(individual) != 8
        or any({item.get("expertId") for item in individual if item.get("phase") == phase} != participant_ids for phase in range(4))
        or any(
            item.get("stage") != STAGE
            or item.get("phase") not in range(4)
            or item.get("completed") is not True
            or item.get("structureKey") != "alternativePairwiseByCriterion"
            or not item.get("submittedAt")
            for item in individual
        )
        or [item.get("phase") for item in finished_contexts] != [0, 1, 2, 3]
        or [item.get("phase") for item in collective] != [0, 1, 2, 3]
        or [item.get("phase") for item in phases] != [0, 1, 2, 3]
        or any(
            collective[index].get("phaseResultId") != phases[index].get("id") or rounds[index].get("phaseResultId") != phases[index].get("id")
            for index in range(4)
        )
    ):
        raise ScenarioLabError("finished issue four-round evidence is incompatible")
    _validate_finished_contexts(finished_contexts, issue_id, contexts, collectives)
    for phase in range(4):
        alternatives, criteria = _ids(contexts[phase])
        for evaluation in [item for item in individual if item.get("phase") == phase]:
            _validate_pairwise(
                evaluation.get("rawPayload"),
                set(criteria.values()),
                set(alternatives.values()),
            )
        _validate_collective(collective[phase].get("rawPayload"), collectives[phase])
        _validate_ranking(phases[phase].get("rankedAlternatives"), set(alternatives.values()))
        ranking = phases[phase]["rankedAlternatives"]
        scores_by_name = {item.get("name"): item.get("score") for item in ranking}
        if (
            [item.get("name") for item in ranking] != list(PHASE_RANKINGS[phase])
            or not _close(phases[phase].get("consensusMeasure"), PHASE_MEASURES[phase])
            or any(not _close(scores_by_name.get(name), PHASE_SCORES[phase][index]) for index, name in enumerate(_CANONICAL_NAMES))
        ):
            raise ScenarioLabError("finished phase result ranking is incompatible")
        _validate_plots(phases[phase].get("plotsGraphic"))
        _validate_lifecycle((phases[phase].get("modelSpecificOutput") or {}).get("consensusLifecycle"), phase)
        raw = phases[phase].get("rawOutput")
        if (
            not isinstance(raw, dict)
            or not _close(raw.get("cm"), PHASE_MEASURES[phase])
            or not isinstance(raw.get("collective_scores"), list)
            or len(raw["collective_scores"]) != 3
            or any(not _close(value, PHASE_SCORES[phase][index]) for index, value in enumerate(raw["collective_scores"]))
        ):
            raise ScenarioLabError("finished consensus raw output is incompatible")
        raw_collective = raw.get("collective_evaluations")
        criterion_id = next(iter(_ids(contexts[phase])[1].values()))
        _validate_raw_collective(raw_collective, collectives[phase], criterion_id)
        if "plots_graphic" in raw:
            _validate_plots(raw["plots_graphic"])
        finished_keys = set(raw.get("suggested_next_evaluations", {})) if isinstance(raw, dict) else set()
        if finished_keys != live_suggestion_keys[phase] or finished_keys != participant_ids:
            raise ScenarioLabError("finished consensus suggestion identities are incompatible")
        _validate_suggestions(raw, contexts[phase], set())


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
    issue_name = f"[AUTO:{generation_id}] Consensus · maximum rounds"
    try:
        for alias in aliases:
            sessions.login(alias)
        owner = IssuesApi(sessions.client_for(owner_alias))
        model = _select_model(owner.models())
        user_emails = {str(item.get("email", "")).casefold() for item in _items(owner.users(), "users")}
        if not set(emails[1:]) <= user_emails:
            raise ScenarioLabError("configured expert is absent from the Backend user catalogue")
        domain = _domain(owner.expression_domains())
        owner.create_issue(_payload(issue_name, _id(model) or "", emails[1:], _id(domain) or ""))
        matches = [item for item in _items(owner.active_issues(), "issues") if item.get("name") == issue_name]
        if len(matches) != 1 or not _id(matches[0]):
            raise ScenarioLabError("created issue could not be resolved uniquely")
        issue_id, active = _id(matches[0]), matches[0]
        _validate_active(active, 0)
        _validate_initial_participants(active, set(emails[1:]))
        for alias in aliases[1:]:
            IssuesApi(sessions.client_for(alias)).respond_to_invitation(issue_id, "accepted")
        previous, contexts, collectives, live_suggestion_keys = None, [], [], []
        forbidden = {identity.casefold() for identity in (*aliases, *emails)}
        alternative_ids: set[str] | None = None
        for phase in range(4):
            phase_contexts = [_context(IssuesApi(sessions.client_for(alias)).evaluation(issue_id, STAGE), issue_id, phase, previous) for alias in aliases[1:]]
            if _ids(phase_contexts[0]) != _ids(phase_contexts[1]):
                raise ScenarioLabError("expert contexts use different persisted identities")
            if alternative_ids is None:
                alternative_ids = set(_ids(phase_contexts[0])[0].values())
            payloads = [_matrix(context, PHASE_FORWARDS[phase][index]) for index, context in enumerate(phase_contexts)]
            if payloads[0] == payloads[1]:
                raise ScenarioLabError("phase expert matrices must be distinct")
            for alias, payload in zip(aliases[1:], payloads, strict=True):
                submitted = IssuesApi(sessions.client_for(alias)).submit_evaluation(issue_id, STAGE, payload)
                if (
                    not isinstance(submitted, dict)
                    or submitted.get("completed") is not True
                    or submitted.get("stage") != STAGE
                    or submitted.get("structureKey") != "alternativePairwiseByCriterion"
                    or submitted.get("consensusPhase") != phase
                    or submitted.get("currentStage") != STAGE
                ):
                    raise ScenarioLabError("consensus phase submission is incompatible")
            collective = _collective(phase_contexts[0], PHASE_COLLECTIVE_VALUES[phase])
            keys = _validate_compute(
                owner.compute_evaluation(issue_id, STAGE),
                phase=phase,
                context=phase_contexts[0],
                collective=collective,
                alternative_ids=alternative_ids,
                forbidden=forbidden,
            )
            contexts.append(phase_contexts[0])
            collectives.append(collective)
            live_suggestion_keys.append(keys)
            previous = collective
            if phase < 3:
                active_after = [item for item in _items(owner.active_issues(), "issues") if _id(item) == issue_id]
                if len(active_after) != 1:
                    raise ScenarioLabError("consensus issue is no longer active before the maximum phase")
                _validate_active(active_after[0], phase + 1, set(emails[1:]))
        finished = [item for item in _items(owner.finished_issues(), "issues") if _id(item) == issue_id or item.get("name") == issue_name]
        if len(finished) != 1:
            raise ScenarioLabError("computed issue could not be resolved uniquely from finished issues")
        _validate_finished(owner.finished_issue(issue_id), issue_id, issue_name, contexts, collectives, set(emails[1:]), live_suggestion_keys)
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
                f"{SCENARIO_ID} failed after issue creation (generationId={generation_id}, issueName={issue_name}, issueId={issue_id}): {error}. "
                f"If the issue remains active, use: python -m issue_scenario_lab delete-active {issue_id}"
            ) from error
        if isinstance(error, ScenarioLabError):
            raise
        raise ScenarioLabError(f"{SCENARIO_ID} preflight failed (generationId={generation_id}, issueName={issue_name}): {error}") from error
