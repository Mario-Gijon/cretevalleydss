import { Alternative } from "../../../models/Alternatives.js";
import { Criterion } from "../../../models/Criteria.js";
import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { IssueExpressionDomain } from "../../../models/IssueExpressionDomains.js";
import { IssueModel } from "../../../models/IssueModels.js";
import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { IssueStateSnapshot } from "../../../models/IssueStateSnapshots.js";
import { Participation } from "../../../models/Participations.js";
import { User } from "../../../models/Users.js";
import { toIdString } from "../../../utils/common/ids.js";
import { createInternalError } from "../../../utils/common/errors.js";

const validateJson = (value, field, seen = new WeakSet()) => {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") { if (Number.isFinite(value)) return; throw createInternalError(`${field} must contain finite numbers only`, { field }); }
  if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") throw createInternalError(`${field} must be JSON-compatible`, { field });
  if (Array.isArray(value)) { value.forEach((entry, index) => validateJson(entry, `${field}[${index}]`, seen)); return; }
  if (typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) throw createInternalError(`${field} must be a plain JSON object`, { field });
  if (seen.has(value)) throw createInternalError(`${field} must not contain circular references`, { field });
  seen.add(value); Object.entries(value).forEach(([key, entry]) => validateJson(entry, `${field}.${key}`, seen)); seen.delete(value);
};
const canonicalize = (value, field, seen = new WeakSet()) => {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    if (seen.has(value)) throw createInternalError(`${field} must not contain circular references`, { field });
    seen.add(value);
    const result = value.map((entry, index) => canonicalize(entry, `${field}[${index}]`, seen));
    seen.delete(value);
    return result;
  }
  if (value && typeof value.toObject === "function") return canonicalize(value.toObject(), field, seen);
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    if (seen.has(value)) throw createInternalError(`${field} must not contain circular references`, { field });
    seen.add(value);
    const result = Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, canonicalize(entry, `${field}.${key}`, seen)]));
    seen.delete(value);
    return result;
  }
  return value;
};
const clone = (value, field) => { const canonical = canonicalize(value, field); validateJson(canonical, field); return JSON.parse(JSON.stringify(canonical)); };
const iso = (value) => value instanceof Date ? value.toISOString() : value ?? null;
const q = (query, session) => session ? query.session(session) : query;
const modelSnapshot = (doc) => doc ? { id: toIdString(doc._id), name: doc.name, apiModelKey: doc.apiModelKey, modelKind: doc.modelKind, apiEndpoint: clone(doc.apiEndpoint ?? null, "model.apiEndpoint"), evaluationStructureKey: doc.evaluationStructureKey ?? null, supportsConsensus: doc.supportsConsensus === true, supportsConsensusSimulation: doc.supportsConsensusSimulation === true, supportsCreatorCriteriaWeighting: doc.supportsCreatorCriteriaWeighting === true, supportsExpertCriteriaWeighting: doc.supportsExpertCriteriaWeighting === true, usesCriteriaWeights: doc.usesCriteriaWeights === true, usesExpertWeights: doc.usesExpertWeights === true, usesFuzzyCriteriaWeights: doc.usesFuzzyCriteriaWeights === true, usesCriterionTypes: doc.usesCriterionTypes === true, supportedExpressionDomains: clone(doc.supportedExpressionDomains ?? [], "model.supportedExpressionDomains"), parameters: clone(doc.parameters ?? [], "model.parameters"), request: clone(doc.request ?? null, "model.request"), response: clone(doc.response ?? null, "model.response"), implementationStatus: doc.implementationStatus ?? null, publicUsable: doc.publicUsable === true, smallDescription: doc.smallDescription ?? null, extendDescription: doc.extendDescription ?? null } : null;
const identitySnapshotOrThrow = ({ user, userId, role }) => {
  if (!user) throw createInternalError(`Issue ${role} identity is required for a creation snapshot`, { field: role === "owner" ? "issue.ownerId" : "issue.createdBy", details: { userId: toIdString(userId) } });
  return { id: toIdString(user._id), name: user.name, email: user.email, university: user.university };
};
export const buildIssueStateSnapshot = async ({ issue, snapshotType, consensusPhase = issue.consensusPhase, criteriaWeightingConfiguration = null, session = null }) => {
  const creationSnapshot = snapshotType === "consensusPhaseStart" ? await q(IssueStateSnapshot.findOne({ issue: issue._id, snapshotType: "creation" }).lean(), session) : null;
  if (snapshotType === "consensusPhaseStart" && !creationSnapshot) throw createInternalError("Issue creation snapshot is required before a consensus phase snapshot", { field: "issue" });
  const [model, criteriaWeightingModel, alternatives, criteria, domains, participations, evaluations, previousStageResult] = await Promise.all([
    snapshotType === "creation" ? q(IssueModel.findById(issue.model).lean(), session) : null, snapshotType === "creation" ? q(IssueModel.findById(issue.criteriaWeightingModel).lean(), session) : null, q(Alternative.find({ issue: issue._id }).sort({ position: 1, _id: 1 }).lean(), session), q(Criterion.find({ issue: issue._id }).sort({ parentCriterion: 1, position: 1, _id: 1 }).lean(), session), q(IssueExpressionDomain.find({ issue: issue._id }).sort({ _id: 1 }).lean(), session), q(Participation.find({ issue: issue._id }).sort({ expert: 1, _id: 1 }).lean(), session), q(IssueEvaluation.find({ issue: issue._id, stage: snapshotType === "consensusPhaseStart" ? "alternativeEvaluation" : issue.currentStage === "criteriaWeighting" ? "criteriaWeighting" : "alternativeEvaluation", consensusPhase }).sort({ expert: 1, _id: 1 }).lean(), session), consensusPhase > 0 ? q(IssueStageResult.findOne({ issue: issue._id, stage: "alternativeEvaluation", consensusPhase: consensusPhase - 1 }).lean(), session) : null,
  ]);
  const identityUserIds = snapshotType === "creation" ? [issue.ownerId, issue.createdBy] : [];
  const users = await q(User.find({ _id: { $in: [...participations.map((p) => p.expert), ...identityUserIds] } }).select("name email university").lean(), session);
  const usersById = new Map(users.map((user) => [toIdString(user._id), user]));
  const owner = snapshotType === "creation"
    ? identitySnapshotOrThrow({ user: usersById.get(toIdString(issue.ownerId)), userId: issue.ownerId, role: "owner" })
    : clone(creationSnapshot.state.issue.owner, "creation.issue.owner");
  const creator = snapshotType === "creation"
    ? identitySnapshotOrThrow({ user: usersById.get(toIdString(issue.createdBy)), userId: issue.createdBy, role: "creator" })
    : clone(creationSnapshot.state.issue.creator, "creation.issue.creator");
  return clone({
    issue: { id: toIdString(issue._id), name: issue.name, description: issue.description, ownerId: toIdString(issue.ownerId), createdBy: toIdString(issue.createdBy), owner, creator, creationDate: issue.creationDate ?? null, closureDate: issue.closureDate ?? null, active: issue.active === true, currentStage: issue.currentStage, consensusPhase, isConsensus: issue.isConsensus === true, supportsConsensus: issue.supportsConsensus === true, simulateConsensus: issue.simulateConsensus === true, consensusThreshold: issue.consensusThreshold ?? null, consensusMaxPhases: issue.consensusMaxPhases ?? null, evaluationStructureKey: issue.evaluationStructureKey, effectiveModelParameters: clone(issue.modelParameters ?? {}, "issue.modelParameters") },
    model: snapshotType === "creation" ? modelSnapshot(model) : clone(creationSnapshot.state.model, "creation.model"),
    criteriaWeighting: { ...(snapshotType === "creation" ? { required: criteriaWeightingConfiguration?.isCriteriaWeightingRequired === true, source: criteriaWeightingConfiguration?.source ?? null, mode: criteriaWeightingConfiguration?.mode ?? null, method: criteriaWeightingConfiguration?.method ?? null, structureKey: issue.criteriaWeightsStructureKey ?? null, model: modelSnapshot(criteriaWeightingModel), apiModelKey: issue.criteriaWeightingApiModelKey ?? null, apiEndpoint: clone(issue.criteriaWeightingApiEndpoint ?? null, "criteriaWeighting.apiEndpoint"), parameters: clone(issue.criteriaWeightingParameters ?? {}, "criteriaWeighting.parameters") } : clone(creationSnapshot.state.criteriaWeighting, "creation.criteriaWeighting")), weightsByCriterionId: clone(issue.modelParameters?.weights ?? {}, "criteriaWeighting.weights") },
    alternatives: alternatives.map((a) => ({ id: toIdString(a._id), name: a.name, description: a.description ?? null, position: a.position })),
    criteria: criteria.map((c) => ({ id: toIdString(c._id), parentCriterionId: toIdString(c.parentCriterion) || null, name: c.name, description: c.description ?? null, type: c.type, isLeaf: c.isLeaf === true, expressionDomainId: toIdString(c.expressionDomain) || null, position: c.position })),
    expressionDomains: domains.map((d) => ({ id: toIdString(d._id), sourceDomainId: toIdString(d.sourceDomain), name: d.name, typeKey: d.typeKey, definition: clone(d.definition ?? {}, "expressionDomain.definition") })),
    participants: participations.map((p) => { const user = usersById.get(toIdString(p.expert)); return { participationId: toIdString(p._id), expert: { id: toIdString(p.expert), name: user?.name ?? null, email: user?.email ?? null, university: user?.university ?? null }, invitationStatus: p.invitationStatus, evaluationCompleted: p.evaluationCompleted === true, weightsCompleted: p.weightsCompleted === true, weight: p.weight ?? null, entryStage: p.entryStage ?? null, entryPhase: p.entryPhase ?? null, joinedAt: iso(p.joinedAt) }; }),
    evaluations: evaluations.map((e) => ({ evaluationId: toIdString(e._id), expertId: toIdString(e.expert), stage: e.stage, consensusPhase: e.consensusPhase, payload: clone(e.payload ?? {}, "evaluation.payload"), completed: e.completed === true, submittedAt: iso(e.submittedAt) })),
    previousPhase: previousStageResult ? { phase: consensusPhase - 1, stageResultId: toIdString(previousStageResult._id), executionAttemptId: toIdString(previousStageResult.executionAttempt) || null, consensusMeasure: previousStageResult.result?.standardResult?.consensusMeasure ?? null, collectiveEvaluations: clone(previousStageResult.result?.standardResult?.collectiveEvaluations ?? null, "previousPhase.collectiveEvaluations"), rankedAlternatives: clone(previousStageResult.result?.standardResult?.rankedAlternatives ?? null, "previousPhase.rankedAlternatives"), modelExecution: clone(previousStageResult.result?.modelExecution ?? null, "previousPhase.modelExecution") } : null,
  }, "snapshot.state");
};
export const writeIssueStateSnapshot = async ({ issue, snapshotType, occurredAt, correlationId, sourceEvent = null, sourceExecutionAttempt = null, consensusPhase = issue.consensusPhase, criteriaWeightingConfiguration = null, session = null }) => IssueStateSnapshot.create([{ issue: issue._id, snapshotType, stage: issue.currentStage, consensusPhase, occurredAt, correlationId, sourceEvent, sourceExecutionAttempt, state: await buildIssueStateSnapshot({ issue, snapshotType, consensusPhase, criteriaWeightingConfiguration, session }), schemaVersion: 1 }], { session }).then(([snapshot]) => snapshot);
