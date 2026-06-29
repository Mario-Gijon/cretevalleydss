import { describe, expect, it } from "vitest";

import { ExitUserIssue } from "../../../models/ExitUserIssue.js";
import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { Issue } from "../../../models/Issues.js";
import { Notification } from "../../../models/Notifications.js";
import { Participation } from "../../../models/Participations.js";
import { editIssueExperts } from "../../../modules/issues/participants/editIssueExperts.js";
import { normalizeParticipantEditionRequest } from "../../../modules/issues/participants/loadParticipantEditionContext.js";
import {
  createConfirmedUser,
  createIssueCriteriaFixture,
  createIssueEvaluationFixture,
  createIssueFixture,
  createParticipationFixture,
} from "../../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../../setup/database.js";

setupMongoDbTestHooks();

describe("normalizeParticipantEditionRequest", () => {
  it("normalizes expert emails to lowercase and trimmed values", () => {
    const result = normalizeParticipantEditionRequest({
      expertsToAdd: ["  EXPERT@One.com  "],
      expertsToRemove: ["  OTHER@Two.com  "],
    });

    expect(result).toEqual({
      finalExpertsToAdd: ["expert@one.com"],
      finalExpertsToRemove: ["other@two.com"],
    });
  });

  it("deduplicates experts to add and remove", () => {
    const result = normalizeParticipantEditionRequest({
      expertsToAdd: ["expert@example.com", "EXPERT@example.com"],
      expertsToRemove: ["remove@example.com", " remove@example.com "],
    });

    expect(result).toEqual({
      finalExpertsToAdd: ["expert@example.com"],
      finalExpertsToRemove: ["remove@example.com"],
    });
  });

  it("keeps the final request deterministic when the same email appears in add and remove", () => {
    const result = normalizeParticipantEditionRequest({
      expertsToAdd: ["expert@example.com"],
      expertsToRemove: [" EXPERT@example.com "],
    });

    expect(result).toEqual({
      finalExpertsToAdd: [],
      finalExpertsToRemove: ["expert@example.com"],
    });
  });

  it("rejects non-array expertsToAdd", () => {
    expect(() =>
      normalizeParticipantEditionRequest({
        expertsToAdd: "expert@example.com",
        expertsToRemove: [],
      })
    ).toThrow(/expertsToAdd must be an array/);
  });

  it("rejects non-array expertsToRemove", () => {
    expect(() =>
      normalizeParticipantEditionRequest({
        expertsToAdd: [],
        expertsToRemove: "expert@example.com",
      })
    ).toThrow(/expertsToRemove must be an array/);
  });
});

describe("editIssueExperts", () => {
  it("owner can add an existing confirmed user as expert to an active issue", async () => {
    const owner = await createConfirmedUser({
      name: "Owner User",
      email: "owner@example.com",
    });
    const expert = await createConfirmedUser({
      email: "expert@example.com",
    });
    const issue = await createIssueFixture({
      ownerId: owner._id,
      currentStage: "criteriaWeighting",
      consensusPhase: 2,
      name: "Participant issue",
    });

    await createIssueCriteriaFixture({
      issueId: issue._id,
      leafNames: ["Leaf criterion"],
    });

    const result = await editIssueExperts({
      issueId: issue._id,
      userId: owner._id,
      expertsToAdd: ["  EXPERT@example.com  "],
      expertsToRemove: [],
    });

    const participations = await Participation.find({ issue: issue._id }).lean();
    const notifications = await Notification.find({ issue: issue._id }).lean();
    const exitLog = await ExitUserIssue.findOne({
      issue: issue._id,
      user: expert._id,
    }).lean();

    expect(result).toEqual({
      issueName: "Participant issue",
      invitationEmailsToSend: [
        {
          expertEmail: "expert@example.com",
          issueName: "Participant issue",
          issueDescription: "Minimal issue fixture",
          ownerEmail: "owner@example.com",
        },
      ],
    });
    expect(participations).toHaveLength(1);
    expect(participations[0]).toMatchObject({
      issue: issue._id,
      expert: expert._id,
      invitationStatus: "pending",
      evaluationCompleted: false,
      weightsCompleted: true,
      entryPhase: 2,
      entryStage: "criteriaWeighting",
    });
    expect(participations[0].joinedAt).toBeTruthy();

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      expert: expert._id,
      issue: issue._id,
      type: "invitation",
      requiresAction: true,
      read: false,
    });
    expect(exitLog).toMatchObject({
      hidden: false,
      reason: "Invited by owner",
      phase: 2,
      stage: "criteriaWeighting",
    });
    expect(exitLog.history).toHaveLength(1);
    expect(exitLog.history[0]).toMatchObject({
      action: "entered",
      reason: "Invited by owner",
      phase: 2,
      stage: "criteriaWeighting",
    });
    expect(exitLog.history[0].timestamp).toBeTruthy();
  });

  it("adding an already participating expert is idempotent", async () => {
    const owner = await createConfirmedUser({
      email: "owner@example.com",
    });
    const expert = await createConfirmedUser({
      email: "expert@example.com",
    });
    const issue = await createIssueFixture({
      ownerId: owner._id,
    });

    await createIssueCriteriaFixture({
      issueId: issue._id,
      leafNames: ["Leaf criterion"],
    });
    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "pending",
      entryPhase: 0,
      entryStage: "criteriaWeighting",
      weightsCompleted: true,
    });
    await ExitUserIssue.create({
      issue: issue._id,
      user: expert._id,
      hidden: false,
      phase: 0,
      stage: "criteriaWeighting",
      reason: "Invited by owner",
      history: [
        {
          phase: 0,
          stage: "criteriaWeighting",
          action: "entered",
          reason: "Invited by owner",
        },
      ],
    });
    await Notification.create({
      expert: expert._id,
      issue: issue._id,
      type: "invitation",
      message: "Existing invitation",
      read: false,
      requiresAction: true,
    });

    const result = await editIssueExperts({
      issueId: issue._id,
      userId: owner._id,
      expertsToAdd: [expert.email],
      expertsToRemove: [],
    });

    expect(result.invitationEmailsToSend).toEqual([]);
    expect(await Participation.countDocuments({ issue: issue._id })).toBe(1);
    expect(await Notification.countDocuments({ issue: issue._id })).toBe(1);
    const exitLog = await ExitUserIssue.findOne({
      issue: issue._id,
      user: expert._id,
    }).lean();
    expect(exitLog.history).toHaveLength(1);
    expect(exitLog.hidden).toBe(false);
  });

  it("adding an unknown email does not crash and does not create participation", async () => {
    const owner = await createConfirmedUser({
      email: "owner@example.com",
    });
    const issue = await createIssueFixture({
      ownerId: owner._id,
    });

    await createIssueCriteriaFixture({
      issueId: issue._id,
    });

    const result = await editIssueExperts({
      issueId: issue._id,
      userId: owner._id,
      expertsToAdd: ["missing@example.com"],
      expertsToRemove: [],
    });

    expect(result.invitationEmailsToSend).toEqual([]);
    expect(await Participation.countDocuments({ issue: issue._id })).toBe(0);
    expect(await Notification.countDocuments({ issue: issue._id })).toBe(0);
  });

  it("adding the owner as expert records an entered timeline event without sending an invitation", async () => {
    const owner = await createConfirmedUser({
      name: "Owner User",
      email: "owner@example.com",
    });
    const issue = await createIssueFixture({
      ownerId: owner._id,
      currentStage: "alternativeEvaluation",
      consensusPhase: 4,
    });

    await createIssueCriteriaFixture({
      issueId: issue._id,
      leafNames: ["Leaf criterion"],
    });

    const result = await editIssueExperts({
      issueId: issue._id,
      userId: owner._id,
      expertsToAdd: [owner.email],
      expertsToRemove: [],
    });

    const participation = await Participation.findOne({
      issue: issue._id,
      expert: owner._id,
    }).lean();
    const exitLog = await ExitUserIssue.findOne({
      issue: issue._id,
      user: owner._id,
    }).lean();

    expect(result.invitationEmailsToSend).toEqual([]);
    expect(participation).toMatchObject({
      invitationStatus: "accepted",
      entryPhase: 4,
      entryStage: "alternativeEvaluation",
    });
    expect(await Notification.countDocuments({ issue: issue._id })).toBe(0);
    expect(exitLog).toMatchObject({
      hidden: false,
      reason: "Added by owner",
      phase: 4,
      stage: "alternativeEvaluation",
    });
    expect(exitLog.history).toEqual([
      expect.objectContaining({
        action: "entered",
        reason: "Added by owner",
        phase: 4,
        stage: "alternativeEvaluation",
      }),
    ]);
  });

  it("owner can remove an existing expert from a non-consensus active issue and cleanup their evaluations", async () => {
    const owner = await createConfirmedUser({
      email: "owner@example.com",
    });
    const expert = await createConfirmedUser({
      email: "expert@example.com",
    });
    const issue = await createIssueFixture({
      ownerId: owner._id,
      currentStage: "alternativeEvaluation",
      consensusPhase: 3,
    });

    await createIssueCriteriaFixture({
      issueId: issue._id,
      leafNames: ["Leaf criterion", "Second criterion"],
    });
    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "accepted",
      evaluationCompleted: false,
      weightsCompleted: false,
      entryPhase: 3,
      entryStage: "alternativeEvaluation",
    });
    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: expert._id,
      stage: "criteriaWeighting",
      consensusPhase: 3,
      completed: false,
    });
    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: expert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 3,
      completed: true,
      payload: { done: true },
    });

    const result = await editIssueExperts({
      issueId: issue._id,
      userId: owner._id,
      expertsToAdd: [],
      expertsToRemove: ["  EXPERT@example.com "],
    });

    const remainingEvaluations = await IssueEvaluation.find({
      issue: issue._id,
      expert: expert._id,
    }).lean();
    const exitLog = await ExitUserIssue.findOne({
      issue: issue._id,
      user: expert._id,
    }).lean();

    expect(result.issueName).toBe(issue.name);
    expect(await Participation.findOne({ issue: issue._id, expert: expert._id })).toBeNull();
    expect(remainingEvaluations).toHaveLength(1);
    expect(remainingEvaluations[0]).toMatchObject({
      stage: "criteriaWeighting",
      consensusPhase: 3,
      completed: false,
    });
    expect(exitLog).toMatchObject({
      hidden: true,
      reason: "Expelled by owner",
      phase: 3,
      stage: "alternativeEvaluation",
    });
    expect(exitLog.history).toEqual([
      expect.objectContaining({
        action: "exited",
        reason: "Expelled by owner",
        phase: 3,
        stage: "alternativeEvaluation",
      }),
    ]);
  });

  it("re-adding a removed expert appends entry and exit history on the same timeline record", async () => {
    const owner = await createConfirmedUser({
      email: "owner@example.com",
    });
    const expert = await createConfirmedUser({
      email: "expert@example.com",
    });
    const issue = await createIssueFixture({
      ownerId: owner._id,
      currentStage: "alternativeEvaluation",
      consensusPhase: 0,
    });

    await createIssueCriteriaFixture({
      issueId: issue._id,
      leafNames: ["Leaf criterion"],
    });

    await editIssueExperts({
      issueId: issue._id,
      userId: owner._id,
      expertsToAdd: [expert.email],
      expertsToRemove: [],
    });

    await Issue.updateOne(
      { _id: issue._id },
      { $set: { consensusPhase: 2 } }
    );

    await editIssueExperts({
      issueId: issue._id,
      userId: owner._id,
      expertsToAdd: [],
      expertsToRemove: [expert.email],
    });

    await Issue.updateOne(
      { _id: issue._id },
      { $set: { consensusPhase: 5 } }
    );

    await editIssueExperts({
      issueId: issue._id,
      userId: owner._id,
      expertsToAdd: [expert.email],
      expertsToRemove: [],
    });

    await Issue.updateOne(
      { _id: issue._id },
      { $set: { consensusPhase: 8 } }
    );

    await editIssueExperts({
      issueId: issue._id,
      userId: owner._id,
      expertsToAdd: [],
      expertsToRemove: [expert.email],
    });

    await Issue.updateOne(
      { _id: issue._id },
      { $set: { consensusPhase: 12 } }
    );

    await editIssueExperts({
      issueId: issue._id,
      userId: owner._id,
      expertsToAdd: [expert.email],
      expertsToRemove: [],
    });

    const exitLog = await ExitUserIssue.findOne({
      issue: issue._id,
      user: expert._id,
    }).lean();

    expect(await ExitUserIssue.countDocuments({ issue: issue._id, user: expert._id })).toBe(1);
    expect(await Participation.countDocuments({ issue: issue._id, expert: expert._id })).toBe(1);
    expect(exitLog).toMatchObject({
      hidden: false,
      reason: "Invited by owner",
      phase: 12,
      stage: "alternativeEvaluation",
    });
    expect(exitLog.history).toHaveLength(5);
    expect(exitLog.history.map((entry) => entry.action)).toEqual([
      "entered",
      "exited",
      "entered",
      "exited",
      "entered",
    ]);
    expect(exitLog.history.map((entry) => entry.phase)).toEqual([0, 2, 5, 8, 12]);
    expect(exitLog.history.map((entry) => entry.reason)).toEqual([
      "Invited by owner",
      "Expelled by owner",
      "Invited by owner",
      "Expelled by owner",
      "Invited by owner",
    ]);
    for (const entry of exitLog.history) {
      expect(entry.stage).toBe("alternativeEvaluation");
      expect(entry.timestamp).toBeTruthy();
    }
  });

  it("owner removal from a simulated-consensus issue preserves only completed previous-phase alternative evaluations", async () => {
    const owner = await createConfirmedUser({
      email: "owner@example.com",
    });
    const expert = await createConfirmedUser({
      email: "expert@example.com",
    });
    const issue = await createIssueFixture({
      ownerId: owner._id,
      currentStage: "alternativeEvaluation",
      consensusPhase: 2,
      simulateConsensus: true,
    });

    await createIssueCriteriaFixture({
      issueId: issue._id,
      leafNames: ["Leaf criterion", "Second criterion"],
    });
    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "accepted",
      evaluationCompleted: false,
      weightsCompleted: false,
      entryPhase: 2,
      entryStage: "alternativeEvaluation",
    });
    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: expert._id,
      stage: "criteriaWeighting",
      consensusPhase: 2,
      completed: true,
    });
    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: expert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 1,
      completed: true,
      payload: { kept: true },
    });
    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: expert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 2,
      completed: true,
      payload: { removedCurrentPhase: true },
    });
    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: expert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 0,
      completed: false,
      payload: { removedIncomplete: true },
    });

    await editIssueExperts({
      issueId: issue._id,
      userId: owner._id,
      expertsToAdd: [],
      expertsToRemove: [expert.email],
    });

    const remainingEvaluations = await IssueEvaluation.find({
      issue: issue._id,
      expert: expert._id,
    })
      .sort({ stage: 1, consensusPhase: 1 })
      .lean();

    expect(remainingEvaluations).toHaveLength(2);
    expect(remainingEvaluations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stage: "criteriaWeighting",
          consensusPhase: 2,
          completed: true,
        }),
        expect.objectContaining({
          stage: "alternativeEvaluation",
          consensusPhase: 1,
          completed: true,
          payload: { kept: true },
        }),
      ])
    );
  });

  it("owner cannot remove themself from their own issue", async () => {
    const owner = await createConfirmedUser({
      email: "owner@example.com",
    });
    const issue = await createIssueFixture({
      ownerId: owner._id,
    });

    await createIssueCriteriaFixture({
      issueId: issue._id,
    });

    await expect(
      editIssueExperts({
        issueId: issue._id,
        userId: owner._id,
        expertsToAdd: [],
        expertsToRemove: [owner.email],
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: "expertsToRemove",
      message: "Issue owner cannot be removed",
    });
  });

  it("non-owner cannot edit experts", async () => {
    const owner = await createConfirmedUser({
      email: "owner@example.com",
    });
    const otherUser = await createConfirmedUser({
      email: "other@example.com",
    });
    const issue = await createIssueFixture({
      ownerId: owner._id,
    });

    await createIssueCriteriaFixture({
      issueId: issue._id,
    });

    await expect(
      editIssueExperts({
        issueId: issue._id,
        userId: otherUser._id,
        expertsToAdd: ["expert@example.com"],
        expertsToRemove: [],
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Not authorized to edit this issue's experts.",
    });
  });

  it("cannot edit experts on a non-active issue", async () => {
    const owner = await createConfirmedUser({
      email: "owner@example.com",
    });
    const issue = await createIssueFixture({
      ownerId: owner._id,
      active: false,
      currentStage: "finished",
    });

    await createIssueCriteriaFixture({
      issueId: issue._id,
    });

    await expect(
      editIssueExperts({
        issueId: issue._id,
        userId: owner._id,
        expertsToAdd: ["expert@example.com"],
        expertsToRemove: [],
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Issue is not active",
    });
  });
});
