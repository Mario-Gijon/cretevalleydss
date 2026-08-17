import { describe, expect, it } from "vitest";

import { buildAnalysisContext } from "../../../modules/issues/resultsAnalysis/index.js";
import { AppError } from "../../../utils/common/errors.js";

const time = (second) => `2026-01-01T00:00:0${second}.000Z`;
const identity = (id, name, email, university) => ({ id, name, email, university });
const request = (expertId, payload) => ({ body: { modelParameters: { weights: { "criterion-cost": 0.65, "criterion-speed": 0.35 } }, evaluations: [{ expert: { id: expertId, name: "Expert One", email: "expert@example.com" }, payload }], context: { issue: { id: "issue-1" }, criteria: [{ id: "criterion-cost" }, { id: "criterion-speed" }] } } });
const applied = (entityId, standardResult, modelExecution = {}, rawOutput = undefined) => ({ status: "applied", entityType: "stageResult", entityId, completedAt: time(9), resultSnapshot: { result: { standardResult, modelExecution, rawOutput } } });
const appliedScenario = (entityId, phase, attemptId, standardResult, modelExecution = {}, rawOutput = undefined) => ({ status: "applied", entityType: "scenario", entityId, completedAt: time(9), resultSnapshot: { phaseResults: [{ phase, execution: { attemptId }, result: { standardResult, modelExecution, rawOutput } }] } });

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
      { id: "scenario-success", scope: "scenario", evaluationStage: "alternativeEvaluation", consensusPhase: 1, status: "succeeded", failureStage: null, correlationId: "scenario", startedAt: time(8), completedAt: time(9), modelContext: { apiModelKey: "scenario-model" }, request: request("expert-1", { "alternative-a": { "criterion-cost": 7 } }), application: appliedScenario("scenario-1", 1, "scenario-success", { rankedAlternatives: [] }) },
      { id: "scenario-failed", scope: "scenario", evaluationStage: "alternativeEvaluation", consensusPhase: 1, status: "failed", failureStage: "transport", correlationId: "failed-scenario", startedAt: time(7), completedAt: time(8), modelContext: {}, request: request("expert-1", {}), error: { message: "failed" }, application: { status: "notApplicable" } },
    ],
    stageResults: [{ id: "stage-result-0", stage: "alternativeEvaluation", consensusPhase: 0, executionAttemptId: "attempt-0" }, { id: "stage-result-1", stage: "alternativeEvaluation", consensusPhase: 1, executionAttemptId: "attempt-1" }],
    events: [{ id: "event-0", stage: "alternativeEvaluation", phase: 0 }, { id: "event-1", stage: "alternativeEvaluation", phase: 1 }],
  },
  scenarios: { current: [{ id: "scenario-1", name: "Kept scenario", description: "Current", targetModelId: "model-1", config: { parameterOverrides: { weights: { "criterion-cost": 0.65, "criterion-speed": 0.35 } } }, phaseResults: [{ phase: 1, source: { stageResultId: "stage-result-1", domainType: "numeric" }, execution: { attemptId: "scenario-success" } }], createdAt: time(8) }] },
});

describe("buildAnalysisContext", () => {
  it("builds ordered canonical scenario phase contexts from aggregate applied evidence", () => {
    const input = history();
    input.evidence.executionAttempts.push({
      ...structuredClone(input.evidence.executionAttempts[2]),
      id: "scenario-success-0",
      consensusPhase: 0,
      application: appliedScenario("scenario-1", 0, "scenario-success-0", { rankedAlternatives: [{ phase: 0 }] }, { phase: 0 }),
    });
    input.scenarios.current[0].phaseResults.unshift({ phase: 0, source: { stageResultId: "stage-result-0", domainType: "numeric" }, execution: { attemptId: "scenario-success-0" } });

    const scenario = buildAnalysisContext(input).scenarios.current[0];
    expect(scenario.phaseResults.map((entry) => entry.phase)).toEqual([0, 1]);
    expect(scenario.phaseResults[0]).toMatchObject({ attemptId: "scenario-success-0", execution: { result: { standardResult: { rankedAlternatives: [{ phase: 0 }] } } } });
    expect(scenario.phaseResults[1]).toMatchObject({ attemptId: "scenario-success", execution: { result: { standardResult: { rankedAlternatives: [] } } } });
  });

  it("rejects missing, mismatched, or unapplied canonical scenario phase evidence", () => {
    const missing = history();
    missing.scenarios.current[0].phaseResults[0].execution.attemptId = "missing";
    expect(() => buildAnalysisContext(missing)).toThrow(/matching applied scenario execution evidence/);

    const wrongPhase = history();
    wrongPhase.scenarios.current[0].phaseResults[0].phase = 0;
    expect(() => buildAnalysisContext(wrongPhase)).toThrow(/matching applied scenario execution evidence/);

    const unapplied = history();
    unapplied.evidence.executionAttempts[2].application.status = "pending";
    expect(() => buildAnalysisContext(unapplied)).toThrow(/matching applied scenario execution evidence/);
  });

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
    expect(first.scenarios.current[0]).toMatchObject({ id: "scenario-1", phaseResults: [{ phase: 1, attemptId: "scenario-success", execution: { modelContext: { apiModelKey: "scenario-model" } } }] });
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

  it("keeps persisted raw output separate from semantic results while preserving exact execution input and metadata", () => {
    const input = history();
    input.evidence.executionAttempts[1].application.resultSnapshot.result.standardResult = { consensusMeasure: 0.95, rawOutput: { internal: true } };
    input.evidence.executionAttempts[1].application.resultSnapshot.result.rawOutput = { model: "base", matrix: [[0.95]] };
    input.evidence.executionAttempts[1].application.resultSnapshot.result.modelExecution = { consensusLifecycle: { finalizationReason: "consensusReached" }, timing: { milliseconds: 17 } };
    input.evidence.executionAttempts[1].request.body.context.rawOutput = { requestEvidence: true };
    input.evidence.executionAttempts[2].application.resultSnapshot.phaseResults[0].result.standardResult = { rankedAlternatives: [], rawOutput: { internal: true } };
    input.evidence.executionAttempts[2].application.resultSnapshot.phaseResults[0].result.rawOutput = { model: "scenario", tupleScores: [["s7", 0.25]] };
    input.evidence.executionAttempts[2].application.resultSnapshot.phaseResults[0].result.modelExecution = { provider: "scenario-provider", timing: { milliseconds: 23 } };

    const context = buildAnalysisContext(input);
    expect(context.rounds[1].selectedExecution.result.standardResult).toEqual({ consensusMeasure: 0.95 });
    expect(context.rounds[1].selectedExecution.result.standardResult).not.toHaveProperty("rawOutput");
    expect(context.rounds[1].selectedExecution.result.rawOutput).toEqual({ model: "base", matrix: [[0.95]] });
    expect(context.rounds[1].selectedExecution.result.modelExecution).toEqual({ consensusLifecycle: { finalizationReason: "consensusReached" }, timing: { milliseconds: 17 } });
    expect(context.rounds[1].selectedExecution.input.context.rawOutput).toEqual({ requestEvidence: true });
    expect(context.scenarios.current[0].phaseResults[0].execution.result.standardResult).toEqual({ rankedAlternatives: [] });
    expect(context.scenarios.current[0].phaseResults[0].execution.result.standardResult).not.toHaveProperty("rawOutput");
    expect(context.scenarios.current[0].phaseResults[0].execution.result.rawOutput).toEqual({ model: "scenario", tupleScores: [["s7", 0.25]] });
    expect(context.scenarios.current[0].phaseResults[0].execution.result.rawOutput).not.toEqual(context.rounds[1].selectedExecution.result.rawOutput);
    expect(context.scenarios.current[0].phaseResults[0].execution.result.modelExecution).toEqual({ provider: "scenario-provider", timing: { milliseconds: 23 } });
    expect(input.evidence.executionAttempts[1].application.resultSnapshot.result.standardResult.rawOutput).toEqual({ internal: true });
    expect(input.evidence.executionAttempts[2].application.resultSnapshot.phaseResults[0].result.standardResult.rawOutput).toEqual({ internal: true });
  });

  it("selects the final recomputation by application completion, start time, and id while retaining all attempts", () => {
    const input = history();
    const base = input.evidence.executionAttempts[1];
    const recomputation = (id, completedAt, startedAt, marker) => ({
      ...structuredClone(base), id, correlationId: id, startedAt, completedAt: time(9),
      request: request("expert-1", { marker }),
      application: { ...applied("stage-result-1", { marker }, { apiModelKey: marker }), completedAt },
    });
    input.evidence.executionAttempts.push(
      recomputation("recompute-earlier", time(8), time(9), "earlier-completion"),
      recomputation("recompute-a", time(9), time(8), "same-start-a"),
      recomputation("recompute-z", time(9), time(8), "same-start-z"),
    );
    input.evidence.stageResults[1].executionAttemptId = "recompute-z";

    const round = buildAnalysisContext(input).rounds.find((entry) => entry.phase === 1);
    expect(round.executionAttempts.map((entry) => entry.id)).toEqual(["attempt-1", "recompute-a", "recompute-z", "recompute-earlier"]);
    expect(round.selectedExecution.attemptId).toBe("recompute-z");
    expect(round.selectedExecution.input.evaluations[0].payload).toEqual({ marker: "same-start-z" });
    expect(round.selectedExecution.result.standardResult).toEqual({ marker: "same-start-z" });
  });

  it("rejects inconsistent or duplicate current stage-result evidence", () => {
    const mismatch = history();
    mismatch.evidence.stageResults[1].executionAttemptId = "attempt-0";
    expect(() => buildAnalysisContext(mismatch)).toThrow(/does not match selected applied execution/);

    const duplicate = history();
    duplicate.evidence.stageResults.push({ id: "stage-result-1-duplicate", stage: "alternativeEvaluation", consensusPhase: 1, executionAttemptId: "attempt-1" });
    expect(() => buildAnalysisContext(duplicate)).toThrow(/More than one current stage result/);
  });

  it("keeps active uncomputed rounds as evidence-only rounds", () => {
    const input = history();
    input.evidence.evaluationRevisions.push({ id: "revision-active", evaluationId: "evaluation-active", expertId: "expert-1", stage: "alternativeEvaluation", consensusPhase: 2, action: "draftSaved", occurredAt: time(8), submittedAt: null, previousRevisionId: null, sourceExecutionAttemptId: null });
    input.evidence.executionAttempts.push({ id: "attempt-active-failed", scope: "issueStage", evaluationStage: "alternativeEvaluation", consensusPhase: 2, status: "failed", failureStage: "execution", correlationId: "active", startedAt: time(8), completedAt: time(9), modelContext: {}, request: request("expert-1", {}), error: { message: "not computed" }, application: { status: "notApplicable" } });

    const round = buildAnalysisContext(input).rounds.find((entry) => entry.phase === 2);
    expect(round).toMatchObject({ start: null, selectedExecution: null, revisions: [expect.objectContaining({ id: "revision-active" })], executionAttempts: [expect.objectContaining({ id: "attempt-active-failed", status: "failed" })] });
  });

  it("reconstructs non-consensus phase zero without a phase-start snapshot and omits deleted scenarios", () => {
    const input = history();
    input.stateSnapshots.creation.state.issue.isConsensus = false;
    input.stateSnapshots.consensusPhaseStarts = [];
    input.evidence.executionAttempts.push({ ...structuredClone(input.evidence.executionAttempts[2]), id: "scenario-deleted", correlationId: "deleted", application: { ...structuredClone(input.evidence.executionAttempts[2].application), entityId: "deleted-scenario" } });

    const context = buildAnalysisContext(input);
    const phaseZero = context.rounds.find((entry) => entry.phase === 0);
    expect(phaseZero).toMatchObject({ start: null, selectedExecution: { attemptId: "attempt-0", result: { standardResult: { consensusMeasure: 0.4 } } } });
    expect(context.issue.consensus.enabled).toBe(false);
    expect(context.scenarios.current.map((entry) => entry.id)).toEqual(["scenario-1"]);
  });

  it("is smaller than its forensic source and rejects malformed required current-state structures with application errors", () => {
    const input = history();
    const contextLength = JSON.stringify(buildAnalysisContext(input)).length;
    const historyLength = JSON.stringify(input).length;
    expect(contextLength).toBeLessThan(historyLength);

    const missingIssue = history();
    delete missingIssue.currentState.issue;
    expect(() => buildAnalysisContext(missingIssue)).toThrow(AppError);
    expect(() => buildAnalysisContext(missingIssue)).toThrow(/history.currentState.issue must be an object/);

    const invalidParticipants = history();
    invalidParticipants.currentState.participants = {};
    expect(() => buildAnalysisContext(invalidParticipants)).toThrow(AppError);
    expect(() => buildAnalysisContext(invalidParticipants)).toThrow(/history.currentState.participants must be an array/);
  });
});
