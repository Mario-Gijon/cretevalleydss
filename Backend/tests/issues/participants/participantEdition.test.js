import { describe, expect, it } from "vitest";

import { ExitUserIssue } from "../../../models/ExitUserIssue.js";
import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { Issue } from "../../../models/Issues.js";
import { IssueStateSnapshot } from "../../../models/IssueStateSnapshots.js";
import { Notification } from "../../../models/Notifications.js";
import { Participation } from "../../../models/Participations.js";
import { editIssueExperts } from "../../../modules/issues/participants/editIssueExperts.js";
import { writeIssueStateSnapshot } from "../../../modules/issues/stateSnapshots/issueStateSnapshot.js";
import { normalizeParticipantEditionRequest } from "../../../modules/issues/participants/loadParticipantEditionContext.js";
import {
  createConfirmedUser,
  createIssueCriteriaFixture,
  createIssueEvaluationFixture,
  createIssueFixture,
  createIssueModel,
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

  it("rejects an unknown-only edit when the issue has no experts", async () => {
    const owner = await createConfirmedUser({
      email: "owner@example.com",
    });
    const issue = await createIssueFixture({
      ownerId: owner._id,
    });

    await createIssueCriteriaFixture({
      issueId: issue._id,
    });

    await expect(editIssueExperts({
      issueId: issue._id,
      userId: owner._id,
      expertsToAdd: ["missing@example.com"],
      expertsToRemove: [],
    })).rejects.toMatchObject({
      statusCode: 400,
      message: "An issue must have at least one expert.",
    });

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

    await expect(editIssueExperts({
      issueId: issue._id,
      userId: owner._id,
      expertsToAdd: [],
      expertsToRemove: ["  EXPERT@example.com "],
    })).rejects.toMatchObject({
      statusCode: 400,
      message: "An issue must have at least one expert.",
    });

    const remainingEvaluations = await IssueEvaluation.find({
      issue: issue._id,
      expert: expert._id,
    }).lean();
    const exitLog = await ExitUserIssue.findOne({
      issue: issue._id,
      user: expert._id,
    }).lean();

    expect(await Participation.findOne({ issue: issue._id, expert: expert._id })).not.toBeNull();
    expect(remainingEvaluations).toHaveLength(2);
    expect(exitLog).toBeNull();
  });

  it("preserves complete historical snapshot state when a participant is removed", async () => {
    const owner = await createConfirmedUser({ email: "snapshot-owner@example.com" });
    const retainedExpert = await createConfirmedUser({ email: "snapshot-retained@example.com" });
    const removedExpert = await createConfirmedUser({ email: "snapshot-removed@example.com" });
    const issue = await createIssueFixture({ ownerId: owner._id, currentStage: "alternativeEvaluation" });
    await createIssueCriteriaFixture({ issueId: issue._id, leafNames: ["Leaf criterion"] });
    await createParticipationFixture({ issueId: issue._id, expertId: retainedExpert._id, invitationStatus: "accepted", entryPhase: 0, entryStage: "alternativeEvaluation" });
    await createParticipationFixture({ issueId: issue._id, expertId: removedExpert._id, invitationStatus: "accepted", entryPhase: 0, entryStage: "alternativeEvaluation" });
    const snapshot = await writeIssueStateSnapshot({ issue, snapshotType: "creation", occurredAt: new Date(), correlationId: "participant-removal-snapshot" });
    const original = structuredClone(snapshot.state);

    await editIssueExperts({ issueId: issue._id, userId: owner._id, expertsToAdd: [], expertsToRemove: [removedExpert.email] });

    expect(await Participation.findOne({ issue: issue._id, expert: removedExpert._id })).toBeNull();
    expect(await IssueStateSnapshot.countDocuments({ issue: issue._id })).toBe(1);
    expect((await IssueStateSnapshot.findById(snapshot._id).lean()).state).toEqual(original);
  });

  it("rejects removing the final expert without changing their timeline record", async () => {
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

    await expect(editIssueExperts({
      issueId: issue._id,
      userId: owner._id,
      expertsToAdd: [],
      expertsToRemove: [expert.email],
    })).rejects.toMatchObject({
      statusCode: 400,
      message: "An issue must have at least one expert.",
    });

    expect(await Participation.countDocuments({ issue: issue._id, expert: expert._id })).toBe(1);
    expect(await ExitUserIssue.countDocuments({ issue: issue._id, user: expert._id })).toBe(1);
    const exitLog = await ExitUserIssue.findOne({
      issue: issue._id,
      user: expert._id,
    }).lean();

    expect(exitLog).toMatchObject({
      hidden: false,
      reason: "Invited by owner",
      phase: 0,
      stage: "alternativeEvaluation",
    });
    expect(exitLog.history).toHaveLength(1);
    expect(exitLog.history[0]).toMatchObject({
      action: "entered",
      reason: "Invited by owner",
      phase: 0,
      stage: "alternativeEvaluation",
    });
  });

  it("rejects final expert removal from a simulated-consensus issue without partial cleanup", async () => {
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

    await expect(editIssueExperts({
      issueId: issue._id,
      userId: owner._id,
      expertsToAdd: [],
      expertsToRemove: [expert.email],
    })).rejects.toMatchObject({
      statusCode: 400,
      message: "An issue must have at least one expert.",
    });

    const remainingEvaluations = await IssueEvaluation.find({
      issue: issue._id,
      expert: expert._id,
    })
      .sort({ stage: 1, consensusPhase: 1 })
      .lean();

    expect(remainingEvaluations).toHaveLength(4);
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
        expect.objectContaining({
          stage: "alternativeEvaluation",
          consensusPhase: 2,
          completed: true,
          payload: { removedCurrentPhase: true },
        }),
        expect.objectContaining({
          stage: "alternativeEvaluation",
          consensusPhase: 0,
          completed: false,
          payload: { removedIncomplete: true },
        }),
      ])
    );
    expect(await Participation.countDocuments({ issue: issue._id, expert: expert._id })).toBe(1);
    expect(await ExitUserIssue.countDocuments({ issue: issue._id, user: expert._id })).toBe(0);
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

  it("assigns and updates weights when adding and removing experts on a weighted issue", async () => {
    const owner = await createConfirmedUser({ email: "owner@example.com" });
    const firstExpert = await createConfirmedUser({ email: "first@example.com" });
    const secondExpert = await createConfirmedUser({ email: "second@example.com" });
    const model = await createIssueModel({ usesExpertWeights: true });
    const issue = await createIssueFixture({ ownerId: owner._id, modelId: model._id });

    await createIssueCriteriaFixture({ issueId: issue._id });

    await editIssueExperts({
      issueId: issue._id,
      userId: owner._id,
      expertsToAdd: [firstExpert.email, secondExpert.email],
      expertsToRemove: [],
      expertWeightsByEmail: {
        [firstExpert.email]: 0.4,
        [secondExpert.email]: 0.6,
      },
    });

    expect(await Participation.find({ issue: issue._id }).sort({ weight: 1 }).lean()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ expert: firstExpert._id, weight: 0.4 }),
        expect.objectContaining({ expert: secondExpert._id, weight: 0.6 }),
      ])
    );

    await editIssueExperts({
      issueId: issue._id,
      userId: owner._id,
      expertsToAdd: [],
      expertsToRemove: [secondExpert.email],
      expertWeightsByEmail: { [firstExpert.email]: 1 },
    });

    expect(await Participation.find({ issue: issue._id }).lean()).toEqual([
      expect.objectContaining({ expert: firstExpert._id, weight: 1 }),
    ]);
  });

  it("rejects an invalid weighted edit before changing participations or invitations", async () => {
    const owner = await createConfirmedUser({ email: "owner@example.com" });
    const existingExpert = await createConfirmedUser({ email: "existing@example.com" });
    const newExpert = await createConfirmedUser({ email: "new@example.com" });
    const model = await createIssueModel({ usesExpertWeights: true });
    const issue = await createIssueFixture({ ownerId: owner._id, modelId: model._id });

    await createIssueCriteriaFixture({ issueId: issue._id });
    await createParticipationFixture({
      issueId: issue._id,
      expertId: existingExpert._id,
      invitationStatus: "accepted",
      weight: 1,
    });

    await expect(editIssueExperts({
      issueId: issue._id,
      userId: owner._id,
      expertsToAdd: [newExpert.email],
      expertsToRemove: [],
      expertWeightsByEmail: { [existingExpert.email]: 0.5 },
    })).rejects.toMatchObject({ statusCode: 400 });

    expect(await Participation.countDocuments({ issue: issue._id })).toBe(1);
    expect(await Participation.findOne({ issue: issue._id, expert: existingExpert._id }).lean()).toMatchObject({ weight: 1 });
    expect(await Notification.countDocuments({ issue: issue._id })).toBe(0);
  });

  it("rejects expert weights on a non-weighted issue without partial changes", async () => {
    const owner = await createConfirmedUser({ email: "owner@example.com" });
    const expert = await createConfirmedUser({ email: "expert@example.com" });
    const issue = await createIssueFixture({ ownerId: owner._id });

    await createIssueCriteriaFixture({ issueId: issue._id });

    await expect(editIssueExperts({
      issueId: issue._id,
      userId: owner._id,
      expertsToAdd: [expert.email],
      expertsToRemove: [],
      expertWeightsByEmail: { [expert.email]: 1 },
      hasExpertWeightsByEmail: true,
    })).rejects.toMatchObject({
      statusCode: 400,
      message: "Expert weights are not supported by this model.",
    });

    expect(await Participation.countDocuments({ issue: issue._id })).toBe(0);
    expect(await Notification.countDocuments({ issue: issue._id })).toBe(0);
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
