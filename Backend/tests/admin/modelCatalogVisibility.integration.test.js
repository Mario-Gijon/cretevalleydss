import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  payload: {
    uid: "000000000000000000000001",
    role: "admin",
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn(),
    verify: () => authState.payload,
  },
}));

vi.mock("../../services/email.service.js", () => ({
  sendVerificationEmail: vi.fn(),
  sendEmailChangeConfirmation: vi.fn(),
  sendExpertInvitationEmail: vi.fn(),
}));

import app from "../../app.js";
import { IssueModel } from "../../models/IssueModels.js";
import { createIssueModel } from "../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../setup/database.js";

setupMongoDbTestHooks();

const authHeader = { Authorization: "Bearer mocked-access-token" };

describe("admin issue model visibility integration", () => {
  beforeEach(() => {
    authState.payload = {
      uid: "000000000000000000000001",
      role: "admin",
    };
  });

  it("enables and disables TOPSIS-Sort through PATCH, catalog reads, and Create Issue", async () => {
    const topsisSort = await createIssueModel({
      name: "TOPSIS-Sort 2016",
      apiModelKey: "topsis_sort_2016",
      modelKind: "issue",
      implementationStatus: "ready",
      publicUsable: true,
      issueExecutionAuthorized: true,
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      visibleInIssueCreation: false,
      manifestSync: { isStale: false },
    });
    const modelId = String(topsisSort._id);

    const enabledResponse = await request(app)
      .patch(`/api/admin/models/${modelId}/catalog-visibility`)
      .set(authHeader)
      .send({ visibleInIssueCreation: true })
      .expect(200);

    expect(enabledResponse.body).toMatchObject({
      success: true,
      data: {
        model: {
          id: modelId,
          visibleInIssueCreation: true,
        },
      },
    });
    expect(
      (await IssueModel.findById(modelId).lean()).visibleInIssueCreation
    ).toBe(true);

    const enabledCatalogResponse = await request(app)
      .get("/api/admin/models/catalog")
      .set(authHeader)
      .expect(200);
    expect(enabledCatalogResponse.headers["cache-control"]).toBe("no-store");
    expect(
      enabledCatalogResponse.body.data.models.find((model) => model.id === modelId)
    ).toMatchObject({
      apiModelKey: "topsis_sort_2016",
      visibleInIssueCreation: true,
    });

    authState.payload = {
      uid: "000000000000000000000002",
      role: "user",
    };
    const enabledCreateCatalog = await request(app)
      .get("/api/issues/models")
      .set(authHeader)
      .expect(200);
    expect(enabledCreateCatalog.headers["cache-control"]).toBe("no-store");
    expect(
      enabledCreateCatalog.body.data.models.map((model) => String(model._id))
    ).toContain(modelId);

    authState.payload = {
      uid: "000000000000000000000001",
      role: "admin",
    };
    const disabledResponse = await request(app)
      .patch(`/api/admin/models/${modelId}/catalog-visibility`)
      .set(authHeader)
      .send({ visibleInIssueCreation: false })
      .expect(200);

    expect(disabledResponse.body).toMatchObject({
      success: true,
      data: {
        model: {
          id: modelId,
          visibleInIssueCreation: false,
        },
      },
    });
    expect(
      (await IssueModel.findById(modelId).lean()).visibleInIssueCreation
    ).toBe(false);

    const disabledCatalogResponse = await request(app)
      .get("/api/admin/models/catalog")
      .set(authHeader)
      .expect(200);
    expect(
      disabledCatalogResponse.body.data.models.find((model) => model.id === modelId)
    ).toMatchObject({
      apiModelKey: "topsis_sort_2016",
      visibleInIssueCreation: false,
    });

    authState.payload = {
      uid: "000000000000000000000002",
      role: "user",
    };
    const disabledCreateCatalog = await request(app)
      .get("/api/issues/models")
      .set(authHeader)
      .expect(200);
    expect(disabledCreateCatalog.headers["cache-control"]).toBe("no-store");
    expect(
      disabledCreateCatalog.body.data.models.map((model) => String(model._id))
    ).not.toContain(modelId);
  });
});
