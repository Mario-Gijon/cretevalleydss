import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExitUserIssue } from "../../models/ExitUserIssue.js";
import { Participation } from "../../models/Participations.js";

const authState = vi.hoisted(() => ({
  currentPayload: {
    uid: null,
    role: "user",
  },
}));

const emailServiceState = vi.hoisted(() => ({
  sendExpertInvitationEmail: vi.fn(),
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: (payload) => `token-${payload.uid ?? "anonymous"}`,
    verify: () => authState.currentPayload,
  },
}));

vi.mock("../../services/email.service.js", () => ({
  sendVerificationEmail: vi.fn(),
  sendEmailChangeConfirmation: vi.fn(),
  sendExpertInvitationEmail: emailServiceState.sendExpertInvitationEmail,
}));

import app from "../../app.js";
import {
  buildCreateIssueInfo,
  createConfirmedUser,
  createExpressionDomainFixture,
  createIssueCriteriaFixture,
  createIssueFixture,
  createIssueModel,
  createParticipationFixture,
  prepareAndPersistIssueCreation,
} from "../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../setup/database.js";

setupMongoDbTestHooks();

const getAuthHeader = () => ({
  Authorization: "Bearer mocked-access-token",
});

describe("protected issue API basics", () => {
  beforeEach(() => {
    authState.currentPayload = {
      uid: null,
      role: "user",
    };
    emailServiceState.sendExpertInvitationEmail.mockReset();
  });

  it("rejects unauthenticated requests to /api/issues/active", async () => {
    const response = await request(app).get("/api/issues/active").expect(401);

    expect(response.body).toMatchObject({
      success: false,
      message: "Token does not exist.",
      error: {
        code: "NO_TOKEN",
      },
    });
  });

  it("returns a successful response with the expected shape for authenticated /api/issues/active", async () => {
    const owner = await createConfirmedUser({
      name: "Owner User",
      email: "owner@example.com",
    });
    const expert = await createConfirmedUser({
      email: "expert@example.com",
    });
    const model = await createIssueModel();
    const domain = await createExpressionDomainFixture({
      userId: owner._id,
    });

    await prepareAndPersistIssueCreation({
      ownerUserId: owner._id,
      issueInfo: buildCreateIssueInfo({
        selectedModelId: model._id,
        globalDomainId: domain._id,
        addedExperts: [expert.email],
      }),
    });

    authState.currentPayload = {
      uid: String(owner._id),
      role: "user",
    };

    const response = await request(app)
      .get("/api/issues/active")
      .set(getAuthHeader())
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Active issues fetched successfully",
      data: {
        issues: expect.any(Array),
        tasks: {
          total: expect.any(Number),
          byType: expect.any(Object),
        },
        taskCenter: {
          total: expect.any(Number),
          sections: expect.any(Array),
        },
        filtersMeta: expect.any(Object),
      },
    });
    expect(response.body.data.issues).toHaveLength(1);
    expect(response.body.data.issues[0]).toMatchObject({
      name: "Example issue",
      owner: "owner@example.com",
      createdBy: "owner@example.com",
      evaluationStructureKey: "alternativeCriteriaMatrix",
    });
  });

  it("rejects unauthenticated requests to /api/issues/expression-domains", async () => {
    const response = await request(app)
      .get("/api/issues/expression-domains")
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      message: "Token does not exist.",
      error: {
        code: "NO_TOKEN",
      },
    });
  });

  it("returns the authenticated user's expression domains", async () => {
    const owner = await createConfirmedUser({
      email: "owner@example.com",
    });
    await createExpressionDomainFixture({
      userId: owner._id,
      name: "Owner numeric domain",
    });

    authState.currentPayload = {
      uid: String(owner._id),
      role: "user",
    };

    const response = await request(app)
      .get("/api/issues/expression-domains")
      .set(getAuthHeader())
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Expression domains fetched successfully",
      data: {
        globals: expect.any(Array),
        userDomains: expect.any(Array),
      },
    });
    expect(response.body.data.userDomains).toHaveLength(1);
    expect(response.body.data.userDomains[0]).toMatchObject({
      name: "Owner numeric domain",
      isGlobal: false,
      user: owner._id.toString(),
    });
  });

  it("owner can PATCH /api/issues/:id/experts to add an expert", async () => {
    const owner = await createConfirmedUser({
      name: "Owner User",
      email: "owner@example.com",
    });
    const expert = await createConfirmedUser({
      email: "expert@example.com",
    });
    const issue = await createIssueFixture({
      ownerId: owner._id,
      name: "API participant issue",
    });

    await createIssueCriteriaFixture({
      issueId: issue._id,
      leafNames: ["Leaf criterion"],
    });

    authState.currentPayload = {
      uid: String(owner._id),
      role: "user",
    };

    const response = await request(app)
      .patch(`/api/issues/${issue._id}/experts`)
      .set(getAuthHeader())
      .send({
        expertsToAdd: [expert.email],
        expertsToRemove: [],
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Experts updated successfully.",
      data: null,
    });
    expect(
      await Participation.findOne({
        issue: issue._id,
        expert: expert._id,
      }).lean()
    ).toMatchObject({
      invitationStatus: "pending",
    });
    expect(emailServiceState.sendExpertInvitationEmail).toHaveBeenCalledTimes(1);
  });

  it("non-owner cannot PATCH /api/issues/:id/experts", async () => {
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

    authState.currentPayload = {
      uid: String(otherUser._id),
      role: "user",
    };

    const response = await request(app)
      .patch(`/api/issues/${issue._id}/experts`)
      .set(getAuthHeader())
      .send({
        expertsToAdd: ["expert@example.com"],
        expertsToRemove: [],
      })
      .expect(403);

    expect(response.body).toMatchObject({
      success: false,
      message: "Not authorized to edit this issue's experts.",
    });
  });

  it("participant can POST /api/issues/:id/leave", async () => {
    const owner = await createConfirmedUser();
    const participant = await createConfirmedUser();
    const issue = await createIssueFixture({
      ownerId: owner._id,
      currentStage: "alternativeEvaluation",
      consensusPhase: 1,
    });

    await createParticipationFixture({
      issueId: issue._id,
      expertId: participant._id,
      invitationStatus: "accepted",
      entryPhase: 1,
      entryStage: "alternativeEvaluation",
    });

    authState.currentPayload = {
      uid: String(participant._id),
      role: "user",
    };

    const response = await request(app)
      .post(`/api/issues/${issue._id}/leave`)
      .set(getAuthHeader())
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "You have left the issue successfully",
      data: {
        issueName: issue.name,
      },
    });
    expect(
      await Participation.findOne({
        issue: issue._id,
        expert: participant._id,
      })
    ).toBeNull();
  });

  it("owner cannot POST /api/issues/:id/leave", async () => {
    const owner = await createConfirmedUser();
    const issue = await createIssueFixture({
      ownerId: owner._id,
    });

    authState.currentPayload = {
      uid: String(owner._id),
      role: "user",
    };

    const response = await request(app)
      .post(`/api/issues/${issue._id}/leave`)
      .set(getAuthHeader())
      .expect(403);

    expect(response.body).toMatchObject({
      success: false,
      message: "An owner can not leave an issue",
    });
  });

  it("participant can POST /api/issues/:id/invitation-response with accepted", async () => {
    const owner = await createConfirmedUser();
    const participant = await createConfirmedUser();
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
      expertId: participant._id,
      invitationStatus: "pending",
      weightsCompleted: false,
    });

    authState.currentPayload = {
      uid: String(participant._id),
      role: "user",
    };

    const response = await request(app)
      .post(`/api/issues/${issue._id}/invitation-response`)
      .set(getAuthHeader())
      .send({
        action: "accepted",
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: `Invitation to issue ${issue.name} accepted`,
      data: null,
    });
    expect(
      await Participation.findOne({
        issue: issue._id,
        expert: participant._id,
      }).lean()
    ).toMatchObject({
      invitationStatus: "accepted",
      weightsCompleted: true,
    });
  });

  it("participant can POST /api/issues/:id/invitation-response with declined", async () => {
    const owner = await createConfirmedUser();
    const participant = await createConfirmedUser();
    const issue = await createIssueFixture({
      ownerId: owner._id,
    });

    await createIssueCriteriaFixture({
      issueId: issue._id,
    });
    await createParticipationFixture({
      issueId: issue._id,
      expertId: participant._id,
      invitationStatus: "pending",
    });

    authState.currentPayload = {
      uid: String(participant._id),
      role: "user",
    };

    const response = await request(app)
      .post(`/api/issues/${issue._id}/invitation-response`)
      .set(getAuthHeader())
      .send({
        action: "declined",
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: `Invitation to issue ${issue.name} declined`,
    });
    expect(
      await Participation.findOne({
        issue: issue._id,
        expert: participant._id,
      }).lean()
    ).toMatchObject({
      invitationStatus: "declined",
    });
  });
});
