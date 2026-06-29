import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  currentPayload: {
    uid: null,
    role: "user",
  },
}));

const finishedPayloadState = vi.hoisted(() => ({
  buildFinishedPayload: vi.fn(async ({ issue }) => ({
    summary: {
      name: issue.name,
    },
    scenarios: [],
  })),
  supportsFinishedPayload: vi.fn(() => true),
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: (payload) => `token-${payload?.uid ?? "anonymous"}`,
    verify: () => authState.currentPayload,
  },
}));

vi.mock("../../../services/email.service.js", () => ({
  sendVerificationEmail: vi.fn(),
  sendEmailChangeConfirmation: vi.fn(),
  sendExpertInvitationEmail: vi.fn(),
}));

vi.mock("../../../modules/issues/finished/finishedPayload/index.js", () => ({
  buildFinishedPayload: finishedPayloadState.buildFinishedPayload,
  supportsFinishedPayload: finishedPayloadState.supportsFinishedPayload,
}));

import app from "../../../app.js";
import { Issue } from "../../../models/Issues.js";
import { Participation } from "../../../models/Participations.js";
import { deleteAuthenticatedUserAccount } from "../../../modules/auth/account.js";
import { getActiveIssuesPayload } from "../../../modules/issues/active/index.js";
import { getFinishedIssueInfoPayload } from "../../../modules/issues/finished/getFinishedIssueInfoPayload.js";
import { hideFinishedIssueForUser } from "../../../modules/issues/lifecycle/hideFinishedIssue.js";
import {
  buildCreateIssueInfo,
  createConfirmedUser,
  createExpressionDomainFixture,
  createIssueFixture,
  createIssueModel,
  createParticipationFixture,
  prepareAndPersistIssueCreation,
} from "../../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../../setup/database.js";

setupMongoDbTestHooks();

const getAuthHeader = () => ({
  Authorization: "Bearer mocked-access-token",
});

const createPreparedActiveIssue = async ({ owner, expert }) => {
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

  return Issue.findOne({ ownerId: owner._id, active: true })
    .sort({ createdAt: -1 })
    .lean();
};

describe("active issue visibility", () => {
  beforeEach(() => {
    authState.currentPayload = {
      uid: null,
      role: "user",
    };
    finishedPayloadState.buildFinishedPayload.mockClear();
    finishedPayloadState.supportsFinishedPayload.mockClear();
  });

  it("owner sees the active issue they own with the stable top-level payload shape", async () => {
    const owner = await createConfirmedUser({
      email: "owner@example.com",
    });
    const expert = await createConfirmedUser({
      email: "expert@example.com",
    });

    await createPreparedActiveIssue({
      owner,
      expert,
    });

    const payload = await getActiveIssuesPayload({
      userId: owner._id,
    });

    expect(payload).toMatchObject({
      issues: expect.any(Array),
      tasks: expect.any(Object),
      taskCenter: expect.any(Object),
      filtersMeta: expect.any(Object),
    });
    expect(payload.issues).toHaveLength(1);
    expect(payload.issues[0]).toMatchObject({
      name: "Example issue",
      owner: "owner@example.com",
      createdBy: "owner@example.com",
    });
  });

  it("accepted participant sees the active issue they participate in", async () => {
    const owner = await createConfirmedUser({
      email: "owner@example.com",
    });
    const expert = await createConfirmedUser({
      email: "expert@example.com",
    });
    const issue = await createPreparedActiveIssue({
      owner,
      expert,
    });

    await Participation.updateOne(
      {
        issue: issue._id,
        expert: expert._id,
      },
      {
        $set: {
          invitationStatus: "accepted",
        },
      }
    );

    const payload = await getActiveIssuesPayload({
      userId: expert._id,
    });

    expect(payload.issues).toHaveLength(1);
    expect(payload.issues[0].name).toBe("Example issue");
  });

  it("pending participant does not see the active issue", async () => {
    const owner = await createConfirmedUser();
    const pendingUser = await createConfirmedUser({
      email: "pending@example.com",
    });

    await createPreparedActiveIssue({
      owner,
      expert: pendingUser,
    });

    const payload = await getActiveIssuesPayload({
      userId: pendingUser._id,
    });

    expect(payload.issues).toHaveLength(0);
  });

  it("unrelated user does not see the active issue", async () => {
    const owner = await createConfirmedUser();
    const expert = await createConfirmedUser({
      email: "expert@example.com",
    });
    const outsider = await createConfirmedUser({
      email: "outsider@example.com",
    });

    await createPreparedActiveIssue({
      owner,
      expert,
    });

    const payload = await getActiveIssuesPayload({
      userId: outsider._id,
    });

    expect(payload.issues).toHaveLength(0);
  });

  it("authenticated GET /api/issues/active does not expose issues to pending invitees", async () => {
    const owner = await createConfirmedUser();
    const pendingUser = await createConfirmedUser({
      email: "pending@example.com",
    });

    await createPreparedActiveIssue({
      owner,
      expert: pendingUser,
    });

    authState.currentPayload = {
      uid: String(pendingUser._id),
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
        issues: [],
        tasks: expect.any(Object),
        taskCenter: expect.any(Object),
        filtersMeta: expect.any(Object),
      },
    });
  });
});

describe("finished issues visibility and detail access", () => {
  beforeEach(() => {
    authState.currentPayload = {
      uid: null,
      role: "user",
    };
    finishedPayloadState.buildFinishedPayload.mockClear();
    finishedPayloadState.supportsFinishedPayload.mockClear();
  });

  it("owner sees finished issues they own", async () => {
    const owner = await createConfirmedUser({
      email: "owner@example.com",
    });
    const issue = await createIssueFixture({
      ownerId: owner._id,
      createdBy: owner._id,
      active: false,
      currentStage: "finished",
      name: "Finished owner issue",
    });

    authState.currentPayload = {
      uid: String(owner._id),
      role: "user",
    };

    const response = await request(app)
      .get("/api/issues/finished")
      .set(getAuthHeader())
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Finished issues fetched successfully",
      data: [
        {
          id: String(issue._id),
          name: "Finished owner issue",
          isIssueOwner: true,
        },
      ],
    });
  });

  it("accepted participant sees finished issues they participated in", async () => {
    const owner = await createConfirmedUser();
    const participant = await createConfirmedUser({
      email: "participant@example.com",
    });
    const issue = await createIssueFixture({
      ownerId: owner._id,
      active: false,
      currentStage: "finished",
      name: "Finished participant issue",
    });

    await createParticipationFixture({
      issueId: issue._id,
      expertId: participant._id,
      invitationStatus: "accepted",
    });

    authState.currentPayload = {
      uid: String(participant._id),
      role: "user",
    };

    const response = await request(app)
      .get("/api/issues/finished")
      .set(getAuthHeader())
      .expect(200);

    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: String(issue._id),
          name: "Finished participant issue",
          isIssueOwner: false,
        }),
      ])
    );
  });

  it("unrelated user does not see finished issues", async () => {
    const owner = await createConfirmedUser();
    const outsider = await createConfirmedUser();

    await createIssueFixture({
      ownerId: owner._id,
      active: false,
      currentStage: "finished",
      name: "Hidden from outsider",
    });

    authState.currentPayload = {
      uid: String(outsider._id),
      role: "user",
    };

    const response = await request(app)
      .get("/api/issues/finished")
      .set(getAuthHeader())
      .expect(200);

    expect(response.body.data).toEqual([]);
  });

  it("once a user hides a finished issue it disappears only from that user's list", async () => {
    const owner = await createConfirmedUser();
    const participant = await createConfirmedUser({
      email: "participant@example.com",
    });
    const issue = await createIssueFixture({
      ownerId: owner._id,
      active: false,
      currentStage: "finished",
      consensusPhase: 1,
      name: "Hideable issue",
    });

    await createParticipationFixture({
      issueId: issue._id,
      expertId: participant._id,
      invitationStatus: "accepted",
    });

    await hideFinishedIssueForUser({
      issueId: issue._id,
      userId: owner._id,
    });

    authState.currentPayload = {
      uid: String(owner._id),
      role: "user",
    };

    const ownerResponse = await request(app)
      .get("/api/issues/finished")
      .set(getAuthHeader())
      .expect(200);

    authState.currentPayload = {
      uid: String(participant._id),
      role: "user",
    };

    const participantResponse = await request(app)
      .get("/api/issues/finished")
      .set(getAuthHeader())
      .expect(200);

    expect(ownerResponse.body.data).toEqual([]);
    expect(participantResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: String(issue._id),
        }),
      ])
    );
  });

  it("finished issue listing does not crash when the owner has been anonymized", async () => {
    const owner = await createConfirmedUser({
      email: "deleted-owner@example.com",
    });
    const participant = await createConfirmedUser({
      email: "participant@example.com",
    });
    const issue = await createIssueFixture({
      ownerId: owner._id,
      createdBy: owner._id,
      active: false,
      currentStage: "finished",
      name: "Historical finished issue",
    });

    await createParticipationFixture({
      issueId: issue._id,
      expertId: participant._id,
      invitationStatus: "accepted",
    });

    await deleteAuthenticatedUserAccount({
      userId: owner._id,
    });

    authState.currentPayload = {
      uid: String(participant._id),
      role: "user",
    };

    const response = await request(app)
      .get("/api/issues/finished")
      .set(getAuthHeader())
      .expect(200);

    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: String(issue._id),
          name: "Historical finished issue",
        }),
      ])
    );
  });

  it("owner and accepted participant can access finished issue detail, while unrelated or hidden users cannot", async () => {
    const owner = await createConfirmedUser();
    const participant = await createConfirmedUser();
    const outsider = await createConfirmedUser();
    const issue = await createIssueFixture({
      ownerId: owner._id,
      active: false,
      currentStage: "finished",
      consensusPhase: 1,
      name: "Detailed finished issue",
    });

    await createParticipationFixture({
      issueId: issue._id,
      expertId: participant._id,
      invitationStatus: "accepted",
    });

    const ownerPayload = await getFinishedIssueInfoPayload({
      issueId: issue._id,
      userId: owner._id,
    });
    const participantPayload = await getFinishedIssueInfoPayload({
      issueId: issue._id,
      userId: participant._id,
    });

    expect(ownerPayload).toEqual({
      summary: {
        name: "Detailed finished issue",
      },
      scenarios: [],
    });
    expect(participantPayload.summary.name).toBe("Detailed finished issue");

    await expect(
      getFinishedIssueInfoPayload({
        issueId: issue._id,
        userId: outsider._id,
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "You are not allowed to access this finished issue",
    });

    await hideFinishedIssueForUser({
      issueId: issue._id,
      userId: participant._id,
    });

    await expect(
      getFinishedIssueInfoPayload({
        issueId: issue._id,
        userId: participant._id,
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "You are not allowed to access this finished issue",
    });
  });

  it("authenticated GET /api/issues/finished/:id returns finished issue detail for the owner", async () => {
    const owner = await createConfirmedUser();
    const issue = await createIssueFixture({
      ownerId: owner._id,
      active: false,
      currentStage: "finished",
      name: "Finished detail API issue",
    });

    authState.currentPayload = {
      uid: String(owner._id),
      role: "user",
    };

    const response = await request(app)
      .get(`/api/issues/finished/${issue._id}`)
      .set(getAuthHeader())
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Issue info sent",
      data: {
        summary: {
          name: "Finished detail API issue",
        },
      },
    });
  });
});

describe("users and models catalogs", () => {
  beforeEach(() => {
    authState.currentPayload = {
      uid: null,
      role: "user",
    };
    finishedPayloadState.buildFinishedPayload.mockClear();
    finishedPayloadState.supportsFinishedPayload.mockClear();
  });

  it("GET /api/issues/users returns confirmed active users only with safe fields", async () => {
    const requester = await createConfirmedUser({
      name: "Requester",
      email: "requester@example.com",
    });
    await createConfirmedUser({
      name: "Visible User",
      university: "Visible University",
      email: "visible@example.com",
    });
    await createConfirmedUser({
      name: "Deleted User",
      email: "deleted@example.com",
      isDeleted: true,
    });
    await createConfirmedUser({
      name: "Pending User",
      email: "pending@example.com",
      accountConfirm: false,
    });

    authState.currentPayload = {
      uid: String(requester._id),
      role: "user",
    };

    const response = await request(app)
      .get("/api/issues/users")
      .set(getAuthHeader())
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Users fetched successfully",
      data: expect.arrayContaining([
        {
          name: "Requester",
          university: "Testing University",
          email: "requester@example.com",
        },
        {
          name: "Visible User",
          university: "Visible University",
          email: "visible@example.com",
        },
      ]),
    });
    expect(response.body.data).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: "deleted@example.com" }),
        expect.objectContaining({ email: "pending@example.com" }),
      ])
    );
    for (const user of response.body.data) {
      expect(Object.keys(user).sort()).toEqual(["email", "name", "university"]);
    }
  });

  it("GET /api/issues/models separates visible fresh issue models from criteria-weighting models", async () => {
    const requester = await createConfirmedUser();

    await createIssueModel({
      name: "Visible issue model",
      modelKind: "issue",
      visibleInIssueCreation: true,
      visibleInCriteriaWeighting: false,
      manifestSync: {
        isStale: false,
      },
    });
    await createIssueModel({
      name: "Hidden issue model",
      modelKind: "issue",
      visibleInIssueCreation: false,
      manifestSync: {
        isStale: false,
      },
    });
    await createIssueModel({
      name: "Stale issue model",
      modelKind: "issue",
      visibleInIssueCreation: true,
      manifestSync: {
        isStale: true,
      },
    });
    await createIssueModel({
      name: "Visible criteria model",
      modelKind: "criteriaWeighting",
      visibleInCriteriaWeighting: true,
      visibleInIssueCreation: false,
      manifestSync: {
        isStale: false,
      },
    });
    await createIssueModel({
      name: "Hidden criteria model",
      modelKind: "criteriaWeighting",
      visibleInCriteriaWeighting: false,
      visibleInIssueCreation: false,
      manifestSync: {
        isStale: false,
      },
    });

    authState.currentPayload = {
      uid: String(requester._id),
      role: "user",
    };

    const response = await request(app)
      .get("/api/issues/models")
      .set(getAuthHeader())
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Models fetched successfully",
      data: {
        models: expect.any(Array),
        criteriaWeightingModels: expect.any(Array),
      },
    });
    expect(response.body.data.models.map((model) => model.name)).toEqual([
      "Visible issue model",
    ]);
    expect(
      response.body.data.criteriaWeightingModels.map((model) => model.name)
    ).toEqual(["Visible criteria model"]);
  });

  it("unauthenticated users cannot access users, models, or finished issue endpoints", async () => {
    await request(app).get("/api/issues/users").expect(401);
    await request(app).get("/api/issues/models").expect(401);
    await request(app).get("/api/issues/finished").expect(401);
  });
});
