import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

import { Alternative } from "../../models/Alternatives.js";
import { Criterion } from "../../models/Criteria.js";
import { ExitUserIssue } from "../../models/ExitUserIssue.js";
import { IssueExpressionDomain } from "../../models/IssueExpressionDomains.js";
import { IssueEvaluation } from "../../models/IssueEvaluations.js";
import { IssueScenario } from "../../models/IssueScenarios.js";
import { IssueStageResult } from "../../models/IssueStageResults.js";
import { Issue } from "../../models/Issues.js";
import { Notification } from "../../models/Notifications.js";
import { Participation } from "../../models/Participations.js";
import { User } from "../../models/Users.js";
import { deleteActiveIssueAsOwner } from "../../modules/issues/lifecycle/deleteActiveIssue.js";
import { hideFinishedIssueForUser } from "../../modules/issues/lifecycle/hideFinishedIssue.js";
import { setupMongoDbTestHooks } from "../setup/database.js";

setupMongoDbTestHooks();

const createUser = async (overrides = {}) => {
  const suffix = new mongoose.Types.ObjectId().toString().slice(-8);

  return User.create({
    name: "Lifecycle User",
    university: "Testing University",
    email: `lifecycle-${suffix}@example.com`,
    password: "Abc123",
    accountConfirm: true,
    ...overrides,
  });
};

const createIssue = async ({
  ownerId,
  active = true,
  currentStage = "criteriaWeighting",
  consensusPhase = 0,
  name = "Issue under test",
} = {}) => {
  const modelId = new mongoose.Types.ObjectId();

  return Issue.create({
    ownerId,
    createdBy: ownerId,
    model: modelId,
    apiModelKey: "test-model",
    apiEndpoint: {
      method: "POST",
      path: "/execute",
    },
    name,
    evaluationStructureKey: "alternativeCriteriaMatrix",
    description: "Minimal issue fixture",
    active,
    currentStage,
    consensusPhase,
  });
};

const createCascadeFixture = async () => {
  const owner = await createUser();
  const participant = await createUser();
  const issue = await createIssue({ ownerId: owner._id });
  const targetModelId = new mongoose.Types.ObjectId();

  await Alternative.create({
    issue: issue._id,
    name: "Alternative A",
    position: 0,
  });

  await Criterion.create({
    issue: issue._id,
    parentCriterion: null,
    name: "Criterion A",
    type: "numeric",
    isLeaf: true,
    position: 0,
  });

  await Participation.create({
    issue: issue._id,
    expert: participant._id,
    invitationStatus: "accepted",
  });

  await Notification.create({
    expert: participant._id,
    issue: issue._id,
    type: "invitation",
    message: "Invitation pending",
    requiresAction: true,
  });

  await IssueExpressionDomain.create({
    issue: issue._id,
    name: "Issue numeric domain",
    type: "numeric",
    numericRange: {
      min: 0,
      max: 10,
      step: 1,
    },
  });

  await ExitUserIssue.create({
    issue: issue._id,
    user: participant._id,
    hidden: true,
    phase: 0,
    stage: "criteriaWeighting",
    reason: "Hidden for fixture",
    history: [
      {
        phase: 0,
        stage: "criteriaWeighting",
        action: "exited",
        reason: "Hidden for fixture",
      },
    ],
  });

  await IssueEvaluation.create({
    issue: issue._id,
    expert: participant._id,
    stage: "criteriaWeighting",
    consensusPhase: 0,
    payload: {},
    completed: false,
  });

  await IssueStageResult.create({
    issue: issue._id,
    stage: "criteriaWeighting",
    consensusPhase: 0,
  });

  await IssueScenario.create({
    issue: issue._id,
    createdBy: owner._id,
    name: "Scenario A",
    targetModel: targetModelId,
    targetModelName: "Model A",
    targetApiModelKey: "target-model",
    targetApiEndpoint: {
      method: "POST",
      path: "/execute",
    },
    targetEvaluationStructureKey: "alternativeCriteriaMatrix",
    evaluationStructureKey: "alternativeCriteriaMatrix",
  });

  return {
    owner,
    participant,
    issue,
  };
};

describe("issue lifecycle", () => {
  it("deleteActiveIssueAsOwner allows the owner to delete an active issue and cascades related documents", async () => {
    const { owner, issue } = await createCascadeFixture();

    const result = await deleteActiveIssueAsOwner({
      issueId: issue._id,
      userId: owner._id,
    });

    expect(result).toEqual({
      issueName: "Issue under test",
    });
    expect(await Issue.findById(issue._id)).toBeNull();
    expect(await Alternative.countDocuments({ issue: issue._id })).toBe(0);
    expect(await Criterion.countDocuments({ issue: issue._id })).toBe(0);
    expect(await Participation.countDocuments({ issue: issue._id })).toBe(0);
    expect(await Notification.countDocuments({ issue: issue._id })).toBe(0);
    expect(await IssueExpressionDomain.countDocuments({ issue: issue._id })).toBe(0);
    expect(await ExitUserIssue.countDocuments({ issue: issue._id })).toBe(0);
    expect(await IssueEvaluation.countDocuments({ issue: issue._id })).toBe(0);
    expect(await IssueScenario.countDocuments({ issue: issue._id })).toBe(0);
    expect(await IssueStageResult.countDocuments({ issue: issue._id })).toBe(0);
  });

  it("deleteActiveIssueAsOwner rejects a non-owner", async () => {
    const owner = await createUser();
    const otherUser = await createUser();
    const issue = await createIssue({ ownerId: owner._id });

    await expect(
      deleteActiveIssueAsOwner({
        issueId: issue._id,
        userId: otherUser._id,
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "You are not the owner of this issue",
    });

    expect(await Issue.findById(issue._id)).not.toBeNull();
  });

  it("hideFinishedIssueForUser hides a finished issue for one visible user without deleting it permanently", async () => {
    const owner = await createUser();
    const expert = await createUser();
    const issue = await createIssue({
      ownerId: owner._id,
      active: false,
      currentStage: "finished",
      consensusPhase: 1,
      name: "Finished issue",
    });

    await Participation.create({
      issue: issue._id,
      expert: expert._id,
      invitationStatus: "accepted",
    });

    const result = await hideFinishedIssueForUser({
      issueId: issue._id,
      userId: owner._id,
    });

    const ownerExit = await ExitUserIssue.findOne({
      issue: issue._id,
      user: owner._id,
    }).lean();

    expect(result).toEqual({
      issueName: "Finished issue",
      deletedPermanently: false,
    });
    expect(await Issue.findById(issue._id)).not.toBeNull();
    expect(ownerExit).toMatchObject({
      hidden: true,
      phase: 1,
      stage: "alternativeEvaluation",
      reason: "Issue finished and removed for user",
    });
  });

  it("hideFinishedIssueForUser deletes the issue permanently only after all visible users have hidden it", async () => {
    const owner = await createUser();
    const expert = await createUser();
    const issue = await createIssue({
      ownerId: owner._id,
      active: false,
      currentStage: "finished",
      consensusPhase: 2,
      name: "Finished issue",
    });

    await Participation.create({
      issue: issue._id,
      expert: expert._id,
      invitationStatus: "accepted",
    });

    await hideFinishedIssueForUser({
      issueId: issue._id,
      userId: owner._id,
    });

    const result = await hideFinishedIssueForUser({
      issueId: issue._id,
      userId: expert._id,
    });

    expect(result).toEqual({
      issueName: "Finished issue",
      deletedPermanently: true,
    });
    expect(await Issue.findById(issue._id)).toBeNull();
    expect(await ExitUserIssue.countDocuments({ issue: issue._id })).toBe(0);
  });
});
