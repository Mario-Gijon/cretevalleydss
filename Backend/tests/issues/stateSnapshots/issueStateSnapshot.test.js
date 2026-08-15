import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import { IssueStateSnapshot } from "../../../models/IssueStateSnapshots.js";
import { writeIssueStateSnapshot } from "../../../modules/issues/stateSnapshots/issueStateSnapshot.js";
import { createConfirmedUser, createIssueFixture } from "../../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../../setup/database.js";

setupMongoDbTestHooks();

const createIssue = async () => {
  const owner = await createConfirmedUser();
  return createIssueFixture({ ownerId: owner._id, createdBy: owner._id, currentStage: "alternativeEvaluation", isConsensus: true, supportsConsensus: true, consensusMaxPhases: 3, consensusThreshold: 0.8, modelParameters: { alpha: 1 } });
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
});
