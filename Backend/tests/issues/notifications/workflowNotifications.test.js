import { describe, expect, it } from "vitest";

import { Notification } from "../../../models/Notifications.js";
import { Participation } from "../../../models/Participations.js";
import {
  createWorkflowNotification,
  notifyAcceptedExperts,
} from "../../../modules/issues/notifications/createWorkflowNotification.js";
import { notifyOwnerWhenEvaluationPhaseCompletes } from "../../../modules/issues/evaluations/submitIssueEvaluation.js";
import { formatConsensusRoundLabel } from "../../../modules/issues/shared/formatConsensusRoundLabel.js";
import {
  createConfirmedUser,
  createIssueFixture,
  createParticipationFixture,
} from "../../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../../setup/database.js";

setupMongoDbTestHooks();

describe("workflow notifications", () => {
  it("notifies accepted experts for a new phase, excluding the creator and actor", async () => {
    const owner = await createConfirmedUser();
    const actor = await createConfirmedUser();
    const recipient = await createConfirmedUser();
    const issue = await createIssueFixture({ ownerId: owner._id });
    const participations = await Promise.all([
      createParticipationFixture({ issueId: issue._id, expertId: owner._id, invitationStatus: "accepted" }),
      createParticipationFixture({ issueId: issue._id, expertId: actor._id, invitationStatus: "accepted" }),
      createParticipationFixture({ issueId: issue._id, expertId: recipient._id, invitationStatus: "accepted" }),
    ]);

    await notifyAcceptedExperts({
      issue,
      actorUserId: actor._id,
      participations,
      type: "alternativeEvaluationAvailable",
      message: "Alternative evaluation is now available.",
      eventKey: "phase-available:alternativeEvaluation:0",
    });

    expect(await Notification.countDocuments({ issue: issue._id, expert: recipient._id })).toBe(1);
    expect(await Notification.countDocuments({ issue: issue._id, expert: owner._id })).toBe(0);
    expect(await Notification.countDocuments({ issue: issue._id, expert: actor._id })).toBe(0);
  });

  it("creates one creator notification for a transition despite retries", async () => {
    const owner = await createConfirmedUser();
    const expert = await createConfirmedUser();
    const issue = await createIssueFixture({ ownerId: owner._id });
    const input = {
      recipientId: owner._id,
      actorUserId: expert._id,
      issue,
      type: "alternativeEvaluationCompleted",
      message: "All required alternative evaluations have been submitted.",
      eventKey: "phase-completed:alternativeEvaluation:0",
    };

    await createWorkflowNotification(input);
    await createWorkflowNotification(input);

    expect(await Notification.countDocuments({ issue: issue._id, expert: owner._id })).toBe(1);
  });

  it("notifies the creator only after the last required criteria-weight evaluation", async () => {
    const owner = await createConfirmedUser();
    const first = await createConfirmedUser();
    const last = await createConfirmedUser();
    const issue = await createIssueFixture({ ownerId: owner._id });
    await createParticipationFixture({ issueId: issue._id, expertId: owner._id, invitationStatus: "accepted", weightsCompleted: true });
    await createParticipationFixture({ issueId: issue._id, expertId: first._id, invitationStatus: "accepted", weightsCompleted: true });
    await createParticipationFixture({ issueId: issue._id, expertId: last._id, invitationStatus: "accepted", weightsCompleted: false });

    await notifyOwnerWhenEvaluationPhaseCompletes({ issue, stage: "criteriaWeighting", actorUserId: first._id });
    expect(await Notification.countDocuments({ issue: issue._id, expert: owner._id })).toBe(0);

    await Participation.updateOne({ issue: issue._id, expert: last._id }, { $set: { weightsCompleted: true } });
    await notifyOwnerWhenEvaluationPhaseCompletes({ issue, stage: "criteriaWeighting", actorUserId: last._id });
    expect(await Notification.countDocuments({ issue: issue._id, expert: owner._id })).toBe(1);
    await notifyOwnerWhenEvaluationPhaseCompletes({ issue, stage: "criteriaWeighting", actorUserId: last._id });
    expect(await Notification.countDocuments({ issue: issue._id, expert: owner._id })).toBe(1);
  });

  it("uses the shared initial and numbered consensus round labels", async () => {
    expect(formatConsensusRoundLabel(0)).toBe("Initial round");
    expect(formatConsensusRoundLabel(1)).toBe("Round 1");
    expect(formatConsensusRoundLabel(2)).toBe("Round 2");

    const owner = await createConfirmedUser();
    const expert = await createConfirmedUser();
    const issue = await createIssueFixture({ ownerId: owner._id, isConsensus: true, consensusPhase: 0 });
    await createParticipationFixture({ issueId: issue._id, expertId: expert._id, invitationStatus: "accepted", evaluationCompleted: true });
    await notifyOwnerWhenEvaluationPhaseCompletes({ issue, stage: "alternativeEvaluation", actorUserId: expert._id });
    const initial = await Notification.findOne({ issue: issue._id, expert: owner._id }).lean();
    expect(initial.message).toContain("Initial round");
    expect(initial.message).toContain("You can compute consensus.");
    expect(initial.message).not.toContain("compute consensus again");

    await Notification.deleteMany({ issue: issue._id });
    issue.consensusPhase = 1;
    await notifyOwnerWhenEvaluationPhaseCompletes({ issue, stage: "alternativeEvaluation", actorUserId: expert._id });
    expect((await Notification.findOne({ issue: issue._id, expert: owner._id }).lean()).message).toContain("Round 1");
  });

  it("labels a phase-zero consensus retry as Round 1 for experts, excluding a creator who is also an expert", async () => {
    const owner = await createConfirmedUser();
    const expert = await createConfirmedUser();
    const issue = await createIssueFixture({ ownerId: owner._id, consensusPhase: 1 });
    const participations = await Promise.all([
      createParticipationFixture({ issueId: issue._id, expertId: owner._id, invitationStatus: "accepted" }),
      createParticipationFixture({ issueId: issue._id, expertId: expert._id, invitationStatus: "accepted" }),
    ]);
    const roundLabel = formatConsensusRoundLabel(issue.consensusPhase);
    await notifyAcceptedExperts({
      issue,
      actorUserId: owner._id,
      participations,
      type: "consensusRoundAvailable",
      message: `${roundLabel} requires your evaluation.`,
      eventKey: "consensus-round-available:1",
    });
    const expertNotification = await Notification.findOne({ issue: issue._id, expert: expert._id }).lean();
    expect(expertNotification.message).toBe("Round 1 requires your evaluation.");
    expect(await Notification.countDocuments({ issue: issue._id, expert: owner._id })).toBe(0);
  });
});
