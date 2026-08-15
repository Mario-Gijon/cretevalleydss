import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import { IssueStateSnapshot } from "../../../models/IssueStateSnapshots.js";
import { writeIssueStateSnapshot } from "../../../modules/issues/stateSnapshots/issueStateSnapshot.js";
import { createConfirmedUser, createIssueFixture, createIssueModel } from "../../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../../setup/database.js";

setupMongoDbTestHooks();

const createIssue = async () => {
  const owner = await createConfirmedUser();
  const model = await createIssueModel({ name: "Snapshot V1", supportsConsensus: true, supportsConsensusSimulation: true, smallDescription: "V1", parameters: [{ key: "alpha", name: "Alpha", parameterStructureKey: "number", required: false }] });
  return createIssueFixture({ ownerId: owner._id, createdBy: owner._id, modelId: model._id, currentStage: "alternativeEvaluation", isConsensus: true, supportsConsensus: true, consensusMaxPhases: 3, consensusThreshold: 0.8, modelParameters: { alpha: 1 } });
};
const write = (issue, snapshotType, consensusPhase = 0) => writeIssueStateSnapshot({ issue, snapshotType, consensusPhase, occurredAt: new Date(), correlationId: new mongoose.Types.ObjectId().toString() });

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
