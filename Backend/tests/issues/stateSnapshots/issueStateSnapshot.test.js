import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import { Alternative } from "../../../models/Alternatives.js";
import { Criterion } from "../../../models/Criteria.js";
import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { IssueExpressionDomain } from "../../../models/IssueExpressionDomains.js";
import { Participation } from "../../../models/Participations.js";
import { IssueStateSnapshot } from "../../../models/IssueStateSnapshots.js";
import { deleteIssueCascade } from "../../../modules/issues/lifecycle/deleteIssueCascade.js";
import { buildIssueStateSnapshot, writeIssueStateSnapshot } from "../../../modules/issues/stateSnapshots/issueStateSnapshot.js";
import { createConfirmedUser, createIssueFixture, createIssueModel } from "../../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../../setup/database.js";

setupMongoDbTestHooks();

const createIssue = async () => {
  const owner = await createConfirmedUser();
  const model = await createIssueModel({ name: "Snapshot V1", supportsConsensus: true, supportsConsensusSimulation: true, smallDescription: "V1", parameters: [{ key: "alpha", name: "Alpha", parameterStructureKey: "number", required: false }] });
  return createIssueFixture({ ownerId: owner._id, createdBy: owner._id, modelId: model._id, currentStage: "alternativeEvaluation", isConsensus: true, supportsConsensus: true, consensusMaxPhases: 3, consensusThreshold: 0.8, modelParameters: { alpha: 1 } });
};
const write = (issue, snapshotType, consensusPhase = 0, session = null) => writeIssueStateSnapshot({ issue, snapshotType, consensusPhase, occurredAt: new Date(), correlationId: new mongoose.Types.ObjectId().toString(), session });

describe("IssueStateSnapshot", () => {
  it("enforces one creation snapshot and one phase-start snapshot per phase in Mongo", async () => {
    const issue = await createIssue();
    await write(issue, "creation");
    await expect(write(issue, "creation")).rejects.toMatchObject({ code: 11000 });
    await write(issue, "consensusPhaseStart", 0);
    await write(issue, "consensusPhaseStart", 1);
    await expect(write(issue, "consensusPhaseStart", 0)).rejects.toMatchObject({ code: 11000 });
    expect(await IssueStateSnapshot.countDocuments({ issue: issue._id })).toBe(3);
  });

  it("requires the immutable creation anchor before a phase snapshot", async () => {
    const issue = await createIssue();
    await expect(write(issue, "consensusPhaseStart", 0)).rejects.toMatchObject({ field: "issue", message: "Issue creation snapshot is required before a consensus phase snapshot" });
    expect(await IssueStateSnapshot.countDocuments({ issue: issue._id })).toBe(0);
    await write(issue, "creation");
    await expect(write(issue, "consensusPhaseStart", 0)).resolves.toMatchObject({ snapshotType: "consensusPhaseStart" });
  });

  it("rejects silently lossy snapshot evidence", async () => {
    const issue = await createIssue();
    issue.modelParameters = { invalid: undefined };
    await expect(write(issue, "creation")).rejects.toMatchObject({ field: "issue.modelParameters.invalid" });
    expect(await IssueStateSnapshot.countDocuments({ issue: issue._id })).toBe(0);
  });

  it("orders every queried source canonically regardless of insertion order", async () => {
    const issue = await createIssue();
    const owner = await createConfirmedUser({ email: "ordering-owner@example.com" });
    const expertA = await createConfirmedUser({ email: "ordering-a@example.com" });
    const expertB = await createConfirmedUser({ email: "ordering-b@example.com" });
    const ids = () => [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()].sort((left, right) => String(left).localeCompare(String(right)));
    const [alternativeLowId, alternativeHighId] = ids();
    await Alternative.create({ _id: alternativeHighId, issue: issue._id, name: "Late same position", position: 1 });
    await Alternative.create({ _id: alternativeLowId, issue: issue._id, name: "Early same position", position: 1 });
    await Alternative.create({ issue: issue._id, name: "First position", position: 0 });

    const [rootLowId, rootHighId] = ids();
    await Criterion.create({ _id: rootHighId, issue: issue._id, name: "Root high", type: "group", isLeaf: false, position: 0 });
    await Criterion.create({ _id: rootLowId, issue: issue._id, name: "Root low", type: "group", isLeaf: false, position: 0 });
    const [childLowId, childHighId] = ids();
    await Criterion.create({ _id: childHighId, issue: issue._id, parentCriterion: rootLowId, name: "Child high", type: "benefit", isLeaf: true, position: 0 });
    await Criterion.create({ _id: childLowId, issue: issue._id, parentCriterion: rootLowId, name: "Child low", type: "benefit", isLeaf: true, position: 0 });

    const [domainLowId, domainHighId] = ids();
    await IssueExpressionDomain.create({ _id: domainHighId, issue: issue._id, sourceDomain: new mongoose.Types.ObjectId(), name: "Domain high", typeKey: "numericDiscrete", definition: { min: 0, max: 1, step: 1 } });
    await IssueExpressionDomain.create({ _id: domainLowId, issue: issue._id, sourceDomain: new mongoose.Types.ObjectId(), name: "Domain low", typeKey: "numericDiscrete", definition: { min: 0, max: 1, step: 1 } });

    await Participation.create({ issue: issue._id, expert: expertB._id, invitationStatus: "accepted" });
    await Participation.create({ issue: issue._id, expert: expertA._id, invitationStatus: "accepted" });
    await IssueEvaluation.create({ issue: issue._id, expert: expertB._id, stage: "alternativeEvaluation", consensusPhase: 0, payload: { rank: 2 }, completed: true });
    await IssueEvaluation.create({ issue: issue._id, expert: expertA._id, stage: "alternativeEvaluation", consensusPhase: 0, payload: { rank: 1 }, completed: true });

    const first = await buildIssueStateSnapshot({ issue, snapshotType: "creation" });
    const second = await buildIssueStateSnapshot({ issue, snapshotType: "creation" });
    expect(second).toEqual(first);
    expect(first.alternatives.map((entry) => entry.name)).toEqual(["First position", "Early same position", "Late same position"]);
    expect(first.criteria.map((entry) => entry.name)).toEqual(["Root low", "Root high", "Child low", "Child high"]);
    expect(first.expressionDomains.map((entry) => entry.id)).toEqual([String(domainLowId), String(domainHighId)]);
    expect(first.participants.map((entry) => entry.expert.id)).toEqual([String(expertA._id), String(expertB._id)].sort());
    expect(first.evaluations.map((entry) => entry.expertId)).toEqual([String(expertA._id), String(expertB._id)].sort());
  });

  it("rejects every unsupported JSON value without silently changing required evidence", async () => {
    const unsupported = [
      undefined,
      Number.NaN,
      Infinity,
      -Infinity,
      1n,
      () => {},
      Symbol("snapshot"),
    ];
    for (const invalid of unsupported) {
      const issue = await createIssue();
      issue.modelParameters = { evidence: { invalid } };
      await expect(write(issue, "creation")).rejects.toMatchObject({ field: "issue.modelParameters.evidence.invalid" });
      expect(await IssueStateSnapshot.countDocuments({ issue: issue._id })).toBe(0);
    }
    const circular = {};
    circular.self = circular;
    const issue = await createIssue();
    issue.modelParameters = { evidence: circular };
    await expect(write(issue, "creation")).rejects.toMatchObject({ field: "issue.modelParameters.evidence.self" });
    expect(await IssueStateSnapshot.countDocuments({ issue: issue._id })).toBe(0);
  });

  it("canonicalizes nested Dates and detaches ordinary nested evidence", async () => {
    const issue = await createIssue();
    const source = { metadata: { occurredAt: new Date("2024-01-02T03:04:05.678Z"), nested: { value: "original" } } };
    issue.modelParameters = source;
    const snapshot = await write(issue, "creation");
    source.metadata.nested.value = "mutated";
    expect(snapshot.state.issue.effectiveModelParameters).toEqual({ metadata: { occurredAt: "2024-01-02T03:04:05.678Z", nested: { value: "original" } } });
    expect((await IssueStateSnapshot.findById(snapshot._id).lean()).state.issue.effectiveModelParameters).toEqual(snapshot.state.issue.effectiveModelParameters);
  });

  it("uses the supplied transaction session and rolls back transaction-local snapshot state", async () => {
    const issue = await createIssue();
    const expert = await createConfirmedUser({ email: "transaction-snapshot@example.com" });
    const creation = await write(issue, "creation");
    const originalCreation = structuredClone(creation.state);
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      await IssueEvaluation.create([{ issue: issue._id, expert: expert._id, stage: "alternativeEvaluation", consensusPhase: 1, payload: { transactionLocal: true }, completed: true }], { session });
      issue.consensusPhase = 1;
      const phaseSnapshot = await write(issue, "consensusPhaseStart", 1, session);
      expect(phaseSnapshot.state.evaluations).toEqual([expect.objectContaining({ expertId: String(expert._id), consensusPhase: 1, payload: { transactionLocal: true } })]);
      expect(await IssueStateSnapshot.countDocuments({ issue: issue._id, snapshotType: "consensusPhaseStart", consensusPhase: 1 }).session(session)).toBe(1);
      await session.abortTransaction();
    } finally {
      await session.endSession();
    }
    expect(await IssueStateSnapshot.countDocuments({ issue: issue._id, snapshotType: "consensusPhaseStart", consensusPhase: 1 })).toBe(0);
    expect(await IssueEvaluation.countDocuments({ issue: issue._id, consensusPhase: 1 })).toBe(0);
    expect((await IssueStateSnapshot.findById(creation._id).lean()).state).toEqual(originalCreation);
  });

  it("deletes all historical snapshots only through the real whole-issue cascade", async () => {
    const issue = await createIssue();
    await write(issue, "creation");
    await write(issue, "consensusPhaseStart", 0);
    expect(await IssueStateSnapshot.countDocuments({ issue: issue._id })).toBe(2);
    await deleteIssueCascade({ issueId: issue._id });
    expect(await IssueStateSnapshot.countDocuments({ issue: issue._id })).toBe(0);
  });

  it("keeps complete creation state immutable and reuses its frozen model definition for phase snapshots", async () => {
    const issue = await createIssue();
    const creation = await write(issue, "creation");
    const originalState = structuredClone(creation.state);
    const { Issue } = await import("../../../models/Issues.js");
    const { IssueModel } = await import("../../../models/IssueModels.js");
    await Issue.updateOne({ _id: issue._id }, { $set: { modelParameters: { alpha: 99 }, active: false } });
    await IssueModel.updateOne({ _id: issue.model }, { $set: { name: "Snapshot V2", supportsConsensusSimulation: false, smallDescription: "V2", parameters: [] } });
    expect((await IssueStateSnapshot.findById(creation._id).lean()).state).toEqual(originalState);
    const currentIssue = await Issue.findById(issue._id);
    currentIssue.consensusPhase = 1;
    await currentIssue.save();
    const phase = await write(currentIssue, "consensusPhaseStart", 1);
    expect(phase.state.model).toEqual(originalState.model);
    expect(phase.state.issue).toMatchObject({ consensusPhase: 1, effectiveModelParameters: { alpha: 99 }, active: false });
  });
});
