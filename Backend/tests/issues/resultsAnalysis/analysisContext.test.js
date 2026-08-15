import { describe, expect, it } from "vitest";

import { buildAnalysisContext } from "../../../modules/issues/resultsAnalysis/index.js";

const time = (second) => `2026-01-01T00:00:0${second}.000Z`;
const identity = (id, name, email, university) => ({ id, name, email, university });
const request = (expertId, payload) => ({ body: { modelParameters: { weights: { "criterion-cost": 0.65, "criterion-speed": 0.35 } }, evaluations: [{ expert: { id: expertId, name: "Expert One", email: "expert@example.com" }, payload }], context: { issue: { id: "issue-1" }, criteria: [{ id: "criterion-cost" }, { id: "criterion-speed" }] } } });
const applied = (entityId, standardResult, modelExecution = {}) => ({ status: "applied", entityType: "stageResult", entityId, completedAt: time(9), resultSnapshot: { result: { standardResult, modelExecution } } });

const history = () => ({
  schemaVersion: 1,
  issueId: "issue-1",
  completeness: { creationSnapshot: { status: "exact" }, historicalIdentityPreservation: { status: "partial" }, scenarioDeletionHistory: { status: "unavailable" } },
  stateSnapshots: {
    creation: { id: "creation", snapshotType: "creation", consensusPhase: 0, occurredAt: time(0), state: { issue: { id: "issue-1", name: "Frozen Issue", description: "Frozen description", ownerId: "owner-1", createdBy: "creator-1", owner: identity("owner-1", "Owner", "owner@example.com", "Owner U"), creator: identity("creator-1", "Creator", "creator@example.com", "Creator U"), isConsensus: true, simulateConsensus: true, consensusThreshold: 0.8, consensusMaxPhases: 3, evaluationStructureKey: "alternativeCriteriaMatrix", effectiveModelParameters: { weights: { "criterion-cost": 0.65, "criterion-speed": 0.35 } } }, model: { id: "model-1", name: "Frozen model" }, criteriaWeighting: { mode: "creatorManual", weightsByCriterionId: { "criterion-cost": 0.65, "criterion-speed": 0.35 } }, alternatives: [{ id: "alternative-a", name: "Alpha", description: "First" }, { id: "alternative-b", name: "Beta", description: null }], criteria: [{ id: "criterion-cost", name: "Cost", description: null, type: "cost", isLeaf: true, parentCriterionId: "root", expressionDomainId: "domain-1" }, { id: "criterion-speed", name: "Speed", description: null, type: "benefit", isLeaf: true, parentCriterionId: "root", expressionDomainId: "domain-1" }], expressionDomains: [{ id: "domain-1", name: "Ratings", typeKey: "numericDiscrete", definition: { min: 1, max: 9 } }], participants: [{ expert: identity("expert-1", "Expert One", "expert@example.com", "Expert U") }] } },
    consensusPhaseStarts: [
      { id: "phase-0", snapshotType: "consensusPhaseStart", consensusPhase: 0, occurredAt: time(1), sourceEventId: "event-0", sourceExecutionAttemptId: null, state: { issue: { effectiveModelParameters: { weights: { "criterion-cost": 0.65, "criterion-speed": 0.35 } } }, participants: [{ expert: identity("expert-1", "Expert One", "expert@example.com", "Expert U") }], evaluations: [] } },
      { id: "phase-1", snapshotType: "consensusPhaseStart", consensusPhase: 1, occurredAt: time(4), sourceEventId: "event-1", sourceExecutionAttemptId: "attempt-0", state: { issue: { effectiveModelParameters: { weights: { "criterion-cost": 0.65, "criterion-speed": 0.35 } } }, participants: [{ expert: identity("expert-1", "Expert One", "changed@example.com", "Expert U") }], evaluations: [] } },
    ],
  },
  currentState: { issue: { active: false, currentStage: "finished", consensusPhase: 1, finishedAt: time(9), name: "Mutable name" }, participants: [{ id: "participation-1", expertId: "expert-1", invitationStatus: "accepted" }] },
  evidence: {
    evaluationRevisions: [{ id: "revision-0", evaluationId: "evaluation-0", expertId: "expert-1", stage: "alternativeEvaluation", consensusPhase: 0, action: "draftSaved", occurredAt: time(2), submittedAt: null, previousRevisionId: null, sourceExecutionAttemptId: null }, { id: "revision-1", evaluationId: "evaluation-0", expertId: "expert-1", stage: "alternativeEvaluation", consensusPhase: 0, action: "submitted", occurredAt: time(3), submittedAt: time(3), previousRevisionId: "revision-0", sourceExecutionAttemptId: null }, { id: "revision-2", evaluationId: "evaluation-1", expertId: "expert-1", stage: "alternativeEvaluation", consensusPhase: 1, action: "generated", occurredAt: time(5), submittedAt: null, previousRevisionId: null, sourceExecutionAttemptId: "attempt-0" }],
    executionAttempts: [
      { id: "attempt-0", scope: "issueStage", evaluationStage: "alternativeEvaluation", consensusPhase: 0, status: "succeeded", failureStage: null, correlationId: "round-0", startedAt: time(3), completedAt: time(4), modelContext: { apiModelKey: "frozen" }, request: request("expert-1", { "alternative-a": { "criterion-cost": 8, "criterion-speed": 3 }, "alternative-b": { "criterion-cost": 3, "criterion-speed": 8 } }), application: applied("stage-result-0", { consensusMeasure: 0.4 }, { consensusLifecycle: { finalizationReason: null } }) },
      { id: "attempt-1", scope: "issueStage", evaluationStage: "alternativeEvaluation", consensusPhase: 1, status: "succeeded", failureStage: null, correlationId: "round-1", startedAt: time(6), completedAt: time(7), modelContext: { apiModelKey: "frozen" }, request: request("expert-1", { "alternative-a": { "criterion-cost": 7, "criterion-speed": 4 }, "alternative-b": { "criterion-cost": 4, "criterion-speed": 7 } }), application: applied("stage-result-1", { consensusMeasure: 0.95 }, { consensusLifecycle: { finalizationReason: "consensusReached" } }) },
      { id: "scenario-success", scope: "scenario", evaluationStage: "alternativeEvaluation", consensusPhase: 1, status: "succeeded", failureStage: null, correlationId: "scenario", startedAt: time(8), completedAt: time(9), modelContext: { apiModelKey: "scenario-model" }, request: request("expert-1", { "alternative-a": { "criterion-cost": 7 } }), application: { ...applied("scenario-1", { rankedAlternatives: [] }), entityType: "scenario" } },
      { id: "scenario-failed", scope: "scenario", evaluationStage: "alternativeEvaluation", consensusPhase: 1, status: "failed", failureStage: "transport", correlationId: "failed-scenario", startedAt: time(7), completedAt: time(8), modelContext: {}, request: request("expert-1", {}), error: { message: "failed" }, application: { status: "notApplicable" } },
    ],
    stageResults: [{ id: "stage-result-0", stage: "alternativeEvaluation", consensusPhase: 0, executionAttemptId: "attempt-0" }, { id: "stage-result-1", stage: "alternativeEvaluation", consensusPhase: 1, executionAttemptId: "attempt-1" }],
    events: [{ id: "event-0", stage: "alternativeEvaluation", phase: 0 }, { id: "event-1", stage: "alternativeEvaluation", phase: 1 }],
  },
  scenarios: { current: [{ id: "scenario-1", name: "Kept scenario", description: "Current", source: { consensusPhase: 1, stageResultId: "stage-result-1", domainType: "numeric" }, targetModelId: "model-1", config: { parameterOverrides: { weights: { "criterion-cost": 0.65, "criterion-speed": 0.35 } } }, execution: { attemptId: "scenario-success" }, createdAt: time(8) }] },
});

describe("buildAnalysisContext", () => {
  it("builds a deterministic detached semantic context from frozen history evidence", () => {
    const input = history();
    const first = buildAnalysisContext(input);
    const second = buildAnalysisContext(structuredClone(input));
    expect(second).toEqual(first);
    expect(first.issue).toMatchObject({ name: "Frozen Issue", owner: identity("owner-1", "Owner", "owner@example.com", "Owner U"), creator: identity("creator-1", "Creator", "creator@example.com", "Creator U"), lifecycle: { active: false, currentStage: "finished", currentPhase: 1 }, model: { name: "Frozen model" } });
    expect(first.semanticDirectory.alternativesById["alternative-a"]).toEqual({ id: "alternative-a", name: "Alpha", description: "First" });
    expect(first.semanticDirectory.criteriaById["criterion-cost"].name).toBe("Cost");
    expect(first.participants.historicalIdentities).toEqual([expect.objectContaining({ id: "expert-1", firstSeenSnapshotId: "creation", firstSeenPhase: 0, identityChangedInLaterSnapshot: true })]);
    expect(first.rounds.map((round) => round.phase)).toEqual([0, 1]);
    expect(first.rounds[0].selectedExecution.input.evaluations[0].payload["alternative-a"]["criterion-cost"]).toBe(8);
    expect(first.rounds[1].selectedExecution.result.standardResult.consensusMeasure).toBe(0.95);
    expect(first.scenarios.current[0]).toMatchObject({ id: "scenario-1", attemptId: "scenario-success", execution: { modelContext: { apiModelKey: "scenario-model" } } });
    expect(first.scenarios.failedAttempts).toEqual([expect.objectContaining({ attemptId: "scenario-failed", failureStage: "transport" })]);
    first.issue.owner.name = "Changed";
    first.semanticDirectory.criteriaById["criterion-cost"].name = "Changed";
    expect(input.stateSnapshots.creation.state.issue.owner.name).toBe("Owner");
    expect(input.stateSnapshots.creation.state.criteria[0].name).toBe("Cost");
  });

  it("rejects inconsistent frozen owner identity evidence", () => {
    const input = history();
    input.stateSnapshots.creation.state.issue.owner.id = "wrong-owner";
    expect(() => buildAnalysisContext(input)).toThrow(/owner identity does not match ownerId/);
  });
});
