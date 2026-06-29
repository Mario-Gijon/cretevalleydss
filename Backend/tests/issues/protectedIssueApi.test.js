import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  currentPayload: {
    uid: null,
    role: "user",
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: (payload) => `token-${payload.uid ?? "anonymous"}`,
    verify: () => authState.currentPayload,
  },
}));

import app from "../../app.js";
import {
  buildCreateIssueInfo,
  createConfirmedUser,
  createExpressionDomainFixture,
  createIssueModel,
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
});
