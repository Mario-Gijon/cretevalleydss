import { describe, expect, it } from "vitest";

import { Participation } from "../../../models/Participations.js";
import { respondToIssueInvitation } from "../../../modules/issues/notifications/respondToIssueInvitation.js";
import {
  createConfirmedUser,
  createIssueCriteriaFixture,
  createIssueFixture,
  createParticipationFixture,
} from "../../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../../setup/database.js";

setupMongoDbTestHooks();

describe("respondToIssueInvitation", () => {
  it("pending participant can accept invitation", async () => {
    const owner = await createConfirmedUser();
    const expert = await createConfirmedUser();
    const issue = await createIssueFixture({
      ownerId: owner._id,
      currentStage: "alternativeEvaluation",
      consensusPhase: 2,
    });

    await createIssueCriteriaFixture({
      issueId: issue._id,
      leafNames: ["Leaf criterion", "Second criterion"],
    });
    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "pending",
      evaluationCompleted: true,
      weightsCompleted: false,
      entryPhase: null,
      entryStage: null,
      joinedAt: null,
    });

    const result = await respondToIssueInvitation({
      issueId: issue._id,
      userId: expert._id,
      action: "accepted",
    });

    const participation = await Participation.findOne({
      issue: issue._id,
      expert: expert._id,
    }).lean();

    expect(result).toEqual({
      message: `Invitation to issue ${issue.name} accepted`,
    });
    expect(participation).toMatchObject({
      invitationStatus: "accepted",
      entryPhase: 2,
      entryStage: "alternativeEvaluation",
      evaluationCompleted: false,
    });
    expect(participation.joinedAt).toBeTruthy();
  });

  it("pending participant can decline invitation", async () => {
    const owner = await createConfirmedUser();
    const expert = await createConfirmedUser();
    const issue = await createIssueFixture({
      ownerId: owner._id,
    });

    await createIssueCriteriaFixture({
      issueId: issue._id,
    });
    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "pending",
    });

    const result = await respondToIssueInvitation({
      issueId: issue._id,
      userId: expert._id,
      action: "declined",
    });

    const participation = await Participation.findOne({
      issue: issue._id,
      expert: expert._id,
    }).lean();

    expect(result).toEqual({
      message: `Invitation to issue ${issue.name} declined`,
    });
    expect(participation.invitationStatus).toBe("declined");
  });

  it("rejects invalid action", async () => {
    await expect(
      respondToIssueInvitation({
        issueId: "some-id",
        userId: "some-user",
        action: "maybe",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: "action",
      message: "Invalid invitation action",
    });
  });

  it("rejects non-participant responses", async () => {
    const owner = await createConfirmedUser();
    const expert = await createConfirmedUser();
    const issue = await createIssueFixture({
      ownerId: owner._id,
    });

    await createIssueCriteriaFixture({
      issueId: issue._id,
    });

    await expect(
      respondToIssueInvitation({
        issueId: issue._id,
        userId: expert._id,
        action: "accepted",
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "No participation found for the user in this issue",
    });
  });

  it("accepting a single-leaf criteria-weighting issue marks weights as completed", async () => {
    const owner = await createConfirmedUser();
    const expert = await createConfirmedUser();
    const issue = await createIssueFixture({
      ownerId: owner._id,
      currentStage: "criteriaWeighting",
      criteriaWeightsStructureKey: "manualCriteriaWeights",
    });

    await createIssueCriteriaFixture({
      issueId: issue._id,
      leafNames: ["Leaf criterion"],
    });
    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "pending",
      weightsCompleted: false,
    });

    await respondToIssueInvitation({
      issueId: issue._id,
      userId: expert._id,
      action: "accepted",
    });

    const participation = await Participation.findOne({
      issue: issue._id,
      expert: expert._id,
    }).lean();

    expect(participation).toMatchObject({
      invitationStatus: "accepted",
      weightsCompleted: true,
      evaluationCompleted: false,
      entryStage: "criteriaWeighting",
    });
  });
});
