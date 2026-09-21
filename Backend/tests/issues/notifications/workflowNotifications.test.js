import { describe, expect, it } from "vitest";

import { Notification } from "../../../models/Notifications.js";
import {
  createWorkflowNotification,
  notifyAcceptedExperts,
} from "../../../modules/issues/notifications/createWorkflowNotification.js";
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
});
