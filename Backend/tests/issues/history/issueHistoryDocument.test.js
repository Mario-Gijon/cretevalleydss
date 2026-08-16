import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

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
import { buildIssueHistoryDocument } from "../../../modules/issues/history/index.js";
import { writeIssueStateSnapshot } from "../../../modules/issues/stateSnapshots/issueStateSnapshot.js";
import { createConfirmedUser, createIssueFixture, createIssueModel } from "../../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../../setup/database.js";

setupMongoDbTestHooks();

const at = (second) => new Date(`2026-01-01T00:00:${String(second).padStart(2, "0")}.000Z`);

const createAttempt = ({ issue, actor, scope = "issueStage", status = "succeeded", failureStage = null, startedAt = at(10) }) => IssueExecutionAttempt.create({
  issue: issue._id, scope, actorType: "user", actorUser: actor._id,
  correlationId: `${scope}-${status}-${startedAt.getTime()}`,
  evaluationStage: "alternativeEvaluation", issueStage: "alternativeEvaluation", consensusPhase: 0,
  modelContext: { apiModelKey: "frozen-model", nested: { observedAt: at(1) } },
  request: { body: { values: [1, 2] }, method: "POST" }, status, failureStage, startedAt,
  responseReceivedAt: status === "failed" ? null : at(11), completedAt: at(12), durationMs: 2, transportDurationMs: 1,
  response: status === "failed" ? null : { httpStatus: 200, rawBody: { success: true } },
  normalizedResult: status === "failed" ? null : { ranking: ["A"] },
  error: status === "failed" ? { name: "Error", message: "transport failed", nested: { at: at(2) } } : null,
  application: status === "failed" ? { status: "notApplicable", completedAt: null, entityType: null, entityId: null, resultSnapshot: null, error: null } : { status: "applied", completedAt: at(13), entityType: "issueStageResult", entityId: null, resultSnapshot: { accepted: true }, error: null },
});

const createHistoryFixture = async ({ finished = false, multiPhase = false } = {}) => {
  const owner = await createConfirmedUser({ email: `history-owner-${new mongoose.Types.ObjectId()}@example.com` });
  const expert = await createConfirmedUser({ email: `history-expert-${new mongoose.Types.ObjectId()}@example.com` });
  const model = await createIssueModel({ name: "Frozen History Model", supportsConsensus: true });
  const issue = await createIssueFixture({ ownerId: owner._id, createdBy: owner._id, modelId: model._id, currentStage: "alternativeEvaluation", isConsensus: true, supportsConsensus: true, consensusMaxPhases: 3, consensusThreshold: 0.8, modelParameters: { alpha: 1, nested: { capturedAt: at(3) } } });
  await Participation.create({ issue: issue._id, expert: expert._id, invitationStatus: "accepted", evaluationCompleted: true, entryPhase: 0, entryStage: "alternativeEvaluation", joinedAt: at(4) });
  const evaluation = await IssueEvaluation.create({ issue: issue._id, expert: expert._id, stage: "alternativeEvaluation", consensusPhase: 0, payload: { score: 7, nested: { at: at(5) } }, completed: true, submittedAt: at(6) });
  const failedAttempt = await createAttempt({ issue, actor: owner, status: "failed", failureStage: "transport", startedAt: at(7) });
  const scenarioAttempt = await createAttempt({ issue, actor: owner, scope: "scenario", startedAt: at(14) });
  const stageResult = await IssueStageResult.create({ issue: issue._id, stage: "alternativeEvaluation", consensusPhase: 0, executionAttempt: failedAttempt._id, inputSnapshot: { expertWeights: [{ expert: expert._id, weight: 1 }] }, result: { standardResult: { consensusMeasure: 0.4, rankedAlternatives: [{ alternativeId: "a", rank: 1 }], collectiveEvaluations: { value: 1 } }, modelExecution: { attempt: String(failedAttempt._id) }, rawOutput: { raw: true } } });
  const event = await IssueEvent.create({ issue: issue._id, eventType: "issue.stage.changed", actorType: "user", actorUser: owner._id, stage: "alternativeEvaluation", phase: 0, occurredAt: at(15), correlationId: "history-event", previousState: { stage: "weightsFinished" }, nextState: { stage: "alternativeEvaluation" }, details: { nestedDate: at(16) } });
  const revision = await IssueEvaluationRevision.create({ issue: issue._id, evaluation: evaluation._id, expert: expert._id, actorType: "user", actorUser: expert._id, stage: "alternativeEvaluation", consensusPhase: 0, action: "submitted", structureKey: "alternativeCriteriaMatrix", rawPayload: { raw: true }, normalizedPayload: { normalized: true }, decisionContext: { nestedDate: at(17) }, previousRevision: null, submittedAt: at(18), occurredAt: at(18), correlationId: "history-revision", sourceExecutionAttempt: failedAttempt._id });
  await Notification.create({ issue: issue._id, expert: expert._id, type: "invitation", message: "Current notification", requiresAction: true, actionTaken: false, read: false, createdAt: at(19) });
  await ExitUserIssue.create({ issue: issue._id, user: expert._id, hidden: false, timestamp: at(22), phase: 0, stage: "alternativeEvaluation", reason: "Current", history: [{ timestamp: at(21), phase: 0, stage: "alternativeEvaluation", action: "exited", reason: "Later inserted first" }, { timestamp: at(20), phase: 0, stage: "alternativeEvaluation", action: "entered", reason: "Earlier inserted second" }] });
  await IssueScenario.create({ issue: issue._id, createdBy: owner._id, name: "Current scenario", description: "Scenario evidence", targetModel: model._id, source: { consensusPhase: 0, stageResult: stageResult._id, domainType: "numeric" }, config: { parameterOverrides: { alpha: 2 } }, requestSnapshot: { modelParameters: { alpha: 1 }, evaluations: [{ id: String(evaluation._id) }], context: { issue: String(issue._id) } }, result: { standardResult: { rank: 1 }, modelExecution: { scope: "scenario" }, rawOutput: { raw: true } }, execution: { attemptId: scenarioAttempt._id, startedAt: at(14), completedAt: at(15) } });
  const creation = await writeIssueStateSnapshot({ issue, snapshotType: "creation", occurredAt: at(23), correlationId: "history-creation" });
  await writeIssueStateSnapshot({ issue, snapshotType: "consensusPhaseStart", consensusPhase: 0, occurredAt: at(24), correlationId: "history-phase-0" });
  if (multiPhase) {
    issue.consensusPhase = 1;
    await IssueStageResult.create({ issue: issue._id, stage: "alternativeEvaluation", consensusPhase: 1, executionAttempt: null, inputSnapshot: { expertWeights: [] }, result: { standardResult: { consensusMeasure: 0.9, rankedAlternatives: [], collectiveEvaluations: {} }, modelExecution: {}, rawOutput: {} } });
    await writeIssueStateSnapshot({ issue, snapshotType: "consensusPhaseStart", consensusPhase: 1, occurredAt: at(25), correlationId: "history-phase-1" });
  }
  if (finished) await Issue.updateOne({ _id: issue._id }, { $set: { active: false, currentStage: "finished", finishedAt: at(26), consensusPhase: multiPhase ? 1 : 0 } });
  return { owner, expert, model, issue, event, revision, failedAttempt, scenarioAttempt, stageResult, creation };
};

describe("buildIssueHistoryDocument", () => {
  it("requires the immutable creation snapshot instead of reconstructing history", async () => {
    const owner = await createConfirmedUser();
    const model = await createIssueModel();
    const issue = await createIssueFixture({ ownerId: owner._id, createdBy: owner._id, modelId: model._id });
    await expect(buildIssueHistoryDocument({ issueId: issue._id })).rejects.toMatchObject({ field: "issueId", message: "Issue creation snapshot is required for history" });
  });

  it("builds a deterministic, detached active dossier with failed and scenario execution evidence", async () => {
    const fixture = await createHistoryFixture();
    const first = await buildIssueHistoryDocument({ issueId: fixture.issue._id });
    const second = await buildIssueHistoryDocument({ issueId: fixture.issue._id });
    expect(second).toEqual(first);
    expect(first).toMatchObject({ schemaVersion: 1, issueId: String(fixture.issue._id), currentState: { issue: { active: true, finishedAt: null } }, completeness: { creationSnapshot: { status: "exact" }, stageResults: { status: "currentProjection" }, scenarioDeletionHistory: { status: "unavailable" } } });
    expect(first.stateSnapshots.creation.state.model.name).toBe("Frozen History Model");
    expect(first.stateSnapshots.creation.state.issue).toMatchObject({ owner: { id: String(fixture.owner._id), name: fixture.owner.name, email: fixture.owner.email, university: fixture.owner.university }, creator: { id: String(fixture.owner._id), name: fixture.owner.name, email: fixture.owner.email, university: fixture.owner.university } });
    expect(first.stateSnapshots.consensusPhaseStarts[0].state.issue).toMatchObject({ owner: first.stateSnapshots.creation.state.issue.owner, creator: first.stateSnapshots.creation.state.issue.creator });
    expect(first.evidence.executionAttempts).toEqual(expect.arrayContaining([expect.objectContaining({ id: String(fixture.failedAttempt._id), status: "failed", failureStage: "transport", error: { name: "Error", message: "transport failed", nested: { at: "2026-01-01T00:00:02.000Z" } } }), expect.objectContaining({ id: String(fixture.scenarioAttempt._id), scope: "scenario" })]));
    expect(first.scenarios.current[0].phaseResults).toMatchObject([{ phase: 0, execution: { attemptId: String(fixture.scenarioAttempt._id) } }]);
    expect(first.scenarios.current[0]).not.toHaveProperty("source");
    expect(first.timeline.find((entry) => entry.kind === "scenario")).toMatchObject({ stage: null, phase: null });
    expect(first.evidence.events[0].details.nestedDate).toBe("2026-01-01T00:00:16.000Z");
    expect(first.currentState.issue.id).toBe(String(fixture.issue._id));
    expect(first.currentState.evaluations[0].submittedAt).toBe("2026-01-01T00:00:06.000Z");
    const exitHistory = first.evidence.participantExitHistory[0];
    const firstExitHistoryEntry = exitHistory.history[0];
    expect(exitHistory.history.map((entry) => entry.reason)).toEqual(["Earlier inserted second", "Later inserted first"]);
    expect(firstExitHistoryEntry).toEqual({ timestamp: "2026-01-01T00:00:20.000Z", phase: 0, stage: "alternativeEvaluation", action: "entered", reason: "Earlier inserted second" });
    expect(Object.keys(firstExitHistoryEntry).sort()).toEqual(["action", "phase", "reason", "stage", "timestamp"]);
    expect(firstExitHistoryEntry).not.toHaveProperty("_id");
    const exitTimeline = first.timeline.filter((entry) => entry.kind === "participantExitHistory");
    expect(exitTimeline.map((entry) => entry.refId)).toEqual([`${exitHistory.id}:history:0`, `${exitHistory.id}:history:1`]);
    expect(exitTimeline[0].occurredAt).toBe(firstExitHistoryEntry.timestamp);
    expect(first.timeline.some((entry) => entry.kind === "executionAttempt" && entry.refId === String(fixture.failedAttempt._id))).toBe(true);
    first.currentState.issue.modelParameters.alpha = 999;
    expect((await buildIssueHistoryDocument({ issueId: fixture.issue._id })).currentState.issue.modelParameters.alpha).toBe(1);
    await fixture.model.updateOne({ $set: { name: "Mutable registry replacement" } });
    expect((await buildIssueHistoryDocument({ issueId: fixture.issue._id })).stateSnapshots.creation.state.model.name).toBe("Frozen History Model");
  });

  it("includes finished multi-phase snapshots, results, and internally resolvable timeline references", async () => {
    const fixture = await createHistoryFixture({ finished: true, multiPhase: true });
    const history = await buildIssueHistoryDocument({ issueId: fixture.issue._id });
    expect(history.currentState.issue).toMatchObject({ active: false, currentStage: "finished", consensusPhase: 1, finishedAt: "2026-01-01T00:00:26.000Z" });
    expect(history.stateSnapshots.consensusPhaseStarts.map((snapshot) => snapshot.consensusPhase)).toEqual([0, 1]);
    expect(history.evidence.events).toHaveLength(1);
    expect(history.evidence.evaluationRevisions).toHaveLength(1);
    expect(history.evidence.executionAttempts).toHaveLength(2);
    expect(history.evidence.stageResults).toHaveLength(2);
    expect(history.timeline).toEqual([...history.timeline].sort((left, right) => left.occurredAt.localeCompare(right.occurredAt) || left.kind.localeCompare(right.kind) || left.refId.localeCompare(right.refId)));
  });

  it("serializes a new aggregate scenario with ordered phaseResults and an aggregate timeline entry", async () => {
    const fixture = await createHistoryFixture();
    const laterStageResult = await IssueStageResult.create({
      issue: fixture.issue._id,
      stage: "alternativeEvaluation",
      consensusPhase: 1,
      executionAttempt: null,
      inputSnapshot: { expertWeights: [] },
      result: { standardResult: { consensusMeasure: 0.9 }, modelExecution: { phase: 1 }, rawOutput: { phase: 1 } },
    });
    await IssueScenario.create({
      issue: fixture.issue._id,
      createdBy: fixture.owner._id,
      name: "Aggregate scenario",
      targetModel: fixture.model._id,
      config: { parameterOverrides: { alpha: 3 } },
      phaseResults: [
        { phase: 1, source: { stageResult: laterStageResult._id, domainType: "numeric" }, requestSnapshot: { context: { phase: 1 } }, result: { standardResult: { consensusMeasure: 0.9 }, modelExecution: { phase: 1 }, rawOutput: { phase: 1 } }, execution: { attemptId: fixture.scenarioAttempt._id, startedAt: at(16), completedAt: at(17) } },
        { phase: 0, source: { stageResult: fixture.stageResult._id, domainType: "numeric" }, requestSnapshot: { context: { phase: 0 } }, result: { standardResult: { consensusMeasure: 0.4 }, modelExecution: { phase: 0 }, rawOutput: { phase: 0 } }, execution: { attemptId: fixture.scenarioAttempt._id, startedAt: at(14), completedAt: at(15) } },
      ],
    });

    const history = await buildIssueHistoryDocument({ issueId: fixture.issue._id });
    const scenario = history.scenarios.current.find((entry) => entry.name === "Aggregate scenario");
    expect(scenario.phaseResults.map((entry) => entry.phase)).toEqual([0, 1]);
    expect(scenario.phaseResults[1]).toMatchObject({ source: { stageResultId: String(laterStageResult._id) }, requestSnapshot: { context: { phase: 1 } }, result: { standardResult: { consensusMeasure: 0.9 } } });
    expect(history.timeline.find((entry) => entry.kind === "scenario" && entry.refId === scenario.id)).toMatchObject({ stage: null, phase: null });
    expect(() => JSON.stringify(history)).not.toThrow();
  });

  it("does not emit an undefined legacy source phase", async () => {
    const fixture = await createHistoryFixture();
    await IssueScenario.create({
      issue: fixture.issue._id,
      createdBy: fixture.owner._id,
      name: "Legacy without phase",
      targetModel: fixture.model._id,
      source: { stageResult: null, domainType: "numeric" },
      config: { parameterOverrides: {} },
      requestSnapshot: {},
      result: { standardResult: {}, modelExecution: {}, rawOutput: {} },
      execution: { startedAt: at(14), completedAt: at(15) },
    });
    const history = await buildIssueHistoryDocument({ issueId: fixture.issue._id });
    const scenario = history.scenarios.current.find((entry) => entry.name === "Legacy without phase");
    expect(scenario.phaseResults).toMatchObject([{ phase: 0 }]);
    expect(scenario).not.toHaveProperty("source");
  });

  it("rejects invalid persisted Mixed evidence instead of silently altering it", async () => {
    const fixture = await createHistoryFixture();
    await Issue.updateOne({ _id: fixture.issue._id }, { $set: { modelParameters: { invalid: Number.NaN } } });
    await expect(buildIssueHistoryDocument({ issueId: fixture.issue._id })).rejects.toMatchObject({ field: "issueHistoryDocument.currentState.issue.modelParameters.invalid" });
  });

  it("reads transaction-local evidence only when the same session is supplied", async () => {
    const fixture = await createHistoryFixture();
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const localEvent = await IssueEvent.create([{ issue: fixture.issue._id, eventType: "issue.stage.changed", actorType: "user", actorUser: fixture.owner._id, stage: "alternativeEvaluation", phase: 0, occurredAt: at(30), correlationId: "transaction-local", details: {} }], { session });
      expect((await buildIssueHistoryDocument({ issueId: fixture.issue._id, session })).evidence.events.map((entry) => entry.id)).toContain(String(localEvent[0]._id));
      expect((await buildIssueHistoryDocument({ issueId: fixture.issue._id })).evidence.events.map((entry) => entry.id)).not.toContain(String(localEvent[0]._id));
      await session.abortTransaction();
    } finally {
      await session.endSession();
    }
  });
});
