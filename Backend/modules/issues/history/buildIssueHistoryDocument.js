import mongoose from "mongoose";

import { ExitUserIssue } from "../../../models/ExitUserIssue.js";
import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { IssueEvaluationRevision } from "../../../models/IssueEvaluationRevisions.js";
import { IssueEvent } from "../../../models/IssueEvents.js";
import { IssueExecutionAttempt } from "../../../models/IssueExecutionAttempts.js";
import { IssueScenario } from "../../../models/IssueScenarios.js";
import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { IssueStateSnapshot } from "../../../models/IssueStateSnapshots.js";
import { Issue } from "../../../models/Issues.js";
import { Notification } from "../../../models/Notifications.js";
import { Participation } from "../../../models/Participations.js";
import { createBadRequestError, createInternalError } from "../../../utils/common/errors.js";
import { applyOptionalSession } from "../../../utils/common/mongoose.js";

const id = (value) => value == null ? null : String(value);
const read = (query, session) => applyOptionalSession(query, session);
const time = (value) => value instanceof Date ? value.toISOString() : value;

const canonicalize = (value, field, seen = new WeakSet()) => {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (Number.isFinite(value)) return value;
    throw createInternalError(`${field} must contain finite numbers only`, { field });
  }
  if (typeof value === "undefined" || typeof value === "bigint" || typeof value === "function" || typeof value === "symbol") {
    throw createInternalError(`${field} must be JSON-compatible`, { field });
  }
  if (value instanceof Date) return value.toISOString();
  if (value instanceof mongoose.Types.ObjectId || value?._bsontype === "ObjectId") return String(value);
  if (Array.isArray(value)) {
    if (seen.has(value)) throw createInternalError(`${field} must not contain circular references`, { field });
    seen.add(value);
    const result = value.map((entry, index) => canonicalize(entry, `${field}[${index}]`, seen));
    seen.delete(value);
    return result;
  }
  if (typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    throw createInternalError(`${field} must be a plain JSON object`, { field });
  }
  if (seen.has(value)) throw createInternalError(`${field} must not contain circular references`, { field });
  seen.add(value);
  const result = Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, canonicalize(entry, `${field}.${key}`, seen)]));
  seen.delete(value);
  return result;
};

const serializeSnapshot = (snapshot) => ({
  id: id(snapshot._id), snapshotType: snapshot.snapshotType, stage: snapshot.stage,
  consensusPhase: snapshot.consensusPhase, occurredAt: snapshot.occurredAt,
  correlationId: snapshot.correlationId, sourceEventId: id(snapshot.sourceEvent),
  sourceExecutionAttemptId: id(snapshot.sourceExecutionAttempt), schemaVersion: snapshot.schemaVersion,
  createdAt: snapshot.createdAt, state: snapshot.state,
});
const serializeIssue = (issue) => ({
  id: id(issue._id), ownerId: id(issue.ownerId), createdBy: id(issue.createdBy), modelId: id(issue.model),
  apiModelKey: issue.apiModelKey, apiEndpoint: issue.apiEndpoint, name: issue.name,
  description: issue.description, isConsensus: issue.isConsensus, supportsConsensus: issue.supportsConsensus,
  simulateConsensus: issue.simulateConsensus, criteriaWeightsStructureKey: issue.criteriaWeightsStructureKey,
  criteriaWeightingModelId: id(issue.criteriaWeightingModel), criteriaWeightingApiModelKey: issue.criteriaWeightingApiModelKey,
  criteriaWeightingApiEndpoint: issue.criteriaWeightingApiEndpoint, criteriaWeightingParameters: issue.criteriaWeightingParameters,
  evaluationStructureKey: issue.evaluationStructureKey, consensusMaxPhases: issue.consensusMaxPhases,
  consensusThreshold: issue.consensusThreshold, active: issue.active, creationDate: issue.creationDate,
  closureDate: issue.closureDate, finishedAt: issue.finishedAt, modelParameters: issue.modelParameters,
  currentStage: issue.currentStage, consensusPhase: issue.consensusPhase, createdAt: issue.createdAt, updatedAt: issue.updatedAt,
});
const serializeParticipation = (entry) => ({ id: id(entry._id), expertId: id(entry.expert), invitationStatus: entry.invitationStatus, evaluationCompleted: entry.evaluationCompleted, weightsCompleted: entry.weightsCompleted, weight: entry.weight, entryPhase: entry.entryPhase, entryStage: entry.entryStage, joinedAt: entry.joinedAt, createdAt: entry.createdAt, updatedAt: entry.updatedAt });
const serializeEvaluation = (entry) => ({ id: id(entry._id), expertId: id(entry.expert), stage: entry.stage, consensusPhase: entry.consensusPhase, payload: entry.payload, completed: entry.completed, submittedAt: entry.submittedAt, createdAt: entry.createdAt, updatedAt: entry.updatedAt });
const serializeNotification = (entry) => ({ id: id(entry._id), expertId: id(entry.expert), type: entry.type, message: entry.message, requiresAction: entry.requiresAction, actionTaken: entry.actionTaken, read: entry.read, createdAt: entry.createdAt });
const serializeEvent = (entry) => ({ id: id(entry._id), eventType: entry.eventType, actorType: entry.actorType, actorUserId: id(entry.actorUser), subjectUserId: id(entry.subjectUser), entityType: entry.entityType, entityId: id(entry.entityId), stage: entry.stage, phase: entry.phase, occurredAt: entry.occurredAt, correlationId: entry.correlationId, reason: entry.reason, previousState: entry.previousState, nextState: entry.nextState, details: entry.details, schemaVersion: entry.schemaVersion, createdAt: entry.createdAt });
const serializeRevision = (entry) => ({ id: id(entry._id), evaluationId: id(entry.evaluation), expertId: id(entry.expert), actorType: entry.actorType, actorUserId: id(entry.actorUser), stage: entry.stage, consensusPhase: entry.consensusPhase, action: entry.action, structureKey: entry.structureKey, rawPayload: entry.rawPayload, normalizedPayload: entry.normalizedPayload, decisionContext: entry.decisionContext, previousRevisionId: id(entry.previousRevision), submittedAt: entry.submittedAt, occurredAt: entry.occurredAt, correlationId: entry.correlationId, sourceExecutionAttemptId: id(entry.sourceExecutionAttempt), schemaVersion: entry.schemaVersion, createdAt: entry.createdAt });
const serializeAttempt = (entry) => ({ id: id(entry._id), scope: entry.scope, actorType: entry.actorType, actorUserId: id(entry.actorUser), correlationId: entry.correlationId, evaluationStage: entry.evaluationStage, issueStage: entry.issueStage, consensusPhase: entry.consensusPhase, modelContext: entry.modelContext, request: entry.request, status: entry.status, failureStage: entry.failureStage, startedAt: entry.startedAt, responseReceivedAt: entry.responseReceivedAt, completedAt: entry.completedAt, durationMs: entry.durationMs, transportDurationMs: entry.transportDurationMs, response: entry.response, normalizedResult: entry.normalizedResult, error: entry.error, application: entry.application, schemaVersion: entry.schemaVersion, createdAt: entry.createdAt, updatedAt: entry.updatedAt });
const serializeStageResult = (entry) => ({ id: id(entry._id), stage: entry.stage, consensusPhase: entry.consensusPhase, executionAttemptId: id(entry.executionAttempt), inputSnapshot: entry.inputSnapshot, result: entry.result, createdAt: entry.createdAt, updatedAt: entry.updatedAt });
const serializeExitHistory = (entry) => ({ id: id(entry._id), userId: id(entry.user), hidden: entry.hidden, timestamp: entry.timestamp, phase: entry.phase, stage: entry.stage, reason: entry.reason, history: entry.history.map((item) => ({ timestamp: item.timestamp, phase: item.phase, stage: item.stage, action: item.action, reason: item.reason })), createdAt: entry.createdAt, updatedAt: entry.updatedAt });

const cloneScenarioValue = (value, field, fallback = {}) => {
  if (value === undefined || value === null) return fallback;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    throw createInternalError(`${field} must be JSON-compatible`, { field });
  }
};

const omitUndefined = (value) => Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));

const serializeScenarioPhaseResult = (phaseResult) => {
  const standardResult = cloneScenarioValue(phaseResult?.result?.standardResult, "scenario.phaseResults.result.standardResult");
  const modelExecution = cloneScenarioValue(phaseResult?.result?.modelExecution, "scenario.phaseResults.result.modelExecution");
  const rawOutput = cloneScenarioValue(phaseResult?.result?.rawOutput, "scenario.phaseResults.result.rawOutput");
  return {
    phase: Number.isInteger(phaseResult?.phase) && phaseResult.phase >= 0 ? phaseResult.phase : 0,
    source: omitUndefined({
      stageResultId: id(phaseResult?.source?.stageResult),
      domainType: phaseResult?.source?.domainType,
    }),
    requestSnapshot: cloneScenarioValue(phaseResult?.requestSnapshot, "scenario.phaseResults.requestSnapshot"),
    result: { standardResult, modelExecution, rawOutput },
    execution: {
      attemptId: id(phaseResult?.execution?.attemptId),
      startedAt: time(phaseResult?.execution?.startedAt ?? null),
      completedAt: time(phaseResult?.execution?.completedAt ?? null),
    },
  };
};

const serializeScenario = (entry) => {
  const storedPhaseResults = Array.isArray(entry.phaseResults)
    ? entry.phaseResults.filter((phaseResult) => Number.isInteger(phaseResult?.phase) && phaseResult.phase >= 0)
    : [];
  const phaseResults = storedPhaseResults.length
    ? storedPhaseResults.map((phaseResult) => serializeScenarioPhaseResult(phaseResult))
    : [serializeScenarioPhaseResult({
        phase: Number.isInteger(entry.source?.consensusPhase) && entry.source.consensusPhase >= 0 ? entry.source.consensusPhase : 0,
        source: entry.source,
        requestSnapshot: entry.requestSnapshot,
        result: entry.result,
        execution: entry.execution,
      })];

  phaseResults.sort((left, right) => left.phase - right.phase);
  return omitUndefined({
    id: id(entry._id),
    createdById: id(entry.createdBy),
    name: entry.name,
    description: entry.description,
    targetModelId: id(entry.targetModel),
    config: { parameterOverrides: cloneScenarioValue(entry.config?.parameterOverrides, "scenario.config.parameterOverrides") },
    phaseResults,
    createdAt: time(entry.createdAt ?? null),
    updatedAt: time(entry.updatedAt ?? null),
  });
};

const completeness = Object.freeze({
  creationSnapshot: { status: "exact" }, consensusPhaseStartSnapshots: { status: "exact" },
  issueEvents: { status: "exact" }, evaluationRevisions: { status: "exact" }, executionAttempts: { status: "exact" },
  stageResults: { status: "currentProjection" }, currentIssueState: { status: "currentProjection" },
  currentParticipants: { status: "currentProjection" }, currentEvaluations: { status: "currentProjection" },
  currentNotifications: { status: "currentProjection" }, currentScenarios: { status: "currentProjection" },
  participantExitHistory: { status: "partial" }, historicalIdentityPreservation: { status: "partial" },
  scenarioDeletionHistory: { status: "unavailable" }, decisionModelCodeProvenance: { status: "unavailable" }, dependencyEnvironmentProvenance: { status: "unavailable" },
});

const buildTimeline = ({ snapshots, events, revisions, attempts, stageResults, scenarios, exits }) => {
  const entries = [
    ...snapshots.map((entry) => ({ occurredAt: time(entry.occurredAt), kind: "stateSnapshot", refId: entry.id, stage: entry.stage, phase: entry.consensusPhase, correlationId: entry.correlationId })),
    ...events.map((entry) => ({ occurredAt: time(entry.occurredAt), kind: "issueEvent", refId: entry.id, stage: entry.stage, phase: entry.phase, correlationId: entry.correlationId })),
    ...revisions.map((entry) => ({ occurredAt: time(entry.occurredAt), kind: "evaluationRevision", refId: entry.id, stage: entry.stage, phase: entry.consensusPhase, correlationId: entry.correlationId })),
    ...attempts.map((entry) => ({ occurredAt: time(entry.startedAt), kind: "executionAttempt", refId: entry.id, stage: entry.issueStage, phase: entry.consensusPhase, correlationId: entry.correlationId })),
    ...stageResults.map((entry) => ({ occurredAt: time(entry.createdAt), kind: "stageResult", refId: entry.id, stage: entry.stage, phase: entry.consensusPhase, correlationId: null })),
    ...scenarios.map((entry) => ({ occurredAt: time(entry.createdAt), kind: "scenario", refId: entry.id, stage: null, phase: null, correlationId: null })),
    ...exits.flatMap((entry) => entry.history.map((history, index) => ({ occurredAt: time(history.timestamp), kind: "participantExitHistory", refId: `${entry.id}:history:${index}`, stage: history.stage, phase: history.phase, correlationId: null }))),
  ];
  return entries.sort((left, right) => left.occurredAt.localeCompare(right.occurredAt) || left.kind.localeCompare(right.kind) || left.refId.localeCompare(right.refId));
};

const validateTimelineReferences = ({ timeline, snapshots, events, revisions, attempts, stageResults, scenarios, exits }) => {
  const ids = new Map([
    ["stateSnapshot", new Set(snapshots.map((entry) => entry.id))], ["issueEvent", new Set(events.map((entry) => entry.id))],
    ["evaluationRevision", new Set(revisions.map((entry) => entry.id))], ["executionAttempt", new Set(attempts.map((entry) => entry.id))],
    ["stageResult", new Set(stageResults.map((entry) => entry.id))], ["scenario", new Set(scenarios.map((entry) => entry.id))],
    ["participantExitHistory", new Set(exits.flatMap((entry) => entry.history.map((_, index) => `${entry.id}:history:${index}`)))],
  ]);
  for (const entry of timeline) if (!ids.get(entry.kind)?.has(entry.refId)) throw createInternalError("Issue history timeline contains a dangling reference", { field: "timeline", details: entry });
};

export const buildIssueHistoryDocument = async ({ issueId, session = null }) => {
  const issue = await read(Issue.findById(issueId).lean(), session);
  if (!issue) throw createBadRequestError("Issue does not exist", { field: "issueId" });
  const creation = await read(IssueStateSnapshot.findOne({ issue: issue._id, snapshotType: "creation" }).lean(), session);
  const phaseSnapshots = await read(IssueStateSnapshot.find({ issue: issue._id, snapshotType: "consensusPhaseStart" }).sort({ consensusPhase: 1, occurredAt: 1, _id: 1 }).lean(), session);
  const participations = await read(Participation.find({ issue: issue._id }).sort({ expert: 1, _id: 1 }).lean(), session);
  const evaluations = await read(IssueEvaluation.find({ issue: issue._id }).sort({ stage: 1, consensusPhase: 1, expert: 1, _id: 1 }).lean(), session);
  const notifications = await read(Notification.find({ issue: issue._id }).sort({ createdAt: 1, _id: 1 }).lean(), session);
  const events = await read(IssueEvent.find({ issue: issue._id }).sort({ occurredAt: 1, _id: 1 }).lean(), session);
  const revisions = await read(IssueEvaluationRevision.find({ issue: issue._id }).sort({ occurredAt: 1, _id: 1 }).lean(), session);
  const attempts = await read(IssueExecutionAttempt.find({ issue: issue._id }).sort({ startedAt: 1, _id: 1 }).lean(), session);
  const stageResults = await read(IssueStageResult.find({ issue: issue._id }).sort({ stage: 1, consensusPhase: 1, _id: 1 }).lean(), session);
  const exits = await read(ExitUserIssue.find({ issue: issue._id }).sort({ user: 1, _id: 1 }).lean(), session);
  const scenarios = await read(IssueScenario.find({ issue: issue._id }).sort({ createdAt: 1, _id: 1 }).lean(), session);
  if (!creation) throw createInternalError("Issue creation snapshot is required for history", { field: "issueId", details: { issueId: id(issue._id) } });
  const serializedSnapshots = [serializeSnapshot(creation), ...phaseSnapshots.map(serializeSnapshot)];
  const serializedExits = exits.map((entry) => {
    const serialized = serializeExitHistory(entry);
    return {
      ...serialized,
      history: serialized.history
        .map((item, index) => ({ item, index }))
        .sort((left, right) => new Date(left.item.timestamp) - new Date(right.item.timestamp) || left.index - right.index)
        .map(({ item }) => item),
    };
  });
  const dossier = {
    schemaVersion: 1, issueId: id(issue._id), completeness,
    stateSnapshots: { creation: serializedSnapshots[0], consensusPhaseStarts: serializedSnapshots.slice(1) },
    currentState: { issue: serializeIssue(issue), participants: participations.map(serializeParticipation), evaluations: evaluations.map(serializeEvaluation), notifications: notifications.map(serializeNotification) },
    evidence: { events: events.map(serializeEvent), evaluationRevisions: revisions.map(serializeRevision), executionAttempts: attempts.map(serializeAttempt), stageResults: stageResults.map(serializeStageResult), participantExitHistory: serializedExits },
    scenarios: { current: scenarios.map(serializeScenario) },
  };
  dossier.timeline = buildTimeline({ snapshots: serializedSnapshots, events: dossier.evidence.events, revisions: dossier.evidence.evaluationRevisions, attempts: dossier.evidence.executionAttempts, stageResults: dossier.evidence.stageResults, scenarios: dossier.scenarios.current, exits: serializedExits });
  const canonical = canonicalize(dossier, "issueHistoryDocument");
  validateTimelineReferences({ timeline: canonical.timeline, snapshots: [canonical.stateSnapshots.creation, ...canonical.stateSnapshots.consensusPhaseStarts], events: canonical.evidence.events, revisions: canonical.evidence.evaluationRevisions, attempts: canonical.evidence.executionAttempts, stageResults: canonical.evidence.stageResults, scenarios: canonical.scenarios.current, exits: canonical.evidence.participantExitHistory });
  return canonical;
};
