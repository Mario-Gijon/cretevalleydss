import { createInternalError } from "../../../utils/common/errors.js";

const clone = (value) => JSON.parse(JSON.stringify(value));
const fail = (message, field, details = undefined) => {
  throw createInternalError(message, { field, ...(details === undefined ? {} : { details }) });
};
const required = (value, field) => {
  if (value === undefined || value === null) fail(`${field} is required`, field);
  return value;
};
const object = (value, field) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${field} must be an object`, field);
  return value;
};
const array = (value, field) => {
  if (!Array.isArray(value)) fail(`${field} must be an array`, field);
  return value;
};
const byId = (entries, project) => Object.fromEntries(entries.map(project));
const sortById = (entries) => [...entries].sort((left, right) => String(left.id).localeCompare(String(right.id)));
const sameIdentity = (left, right) => left.id === right.id && left.name === right.name && left.email === right.email && left.university === right.university;

const validateHistory = (history) => {
  object(history, "history");
  if (history.schemaVersion !== 1) fail("Issue history schemaVersion must be 1", "history.schemaVersion");
  required(history.issueId, "history.issueId");
  const creation = required(history.stateSnapshots?.creation, "history.stateSnapshots.creation");
  const state = required(creation.state, "history.stateSnapshots.creation.state");
  const issue = required(state.issue, "history.stateSnapshots.creation.state.issue");
  const owner = required(issue.owner, "history.stateSnapshots.creation.state.issue.owner");
  const creator = required(issue.creator, "history.stateSnapshots.creation.state.issue.creator");
  required(history.completeness, "history.completeness");
  required(history.evidence, "history.evidence");
  required(history.currentState, "history.currentState");
  required(history.scenarios, "history.scenarios");
  if (owner.id !== issue.ownerId) fail("Creation snapshot owner identity does not match ownerId", "history.stateSnapshots.creation.state.issue.owner");
  if (creator.id !== issue.createdBy) fail("Creation snapshot creator identity does not match createdBy", "history.stateSnapshots.creation.state.issue.creator");
  return { creation, state, issue, owner, creator };
};

const buildHistoricalExperts = (snapshots) => {
  const records = new Map();
  for (const snapshot of snapshots) {
    for (const participant of array(snapshot.state?.participants ?? [], "snapshot.state.participants")) {
      const expert = participant?.expert;
      if (!expert?.id) continue;
      const current = { id: expert.id, name: expert.name, email: expert.email, university: expert.university };
      const existing = records.get(expert.id);
      if (!existing) {
        records.set(expert.id, { ...current, firstSeenSnapshotId: snapshot.id, firstSeenPhase: snapshot.consensusPhase, identityChangedInLaterSnapshot: false });
      } else if (!sameIdentity(existing, current)) {
        existing.identityChangedInLaterSnapshot = true;
      }
    }
  }
  return sortById([...records.values()]);
};

const attemptInput = (attempt, field) => {
  const body = object(attempt.request?.body, `${field}.request.body`);
  return { modelParameters: body.modelParameters, evaluations: body.evaluations, context: body.context };
};
const appliedResult = (attempt, field) => {
  const application = object(attempt.application, `${field}.application`);
  const snapshot = object(application.resultSnapshot, `${field}.application.resultSnapshot`);
  const result = object(snapshot.result, `${field}.application.resultSnapshot.result`);
  required(result.standardResult, `${field}.application.resultSnapshot.result.standardResult`);
  required(application.entityId, `${field}.application.entityId`);
  return { application, result };
};
const compactAttempt = (attempt) => ({ id: attempt.id, status: attempt.status, failureStage: attempt.failureStage, startedAt: attempt.startedAt, completedAt: attempt.completedAt, applicationStatus: attempt.application?.status ?? null });

const buildRound = ({ phase, phaseSnapshot, revisions, attempts, stageResults, events }) => {
  const roundRevisions = revisions.filter((entry) => entry.stage === "alternativeEvaluation" && entry.consensusPhase === phase).sort((left, right) => String(left.occurredAt).localeCompare(String(right.occurredAt)) || left.id.localeCompare(right.id)).map((entry) => ({ id: entry.id, evaluationId: entry.evaluationId, expertId: entry.expertId, action: entry.action, occurredAt: entry.occurredAt, submittedAt: entry.submittedAt, previousRevisionId: entry.previousRevisionId, sourceExecutionAttemptId: entry.sourceExecutionAttemptId }));
  const roundAttempts = attempts.filter((entry) => entry.scope === "issueStage" && entry.evaluationStage === "alternativeEvaluation" && entry.consensusPhase === phase).sort((left, right) => String(left.startedAt).localeCompare(String(right.startedAt)) || left.id.localeCompare(right.id));
  const candidates = roundAttempts.filter((entry) => entry.status === "succeeded" && entry.application?.status === "applied" && entry.application?.entityType === "stageResult").sort((left, right) => String(left.application.completedAt).localeCompare(String(right.application.completedAt)) || String(left.startedAt).localeCompare(String(right.startedAt)) || left.id.localeCompare(right.id));
  const selected = candidates.at(-1) ?? null;
  const currentResults = stageResults.filter((entry) => entry.stage === "alternativeEvaluation" && entry.consensusPhase === phase);
  if (currentResults.length > 1) fail("More than one current stage result exists for an analysis round", "history.evidence.stageResults", { phase });
  const stageResult = currentResults[0] ?? null;
  if (stageResult?.executionAttemptId && !selected) fail("Current stage result references an execution attempt without applied execution evidence", "history.evidence.stageResults", { phase, stageResultId: stageResult.id });
  if (stageResult?.executionAttemptId && stageResult.executionAttemptId !== selected.id) fail("Current stage result execution attempt does not match selected applied execution", "history.evidence.stageResults", { phase, stageResultId: stageResult.id });
  let selectedExecution = null;
  if (selected) {
    const { application, result } = appliedResult(selected, `history.evidence.executionAttempts.${selected.id}`);
    selectedExecution = { attemptId: selected.id, correlationId: selected.correlationId, startedAt: selected.startedAt, completedAt: selected.completedAt, modelContext: clone(selected.modelContext), input: clone(attemptInput(selected, `history.evidence.executionAttempts.${selected.id}`)), result: { standardResult: clone(result.standardResult), modelExecution: clone(result.modelExecution) }, application: { completedAt: application.completedAt, stageResultId: application.entityId } };
  }
  return {
    phase,
    start: phaseSnapshot ? { snapshotId: phaseSnapshot.id, occurredAt: phaseSnapshot.occurredAt, sourceEventId: phaseSnapshot.sourceEventId, sourceExecutionAttemptId: phaseSnapshot.sourceExecutionAttemptId, participants: clone(phaseSnapshot.state.participants), evaluations: clone(phaseSnapshot.state.evaluations), effectiveModelParameters: clone(phaseSnapshot.state.issue.effectiveModelParameters) } : null,
    revisions: roundRevisions,
    executionAttempts: roundAttempts.map(compactAttempt),
    selectedExecution,
    evidenceRefs: { snapshotId: phaseSnapshot?.id ?? null, revisionIds: roundRevisions.map((entry) => entry.id), executionAttemptIds: roundAttempts.map((entry) => entry.id), stageResultId: stageResult?.id ?? null, eventIds: events.filter((entry) => entry.stage === "alternativeEvaluation" && entry.phase === phase).map((entry) => entry.id) },
  };
};

const buildCurrentScenario = (scenario, attemptsById) => {
  const attempt = attemptsById.get(scenario.execution?.attemptId);
  if (!attempt || attempt.scope !== "scenario" || attempt.status !== "succeeded" || attempt.application?.status !== "applied" || attempt.application.entityId !== scenario.id) fail("Current scenario does not have matching applied scenario execution evidence", "history.scenarios.current", { scenarioId: scenario.id, attemptId: scenario.execution?.attemptId ?? null });
  const { result } = appliedResult(attempt, `history.evidence.executionAttempts.${attempt.id}`);
  return { id: scenario.id, name: scenario.name, description: scenario.description, source: clone(scenario.source), targetModelId: scenario.targetModelId, parameterOverrides: clone(scenario.config.parameterOverrides), attemptId: attempt.id, execution: { modelContext: clone(attempt.modelContext), input: clone(attemptInput(attempt, `history.evidence.executionAttempts.${attempt.id}`)), result: { standardResult: clone(result.standardResult), modelExecution: clone(result.modelExecution) } }, createdAt: scenario.createdAt };
};

export const buildAnalysisContext = (history) => {
  const { creation, state, issue: creationIssue, owner, creator } = validateHistory(history);
  const phaseSnapshots = array(history.stateSnapshots.consensusPhaseStarts ?? [], "history.stateSnapshots.consensusPhaseStarts");
  const snapshots = [creation, ...phaseSnapshots];
  const alternatives = array(state.alternatives ?? [], "history.stateSnapshots.creation.state.alternatives");
  const criteria = array(state.criteria ?? [], "history.stateSnapshots.creation.state.criteria");
  const domains = array(state.expressionDomains ?? [], "history.stateSnapshots.creation.state.expressionDomains");
  const revisions = array(history.evidence.evaluationRevisions ?? [], "history.evidence.evaluationRevisions");
  const attempts = array(history.evidence.executionAttempts ?? [], "history.evidence.executionAttempts");
  const stageResults = array(history.evidence.stageResults ?? [], "history.evidence.stageResults");
  const events = array(history.evidence.events ?? [], "history.evidence.events");
  const historicalIdentities = buildHistoricalExperts(snapshots);
  const phaseSnapshotByPhase = new Map(phaseSnapshots.map((entry) => [entry.consensusPhase, entry]));
  const phases = new Set([
    ...phaseSnapshots.map((entry) => entry.consensusPhase),
    ...attempts.filter((entry) => entry.scope === "issueStage" && entry.evaluationStage === "alternativeEvaluation").map((entry) => entry.consensusPhase),
    ...stageResults.filter((entry) => entry.stage === "alternativeEvaluation").map((entry) => entry.consensusPhase),
    ...revisions.filter((entry) => entry.stage === "alternativeEvaluation").map((entry) => entry.consensusPhase),
  ]);
  const rounds = [...phases].filter((phase) => Number.isInteger(phase)).sort((left, right) => left - right).map((phase) => buildRound({ phase, phaseSnapshot: phaseSnapshotByPhase.get(phase) ?? null, revisions, attempts, stageResults, events }));
  const attemptsById = new Map(attempts.map((entry) => [entry.id, entry]));
  const scenarios = array(history.scenarios.current ?? [], "history.scenarios.current").map((entry) => buildCurrentScenario(entry, attemptsById));
  const context = {
    schemaVersion: 1,
    source: { issueHistorySchemaVersion: 1, issueId: history.issueId, completeness: clone(history.completeness) },
    issue: { id: creationIssue.id, name: creationIssue.name, description: creationIssue.description, owner: clone(owner), creator: clone(creator), lifecycle: { active: history.currentState.issue.active, currentStage: history.currentState.issue.currentStage, currentPhase: history.currentState.issue.consensusPhase, finishedAt: history.currentState.issue.finishedAt }, consensus: { enabled: creationIssue.isConsensus, simulated: creationIssue.simulateConsensus, threshold: creationIssue.consensusThreshold, maxPhases: creationIssue.consensusMaxPhases }, evaluationStructureKey: creationIssue.evaluationStructureKey, model: clone(state.model), criteriaWeighting: clone(state.criteriaWeighting) },
    decisionSpace: { alternatives: clone(alternatives), criteria: clone(criteria), expressionDomains: clone(domains) },
    participants: { historicalIdentities: clone(historicalIdentities), current: clone(history.currentState.participants) },
    semanticDirectory: { owner: clone(owner), creator: clone(creator), expertsById: byId(historicalIdentities, (entry) => [entry.id, clone(entry)]), alternativesById: byId(alternatives, (entry) => [entry.id, { id: entry.id, name: entry.name, description: entry.description }]), criteriaById: byId(criteria, (entry) => [entry.id, { id: entry.id, name: entry.name, description: entry.description, type: entry.type, isLeaf: entry.isLeaf, parentCriterionId: entry.parentCriterionId, expressionDomainId: entry.expressionDomainId }]), expressionDomainsById: byId(domains, (entry) => [entry.id, { id: entry.id, name: entry.name, typeKey: entry.typeKey }]) },
    rounds,
    scenarios: { current: scenarios, failedAttempts: attempts.filter((entry) => entry.scope === "scenario" && entry.status === "failed").sort((left, right) => String(left.startedAt).localeCompare(String(right.startedAt)) || left.id.localeCompare(right.id)).map((entry) => ({ attemptId: entry.id, consensusPhase: entry.consensusPhase, failureStage: entry.failureStage, startedAt: entry.startedAt, completedAt: entry.completedAt, error: clone(entry.error) })) },
  };
  return clone(context);
};
